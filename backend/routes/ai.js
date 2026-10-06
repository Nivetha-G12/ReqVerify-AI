const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { getCollection, getNextSequence, parseNumericId } = require('../db');
const { protect } = require('../middleware/authMiddleware');

const apiKey = process.env.OPENAI_API_KEY;
let openai;
if (apiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.warn('WARNING: OPENAI_API_KEY not found in environment. Running AI Engine in fallback mock mode.');
}

function filterIssuesAgainstContent(issues, reqText) {
  const text = (reqText || '').toLowerCase();

  const hasValidation = ['validate', 'validation', 'format', 'regex', 'character limit', 'must specify', 'length between', 'alphanumeric', 'shall reject', 'password policy'].some((t) => text.includes(t));
  const hasException = ['error', 'exception', 'fail', 'invalid', 'crash', 'reject', 'retry', 'rollback', 'timeout', 'fallback'].some((t) => text.includes(t));
  const hasAcceptance = ['acceptance criteria', 'expected output', 'given', 'when', 'then', 'shall complete within'].some((t) => text.includes(t));
  const hasBusinessRules = ['business rule', 'discount', 'eligibility', 'policy', 'calculation', 'threshold'].some((t) => text.includes(t));

  return issues.filter((issue) => {
    const type = (issue.issueType || '').toLowerCase();
    if (type.includes('validation') && hasValidation) return false;
    if (type.includes('exception') && hasException) return false;
    if ((type.includes('acceptance') || type.includes('missing requirement')) && hasAcceptance) return false;
    if (type.includes('functional') && hasBusinessRules) return false;
    return true;
  }).map((issue) => ({
    ...issue,
    findingType: issue.findingType || (issue.severity === 'Low' ? 'Recommendation' : 'Defect'),
    checklistRule: issue.checklistRule || issue.violatedChecklistRule || 'General quality rule',
    suggestedRewrite: issue.suggestedRewrite || issue.suggestedFix || '',
  }));
}

