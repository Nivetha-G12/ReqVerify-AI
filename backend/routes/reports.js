const express = require('express');
const router = express.Router();
const { getCollection, getNextSequence, parseNumericId } = require('../db');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { MISTAKE_TO_CATEGORY } = require('../data/questionBank');

function buildReportPipeline(match = {}) {
  return [
    { $match: match },
    {
      $lookup: {
        from: 'requirements',
        localField: 'requirement_id',
        foreignField: 'id',
        as: 'requirement',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'qa_analyst_id',
        foreignField: 'id',
        as: 'qa_user',
      },
    },
    {
      $addFields: {
        requirement_title: { $arrayElemAt: ['$requirement.title', 0] },
        client_name: { $arrayElemAt: ['$requirement.client_name', 0] },
        requirement_description: { $arrayElemAt: ['$requirement.description', 0] },
        requirement_version: { $arrayElemAt: ['$requirement.version', 0] },
        root_requirement_id: { $arrayElemAt: ['$requirement.root_requirement_id', 0] },
        pdf_path: { $arrayElemAt: ['$requirement.pdf_path', 0] },
        requirement_status: { $arrayElemAt: ['$requirement.status', 0] },
        requirement_return_reason: { $arrayElemAt: ['$requirement.return_reason', 0] },
        requirement_returned_at: { $arrayElemAt: ['$requirement.returned_at', 0] },
        qa_username: { $arrayElemAt: ['$qa_user.username', 0] },
      },
    },
    { $project: { requirement: 0, qa_user: 0, _id: 0 } },
    { $sort: { updated_at: -1 } },
  ];
}

function normalizeReportPayload(report) {
  const normalizedReport = { ...report };

  if (typeof normalizedReport.checklist_results === 'string') {
    try {
      normalizedReport.checklist_results = JSON.parse(normalizedReport.checklist_results);
    } catch (error) {
      normalizedReport.checklist_results = [];
    }
  }

  if (typeof normalizedReport.ai_findings === 'string') {
    try {
      normalizedReport.ai_findings = JSON.parse(normalizedReport.ai_findings);
    } catch (error) {
      normalizedReport.ai_findings = [];
    }
  }

  return normalizedReport;
}

