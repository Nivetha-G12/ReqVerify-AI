const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getCollection, parseNumericId, getNextSequence } = require('../db');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { MISTAKE_TO_CATEGORY, COMPETENCY_CATEGORIES } = require('../data/questionBank');

const WEAKNESS_CATEGORIES = [
  { key: 'Validation Rules', mistakeTypes: ['Missed Validation Rule'] },
  { key: 'Acceptance Criteria', mistakeTypes: ['Missed Acceptance Criteria'] },
  { key: 'Business Rules', mistakeTypes: ['Missed Business Rule'] },
  { key: 'Requirement Completeness', mistakeTypes: [] },
  { key: 'Ambiguous Requirements', mistakeTypes: ['Missed Ambiguous Requirement'] },
  { key: 'Exception Handling', mistakeTypes: [] },
  { key: 'Checklist Evaluation', mistakeTypes: ['Incorrect Checklist Evaluation'] },
];

function buildWeaknessAnalysis(mistakeCounts, competencyMistakes, categoryTrends) {
  const totalMistakes = Object.values(mistakeCounts).reduce((s, c) => s + c, 0);
  if (totalMistakes === 0) return null;

  return WEAKNESS_CATEGORIES.map(({ key, mistakeTypes }) => {
    const count = mistakeTypes.reduce((s, t) => s + (mistakeCounts[t] || 0), 0);
    if (count === 0 && !mistakeTypes.length) return null;

    const trendKey = key === 'Ambiguous Requirements' ? 'Ambiguity Detection' : key;
    const trendData = categoryTrends?.[trendKey] || [];
    let trend = 'stable';
    if (trendData.length >= 2) {
      const latest = trendData[trendData.length - 1]?.score ?? 0;
      const prev = trendData[trendData.length - 2]?.score ?? 0;
      trend = latest > prev ? 'improving' : latest < prev ? 'declining' : 'stable';
    } else if (count > 0) {
      trend = 'needs_attention';
    }

    let improvementStatus = 'Not assessed';
    if (trendData.length > 0) {
      const latestScore = trendData[trendData.length - 1]?.score ?? 0;
      improvementStatus = latestScore >= 80 ? 'Improved' : latestScore >= 60 ? 'In progress' : 'Needs training';
    } else if (count > 0) {
      improvementStatus = 'Needs training';
    }

    return { category: key, mistakeCount: count, trend, improvementStatus };
  }).filter(Boolean).filter((item) => item.mistakeCount > 0);
}

async function syncHistoricalMistakeRecords(mistakesCollection) {
  await mistakesCollection.updateMany(
    { admin_decision: { $exists: false } },
    { $set: { admin_decision: 'reject_qa' } }
  );
  const logs = await mistakesCollection.find({ competency_category: { $exists: false } }).toArray();
  for (const log of logs) {
    await mistakesCollection.updateOne(
      { id: log.id },
      { $set: { competency_category: MISTAKE_TO_CATEGORY[log.mistake_type] || 'Requirement Completeness' } }
    );
  }
}

async function syncHistoricalReportDecisions(reportsCollection, requirementsCollection, mistakesCollection) {
  const legacyReports = await reportsCollection
    .find({
      $or: [
        { status: 'rejected', admin_decision: { $exists: false } },
        { status: 'rejected', admin_decision: null },
      ],
    })
    .toArray();

  for (const report of legacyReports) {
    const requirement = await requirementsCollection.findOne({ id: report.requirement_id });
    const hasMistakeLogs = await mistakesCollection.countDocuments({
      qa_analyst_id: report.qa_analyst_id,
      requirement_id: report.requirement_id,
    });

    if (requirement?.status === 'returned_to_client' || requirement?.returned_at) {
      await reportsCollection.updateOne(
        { id: report.id },
        {
          $set: {
            status: 'returned_to_client',
            admin_decision: 'return_client',
            returned_to_client_at: report.decided_at || report.updated_at || report.created_at || new Date(),
          },
        }
      );
    } else if (hasMistakeLogs > 0) {
      await reportsCollection.updateOne(
        { id: report.id },
        {
          $set: {
            status: 'qa_rejected',
            admin_decision: 'reject_qa',
            decided_at: report.decided_at || report.updated_at || report.created_at || new Date(),
          },
        }
      );
    } else {
      await reportsCollection.updateOne(
        { id: report.id },
        {
          $set: {
            status: 'returned_to_client',
            admin_decision: 'return_client',
            returned_to_client_at: report.decided_at || report.updated_at || report.created_at || new Date(),
          },
        }
      );
    }
  }
}