const runMockAnalysis = (reqText) => {
  const issues = [];
  const text = reqText.toLowerCase();

  if (text.includes('user-friendly') || text.includes('easy to use') || text.includes('fast') || text.includes('load quickly') || text.includes('high performance') || text.includes('secure')) {
    let term = 'vague criteria';
    if (text.includes('user-friendly')) term = '"user-friendly"';
    if (text.includes('fast') || text.includes('quickly')) term = '"fast / load quickly"';
    if (text.includes('secure')) term = '"secure"';

    issues.push({
      requirementId: 'ISSUE-01',
      requirementText: reqText.substring(0, Math.min(reqText.length, 120)) + '...',
      violatedChecklistRule: 'Requirement must be clear.',
      checklistRule: 'Requirement must be clear.',
      issueType: 'Ambiguous Requirements',
      findingType: 'Defect',
      severity: 'High',
      explanation: `The requirement uses the qualitative term ${term} which is subjective and cannot be measured. Clear performance and usability metrics are required.`,
      suggestedFix: text.includes('fast')
        ? 'The system shall respond to user requests within 2.0 seconds under a peak load of 500 concurrent users.'
        : 'The user interface shall comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.',
      suggestedRewrite: text.includes('fast')
        ? 'The system shall respond to user requests within 2.0 seconds under a peak load of 500 concurrent users.'
        : 'The user interface shall comply with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.',
    });
  }

  if (text.includes('should be') || text.includes('can potentially') || text.includes('must support unlimited')) {
    issues.push({
      requirementId: 'ISSUE-02',
      requirementText: reqText.substring(0, Math.min(reqText.length, 100)) + '...',
      violatedChecklistRule: 'Requirement must be testable.',
      checklistRule: 'Requirement must be testable.',
      issueType: 'Non-Testable Requirements',
      findingType: 'Defect',
      severity: 'Medium',
      explanation: 'The requirement is phrased in passive/optional terms ("should be", "potentially") or defines an unmeasurable limit ("unlimited"). It needs specific, measurable constraints.',
      suggestedFix: 'The system shall support up to 10,000 active customer profiles and process up to 50 concurrent requests without failures.',
      suggestedRewrite: 'The system shall support up to 10,000 active customer profiles and process up to 50 concurrent requests without failures.',
    });
  }

  // Only report missing exception handling if exception/error terms do NOT exist in text
  const exceptionTerms = ['error', 'exception', 'fail', 'invalid', 'crash', 'reject', 'return client'];
  const hasExceptionHandling = exceptionTerms.some(term => text.includes(term));
  if (!hasExceptionHandling) {
    issues.push({
      requirementId: 'ISSUE-03',
      requirementText: 'General exception states',
      violatedChecklistRule: 'Requirement must define exception handling.',
      checklistRule: 'Requirement must define exception handling.',
      issueType: 'Missing Exception Handling',
      findingType: 'Defect',
      severity: 'High',
      explanation: 'The document describes standard workflows but does not define what the system should do if inputs are invalid, network errors occur, or authentication fails.',
      suggestedFix: 'In case of database connection failure, the system shall show a user-friendly error message, retry connection 3 times, and log the details to security logs.',
      suggestedRewrite: 'In case of database connection failure, the system shall show a user-friendly error message, retry connection 3 times, and log the details to security logs.',
    });
  }

  // Only report missing validation rules if validation terms do NOT exist in text
  const validationTerms = ['validate', 'format', 'regex', 'character limit', 'must specify', 'length between', 'alphanumeric'];
  const hasValidationRules = validationTerms.some(term => text.includes(term));
  if (!hasValidationRules) {
    issues.push({
      requirementId: 'ISSUE-04',
      requirementText: 'Form inputs & text fields',
      violatedChecklistRule: 'Requirement must include validation rules.',
      checklistRule: 'Requirement must include validation rules.',
      issueType: 'Missing Validation Rules',
      findingType: 'Recommendation',
      severity: 'Medium',
      explanation: 'Input validation rules for forms, email entry, password constraints, and file formats are not defined.',
      suggestedFix: 'The client input fields shall validate formatting, enforcing emails to match RFC 5322 regex and passwords to require at least 8 characters including one uppercase letter and one digit.',
      suggestedRewrite: 'The client input fields shall validate formatting, enforcing emails to match RFC 5322 regex and passwords to require at least 8 characters including one uppercase letter and one digit.',
    });
  }

  if (!text.includes('acceptance criteria') && !text.includes('criteria') && !text.includes('expected output')) {
    issues.push({
      requirementId: 'ISSUE-05',
      requirementText: 'General document structure',
      violatedChecklistRule: 'Requirement must include acceptance criteria.',
      checklistRule: 'Requirement must include acceptance criteria.',
      issueType: 'Missing Requirements',
      findingType: 'Recommendation',
      severity: 'Medium',
      explanation: 'The document describes features but lacks clear acceptance criteria indicating the state transitions that mark a feature complete.',
      suggestedFix: 'Define measurable acceptance criteria to ensure the feature can be objectively marked as done.',
      suggestedRewrite: 'Define measurable acceptance criteria to ensure the feature can be objectively marked as done.',
    });
  }

  if (issues.length === 0) {
    issues.push({
      requirementId: 'ISSUE-GEN',
      requirementText: reqText.substring(0, Math.min(reqText.length, 80)) + '...',
      violatedChecklistRule: 'Requirement must include business rules.',
      checklistRule: 'Requirement must include business rules.',
      issueType: 'Functional Gaps',
      findingType: 'Recommendation',
      severity: 'Low',
      explanation: 'The requirement outlines features but does not provide complete business logic or security constraints.',
      suggestedFix: 'Define logical steps, user permission rules, and data access policies.',
      suggestedRewrite: 'Define logical steps, user permission rules, and data access policies.',
    });
  }

  return issues;
};