router.post('/', protect, restrictTo('qa_analyst'), async (req, res) => {
  const {
    requirementId,
    checklistResults,
    aiFindings,
    missingRequirements,
    ambiguousRequirements,
    incompleteRequirements,
    recommendations,
    overallQualityScore,
  } = req.body;

  if (!requirementId || !checklistResults || !aiFindings) {
    return res.status(400).json({ message: 'Missing required validation fields' });
  }

  try {
    const requirementsCollection = await getCollection('requirements');
    const reportsCollection = await getCollection('validation_reports');

    const requirement = await requirementsCollection.findOne({ id: parseNumericId(requirementId) });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    if (requirement.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: you are not assigned to validate this requirement' });
    }

    const serializedChecklist = JSON.stringify(checklistResults);
    const serializedAiFindings = JSON.stringify(aiFindings);
    const now = new Date();

    const existingReport = await reportsCollection.findOne({ requirement_id: requirement.id });
    let report;

    if (existingReport) {
      const updateResult = await reportsCollection.findOneAndUpdate(
        { requirement_id: requirement.id },
        {
          $set: {
            checklist_results: serializedChecklist,
            ai_findings: serializedAiFindings,
            missing_requirements: missingRequirements,
            ambiguous_requirements: ambiguousRequirements,
            incomplete_requirements: incompleteRequirements,
            recommendations,
            overall_quality_score: overallQualityScore,
            status: 'submitted',
            admin_decision: null,
            admin_feedback: null,
            updated_at: now,
          },
        },
        { returnDocument: 'after' }
      );
      report = updateResult.value;
    } else {
      const newId = await getNextSequence('validation_reports');
      const insertResult = await reportsCollection.insertOne({
        id: newId,
        requirement_id: requirement.id,
        qa_analyst_id: req.user.id,
        checklist_results: serializedChecklist,
        ai_findings: serializedAiFindings,
        missing_requirements: missingRequirements,
        ambiguous_requirements: ambiguousRequirements,
        incomplete_requirements: incompleteRequirements,
        recommendations,
        overall_quality_score: overallQualityScore,
        status: 'submitted',
        admin_decision: null,
        admin_feedback: null,
        created_at: now,
        updated_at: now,
      });
      report = await reportsCollection.findOne({ _id: insertResult.insertedId });
    }

    await requirementsCollection.updateOne({ id: requirement.id }, { $set: { status: 'under_review' } });
    res.status(201).json(report);
  } catch (error) {
    console.error('Error submitting validation report:', error);
    res.status(500).json({ message: 'Server error while submitting report' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const reportsCollection = await getCollection('validation_reports');
    const match = {};
    if (req.user.role === 'qa_analyst') {
      match.qa_analyst_id = req.user.id;
    }
    const reports = await reportsCollection.aggregate(buildReportPipeline(match)).toArray();
    const normalizedReports = reports.map(normalizeReportPayload);
    res.json(normalizedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error while fetching reports' });
  }
});

router.get('/:id', protect, async (req, res) => {
  const reportId = parseNumericId(req.params.id);
  if (!reportId) {
    return res.status(400).json({ message: 'Invalid report ID' });
  }

  try {
    const reportsCollection = await getCollection('validation_reports');
    const reports = await reportsCollection.aggregate(buildReportPipeline({ id: reportId })).toArray();
    if (reports.length === 0) {
      return res.status(404).json({ message: 'Validation report not found' });
    }

    const report = normalizeReportPayload(reports[0]);
    if (req.user.role === 'qa_analyst' && report.qa_analyst_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not your report' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report detail:', error);
    res.status(500).json({ message: 'Server error while fetching report details' });
  }
});

router.post('/:id/verify', protect, restrictTo('admin'), async (req, res) => {
  const reportId = parseNumericId(req.params.id);
  const { decision, feedback, mistakes } = req.body;

  if (!reportId || !decision || !['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be either "approve" or "reject"' });
  }

  try {
    const reportsCollection = await getCollection('validation_reports');
    const requirementsCollection = await getCollection('requirements');
    const mistakeLogsCollection = await getCollection('mistake_logs');

    const report = await reportsCollection.findOne({ id: reportId });
    if (!report) {
      return res.status(404).json({ message: 'Validation report not found' });
    }

    if (decision === 'approve') {
      await reportsCollection.updateOne(
        { id: reportId },
        {
          $set: {
            status: 'approved',
            admin_decision: 'approve',
            admin_feedback: feedback || 'Report verified and approved.',
            decided_at: new Date(),
          },
        }
      );
      await requirementsCollection.updateOne(
        { id: report.requirement_id },
        { $set: { status: 'approved' } }
      );
    } else {
      await reportsCollection.updateOne(
        { id: reportId },
        {
          $set: {
            status: 'qa_rejected',
            admin_decision: 'reject_qa',
            admin_feedback: feedback || 'Report rejected. Please review findings and resubmit.',
            decided_at: new Date(),
          },
        }
      );
      await requirementsCollection.updateOne(
        { id: report.requirement_id },
        { $set: { status: 'under_validation' } }
      );

      if (mistakes && Array.isArray(mistakes)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        for (const mistake of mistakes) {
          const { missedChecklistRule, mistakeType, severity } = mistake;
          const validTypes = [
            'Missed Acceptance Criteria',
            'Missed Validation Rule',
            'Missed Business Rule',
            'Missed Ambiguous Requirement',
            'Incorrect Checklist Evaluation',
          ];
          const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
          if (validTypes.includes(mistakeType) && validSeverities.includes(severity) && missedChecklistRule) {
            const existingMistake = await mistakeLogsCollection.findOne({
              qa_analyst_id: report.qa_analyst_id,
              requirement_id: report.requirement_id,
              mistake_type: mistakeType,
              missed_checklist_rule: missedChecklistRule,
              severity,
              date: { $gte: today, $lt: tomorrow },
            });

            if (existingMistake) {
              await mistakeLogsCollection.updateOne(
                { _id: existingMistake._id },
                { $inc: { frequency: 1 } }
              );
            } else {
              const nextId = await getNextSequence('mistake_logs');
              await mistakeLogsCollection.insertOne({
                id: nextId,
                qa_analyst_id: report.qa_analyst_id,
                requirement_id: report.requirement_id,
                missed_checklist_rule: missedChecklistRule,
                mistake_type: mistakeType,
                competency_category: MISTAKE_TO_CATEGORY[mistakeType] || 'Requirement Completeness',
                admin_decision: 'reject_qa',
                severity,
                date: new Date(),
                frequency: 1,
                created_at: new Date(),
              });
            }
          }
        }
      }
    }

    res.json({ message: `Validation report successfully ${decision}d` });
  } catch (error) {
    console.error('Error verifying validation report:', error);
    res.status(500).json({ message: 'Server error during report verification' });
  }
});

router.post('/:id/return-client', protect, restrictTo('admin'), async (req, res) => {
  const reportId = parseNumericId(req.params.id);
  const { feedback } = req.body;

  if (!reportId) {
    return res.status(400).json({ message: 'Invalid report ID' });
  }

  try {
    const reportsCollection = await getCollection('validation_reports');
    const requirementsCollection = await getCollection('requirements');

    const report = await reportsCollection.findOne({ id: reportId });
    if (!report) {
      return res.status(404).json({ message: 'Validation report not found' });
    }

    await reportsCollection.updateOne(
      { id: reportId },
      {
        $set: {
          status: 'returned_to_client',
          admin_decision: 'return_client',
          admin_feedback: feedback || 'Requirements rejected due to failure in checklist criteria.',
          returned_to_client_at: new Date(),
          decided_at: new Date(),
        },
      }
    );
    await requirementsCollection.updateOne(
      { id: report.requirement_id },
      {
        $set: {
          status: 'returned_to_client',
          return_reason: 'Admin returned requirement to client',
          admin_feedback: feedback || 'Requirements rejected due to failure in checklist criteria.',
          returned_at: new Date(),
        },
      }
    );

    res.json({ message: 'Requirement returned to client successfully.' });
  } catch (error) {
    console.error('Error returning requirement to client:', error);
    res.status(500).json({ message: 'Server error while returning requirement to client' });
  }
});

module.exports = router;