async function buildEmployeeStats(emp, collections) {
  const { requirementsCollection, reportsCollection, assessmentsCollection, mistakesCollection, attemptsCollection } = collections;

  const assignedCount = await requirementsCollection.countDocuments({ assigned_to: emp.id });
  const submittedCount = await reportsCollection.countDocuments({ qa_analyst_id: emp.id });
  const approvedCount = await reportsCollection.countDocuments({ qa_analyst_id: emp.id, status: 'approved' });
  const qaMistakeCount = await reportsCollection.countDocuments({
    qa_analyst_id: emp.id,
    $or: [{ status: 'qa_rejected' }, { admin_decision: 'reject_qa' }],
  });
  const returnedToClientCount = await reportsCollection.countDocuments({
    qa_analyst_id: emp.id,
    $or: [{ status: 'returned_to_client' }, { admin_decision: 'return_client' }],
  });

  const avgScoreResult = await assessmentsCollection
    .aggregate([
      { $match: { qa_analyst_id: emp.id, status: 'completed', score: { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } },
    ])
    .toArray();

  const avgScore = avgScoreResult.length > 0 ? avgScoreResult[0].avgScore : null;

  const mistakesRes = await mistakesCollection
    .aggregate([
      { $match: { qa_analyst_id: emp.id } },
      { $group: { _id: '$mistake_type', count: { $sum: '$frequency' } } },
    ])
    .toArray();

  const mistakeCounts = {
    'Missed Acceptance Criteria': 0,
    'Missed Validation Rule': 0,
    'Missed Business Rule': 0,
    'Missed Ambiguous Requirement': 0,
    'Incorrect Checklist Evaluation': 0,
  };

  for (const row of mistakesRes) {
    if (mistakeCounts[row._id] !== undefined) {
      mistakeCounts[row._id] = row.count;
    }
  }

  const assessmentsRes = await assessmentsCollection
    .find({ qa_analyst_id: emp.id })
    .project({ _id: 0 })
    .sort({ created_at: -1 })
    .toArray();

  const attempts = await attemptsCollection
    .find({ qa_analyst_id: emp.id })
    .sort({ completed_at: -1 })
    .project({ _id: 0 })
    .toArray();

  const categoryTrends = {};
  for (const attempt of attempts) {
    if (attempt.category_scores) {
      for (const [cat, score] of Object.entries(attempt.category_scores)) {
        if (!categoryTrends[cat]) categoryTrends[cat] = [];
        categoryTrends[cat].push({ score, date: attempt.completed_at });
      }
    }
  }

  let improvementPercentage = null;
  if (attempts.length >= 2) {
    const latest = attempts[0].score;
    const earliest = attempts[attempts.length - 1].score;
    if (earliest > 0) {
      improvementPercentage = Math.round(((latest - earliest) / earliest) * 100);
    }
  }

  const trainingRecommendations = [];
  for (const [mistakeType, count] of Object.entries(mistakeCounts)) {
    if (count >= 3) {
      trainingRecommendations.push({
        mistakeType,
        count,
        recommendedCategory: MISTAKE_TO_CATEGORY[mistakeType] || 'Requirement Completeness',
        action: `Generate targeted assessment in ${MISTAKE_TO_CATEGORY[mistakeType] || 'Requirement Completeness'}`,
      });
    }
  }

  const completedAssessments = assessmentsRes.filter((a) => a.status === 'completed');
  const assignedAssessments = assessmentsRes.filter((a) => a.status !== 'completed');

  const submitted = Number(submittedCount || 0);
  const approved = Number(approvedCount || 0);
  const qaMistakes = Number(qaMistakeCount || 0);
  const accuracyDenominator = approved + qaMistakes;
  const accuracy = accuracyDenominator > 0 ? Math.round((approved / accuracyDenominator) * 100) : 100;

  const assignedRequirements = await requirementsCollection
    .find({ assigned_to: emp.id, status: { $ne: 'archived_version' } })
    .project({ _id: 0, id: 1, title: 1, status: 1, version: 1, root_requirement_id: 1 })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray();

  const competencyMistakes = await mistakesCollection
    .aggregate([
      { $match: { qa_analyst_id: emp.id, admin_decision: 'reject_qa' } },
      {
        $lookup: {
          from: 'requirements',
          localField: 'requirement_id',
          foreignField: 'id',
          as: 'requirement',
        },
      },
      {
        $addFields: {
          requirement_title: { $arrayElemAt: ['$requirement.title', 0] },
        },
      },
      { $project: { requirement: 0, _id: 0 } },
      { $sort: { created_at: -1 } },
    ])
    .toArray();

  const weaknessAnalysis = buildWeaknessAnalysis(mistakeCounts, competencyMistakes, categoryTrends);
  const hasAssessments = assessmentsRes.length > 0;
  const hasMistakes = qaMistakes > 0;

  return {
    id: emp.id,
    username: emp.username,
    email: emp.email,
    employee_id: emp.employee_id,
    level: emp.level,
    designation: emp.level,
    experience: emp.experience,
    status: emp.status || 'Active',
    employment_status: emp.employment_status || 'Full-time',
    createdAt: emp.created_at,
    assignedCount: Number(assignedCount),
    assignedRequirements,
    totalSubmissions: submitted,
    submittedCount: submitted,
    approvedReviews: approved,
    approvedCount: approved,
    qaMistakeCount: qaMistakes,
    qaMistakes,
    returnedToClientCount: Number(returnedToClientCount || 0),
    accuracy,
    avgAssessmentScore: avgScore !== null ? Number(avgScore.toFixed(1)) : null,
    completedAssessmentCount: completedAssessments.length,
    assignedAssessmentCount: assignedAssessments.length,
    mistakes: mistakeCounts,
    assessments: assessmentsRes,
    quizAttempts: attempts,
    competencyHistory: attempts.map((a) => ({
      id: a.id,
      assessmentId: a.assessment_id,
      score: a.score,
      categoryScores: a.category_scores,
      improvementFromPrevious: a.improvement_from_previous,
      completedAt: a.completed_at,
    })),
    categoryTrends,
    improvementPercentage,
    trainingRecommendations,
    weaknessAnalysis,
    competencyMistakes,
    hasAssessments,
    hasMistakes,
  };
}

router.get('/me', protect, async (req, res) => {
  if (req.user.role !== 'qa_analyst') {
    return res.status(403).json({ message: 'This endpoint is only available for QA analysts' });
  }

  try {
    const usersCollection = await getCollection('users');
    const reportsCollection = await getCollection('validation_reports');
    const requirementsCollection = await getCollection('requirements');
    const mistakesCollection = await getCollection('mistake_logs');

    const emp = await usersCollection.findOne({ id: req.user.id, role: 'qa_analyst' });
    if (!emp) {
      return res.status(404).json({ message: 'Analyst profile not found. Please contact your administrator.' });
    }

    await syncHistoricalReportDecisions(reportsCollection, requirementsCollection, mistakesCollection);
    await syncHistoricalMistakeRecords(mistakesCollection);

    const collections = {
      requirementsCollection,
      reportsCollection,
      assessmentsCollection: await getCollection('competency_assessments'),
      mistakesCollection,
      attemptsCollection: await getCollection('quiz_attempts'),
    };

    const stats = await buildEmployeeStats(emp, collections);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching analyst profile:', error);
    res.status(500).json({ message: 'Unable to load your profile. Please try again.' });
  }
});

router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const usersCollection = await getCollection('users');
    const requirementsCollection = await getCollection('requirements');
    const reportsCollection = await getCollection('validation_reports');
    const assessmentsCollection = await getCollection('competency_assessments');
    const mistakesCollection = await getCollection('mistake_logs');
    const attemptsCollection = await getCollection('quiz_attempts');

    await syncHistoricalReportDecisions(reportsCollection, requirementsCollection, mistakesCollection);
    await syncHistoricalMistakeRecords(mistakesCollection);

    const employees = await usersCollection.find({ role: 'qa_analyst' }).sort({ username: 1 }).toArray();
    const collections = {
      requirementsCollection,
      reportsCollection,
      assessmentsCollection,
      mistakesCollection,
      attemptsCollection,
    };

    const results = [];
    for (const emp of employees) {
      results.push(await buildEmployeeStats(emp, collections));
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({ message: 'Server error while fetching employee statistics' });
  }
});