router.post('/analyze', protect, async (req, res) => {
  const { requirementId, analysisType } = req.body;

  if (!requirementId) {
    return res.status(400).json({ message: 'Requirement ID is required' });
  }

  const type = analysisType || 'qa_validation';

  try {
    const requirementsCollection = await getCollection('requirements');
    const checklistCollection = await getCollection('checklist_rules');
    const aiAnalysesCollection = await getCollection('ai_analyses');

    const requirement = await requirementsCollection.findOne({ id: parseNumericId(requirementId) });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const checklist = await checklistCollection.find().sort({ id: 1 }).toArray();
    const checklistRulesText = checklist.map((r, i) => `${i + 1}. ${r.rule_text} - ${r.description}`).join('\n');

    let analysisResult;

    if (openai && process.env.OPENAI_API_KEY) {
      try {
        console.log(`Sending requirement ID ${requirementId} to OpenAI for comparative analysis...`);
        const systemPrompt = `You are an expert Requirements Quality Engineer. Your task is to perform a detailed comparative analysis between the client's Requirement Document and the predefined Company Checklist.\nIdentify any missing, ambiguous, incomplete, inconsistent, and non-testable requirements, as well as missing validation, exception handling, functional gaps, and security gaps.\n\nPredefined Company Checklist:\n${checklistRulesText}\n\nFor every issue identified, map it to one of these checklist rules.\nCategories of issues to check:\n- Missing Requirements (e.g. missing acceptance criteria, missing business rules)\n- Ambiguous Requirements (e.g. vague qualifiers like \"fast\", \"user-friendly\", \"highly secure\")\n- Incomplete Requirements (e.g. half-defined workflows, gaps in inputs/outputs)\n- Inconsistent Requirements (e.g. conflicting specifications)\n- Non-Testable Requirements (e.g. no measurable metrics)\n- Missing Validation Rules (e.g. data formats, constraints, validation triggers)\n- Missing Exception Handling (e.g. boundary states, error handling)\n- Security Gaps (e.g. encryption, authorization checks missing)\n- Functional Gaps (e.g. missing workflow steps or roles)\n\nYou MUST respond ONLY with a JSON object in this exact format. Ensure it is valid JSON and contains NO markdown backticks:\n{\n  \"issues\": [\n    {\n      \"requirementId\": \"REQ-${requirementId}\",\n      \"requirementText\": \"The exact sentence or block containing the issue\",\n      \"violatedChecklistRule\": \"The exact checklist rule violated (e.g. 'Requirement must be clear.')\",\n      \"checklistRule\": \"The exact checklist rule violated (e.g. 'Requirement must be clear.')\",\n      \"issueType\": \"One of: Missing Requirements, Ambiguous Requirements, Incomplete Requirements, Inconsistent Requirements, Non-Testable Requirements, Missing Validation Rules, Missing Exception Handling, Security Gaps, Functional Gaps\",\n      \"findingType\": \"Defect\" | \"Recommendation\",\n      \"severity\": \"Low\" | \"Medium\" | \"High\" | \"Critical\",\n      \"explanation\": \"Detail explaining why this violates the rule\",\n      \"suggestedFix\": \"A rewritten, complete, clear, and testable version of the requirement\",\n      \"suggestedRewrite\": \"A rewritten, complete, clear, and testable version of the requirement\"\n    }\n  ]\n}`;

        const userPrompt = `Requirement Document Title: ${requirement.title}\nClient Name: ${requirement.client_name}\nRequirement Description / Content:\n${requirement.description}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        const rawJson = JSON.parse(response.choices[0].message.content);
        analysisResult = filterIssuesAgainstContent(rawJson.issues || [], requirement.description);
        console.log(`Successfully received ${analysisResult.length} issues from OpenAI.`);
      } catch (apiError) {
        console.error('OpenAI API call failed, falling back to local mock analyzer:', apiError.message);
        analysisResult = filterIssuesAgainstContent(runMockAnalysis(requirement.description), requirement.description);
      }
    } else {
      console.log('Using local mock analyzer (OpenAI key not configured)...');
      await new Promise((resolve) => setTimeout(resolve, 800));
      analysisResult = filterIssuesAgainstContent(runMockAnalysis(requirement.description), requirement.description);
    }

    const analysisId = await getNextSequence('ai_analyses');
    await aiAnalysesCollection.insertOne({
      id: analysisId,
      requirement_id: requirement.id,
      analysis_type: type,
      analysis_result: analysisResult,
      created_at: new Date(),
    });

    res.json({
      analysisId,
      requirementId,
      analysisType: type,
      issues: analysisResult,
    });
  } catch (error) {
    console.error('Error in AI analysis route:', error);
    res.status(500).json({ message: 'Server error during AI comparative analysis' });
  }
});

module.exports = router;