router.post('/', protect, restrictTo('admin'), async (req, res) => {
  const { username, email, employee_id, password, level, experience, employment_status, status } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email and password are required' });
  }

  try {
    const usersCollection = await getCollection('users');

    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newId = await getNextSequence('users');

    const newUser = {
      id: newId,
      username,
      email,
      password_hash: passwordHash,
      role: 'qa_analyst',
      employee_id: employee_id || `QA${String(newId).padStart(3, '0')}`,
      level: level || 'Junior QA Analyst',
      experience: experience != null ? Number(experience) : 0,
      status: status || 'Active',
      employment_status: employment_status || 'Full-time',
      created_at: new Date(),
    };

    await usersCollection.insertOne(newUser);
    res.status(201).json({ message: 'QA Analyst added successfully', user: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    console.error('Error adding QA Analyst:', error);
    res.status(500).json({ message: 'Server error while adding QA Analyst' });
  }
});

router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  const empId = parseNumericId(req.params.id);
  const { username, email, level, experience, employment_status, status, password } = req.body;

  if (!empId) {
    return res.status(400).json({ message: 'Invalid Analyst ID' });
  }

  try {
    const usersCollection = await getCollection('users');
    const employee = await usersCollection.findOne({ id: empId, role: 'qa_analyst' });
    if (!employee) {
      return res.status(404).json({ message: 'QA Analyst not found' });
    }

    const updateFields = {};
    if (username !== undefined) updateFields.username = username;
    if (email !== undefined) updateFields.email = email;
    if (level !== undefined) updateFields.level = level;
    if (experience !== undefined) updateFields.experience = Number(experience);
    if (employment_status !== undefined) updateFields.employment_status = employment_status;
    if (status !== undefined) updateFields.status = status;

    if (password) {
      updateFields.password_hash = await bcrypt.hash(password, 10);
    }

    await usersCollection.updateOne({ id: empId }, { $set: updateFields });
    res.json({ message: 'QA Analyst updated successfully' });
  } catch (error) {
    console.error('Error updating QA Analyst:', error);
    res.status(500).json({ message: 'Server error while updating QA Analyst' });
  }
});

router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  const empId = parseNumericId(req.params.id);
  if (!empId) {
    return res.status(400).json({ message: 'Invalid Analyst ID' });
  }

  try {
    const usersCollection = await getCollection('users');
    const requirementsCollection = await getCollection('requirements');

    const employee = await usersCollection.findOne({ id: empId, role: 'qa_analyst' });
    if (!employee) {
      return res.status(404).json({ message: 'QA Analyst not found' });
    }

    const activeAssignments = await requirementsCollection.countDocuments({
      assigned_to: empId,
      status: { $nin: ['approved', 'returned_to_client', 'archived_version'] },
    });

    if (activeAssignments > 0) {
      return res.status(400).json({ message: 'Cannot delete analyst with active requirement assignments.' });
    }

    await usersCollection.deleteOne({ id: empId });
    res.json({ message: 'QA Analyst deleted successfully' });
  } catch (error) {
    console.error('Error deleting QA Analyst:', error);
    res.status(500).json({ message: 'Server error while deleting QA Analyst' });
  }
});

module.exports = router;
