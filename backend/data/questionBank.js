const COMPETENCY_CATEGORIES = [
  'Validation Rules',
  'Acceptance Criteria',
  'Business Rules',
  'Requirement Completeness',
  'Ambiguity Detection',
  'Exception Handling',
  'Checklist Evaluation',
];

const MISTAKE_TO_CATEGORY = {
  'Missed Validation Rule': 'Validation Rules',
  'Missed Acceptance Criteria': 'Acceptance Criteria',
  'Missed Business Rule': 'Business Rules',
  'Missed Ambiguous Requirement': 'Ambiguity Detection',
  'Incorrect Checklist Evaluation': 'Checklist Evaluation',
};

function q(id, question, options, correctAnswer, explanation, difficultyLevel, competencyCategory) {
  return { id, question, options, correctAnswer, explanation, difficultyLevel, competencyCategory };
}

const localQuestionBank = {
  'Validation Rules': [
    q(1, 'A registration form requirement states: "Users enter a password during signup." Which validation constraint is missing?', ['Button color specification', 'Exact password policy with length, complexity, and error messages', 'Font weight for input fields', 'Backup storage directory'], 1, 'Complete validation rules must define exact boundaries such as minimum length and complexity requirements.', 'easy', 'Validation Rules'),
    q(2, 'A requirement says: "Form submits only if email format is validated." How should a QA analyst define test criteria?', ['Verify email contains letters', 'Map to RFC 5322 regex pattern check in the validation test case', 'Check if email field is green', 'Allow any string as email'], 1, 'Email validation must be tested against standard format structures for objective pass/fail metrics.', 'medium', 'Validation Rules'),
    q(3, 'Scenario: A checkout form allows blank mandatory fields to submit without error alerts. What type of issue is this?', ['Performance defect', 'Validation rule violation', 'Security breach', 'UI inconsistency'], 1, 'Mandatory fields must block submission and display validation errors when empty.', 'easy', 'Validation Rules'),
    q(4, 'Which requirement best satisfies a "Must include validation rules" checklist item?', ['The page should block wrong inputs', 'The system shall validate inputs securely', 'The registration form shall reject passwords shorter than 8 characters, displaying "Password too short" in red helper text', 'Input forms should have labels'], 2, 'Option C defines a specific validation rule with boundary, system response, and visual feedback.', 'medium', 'Validation Rules'),
    q(5, 'Scenario: A date field accepts "32/13/2025" without rejection. Which validation rule is absent?', ['Range and format validation for date inputs', 'Color contrast validation', 'Session timeout rule', 'Navigation breadcrumb rule'], 0, 'Date fields require format and range validation to reject impossible values.', 'medium', 'Validation Rules'),
    q(6, 'A spec requires "numeric-only phone input" but does not define length. What should the analyst flag?', ['Missing maximum and minimum digit constraints', 'Missing logo placement', 'Missing API endpoint name', 'Missing font family'], 0, 'Validation rules need both format constraints and length boundaries to be testable.', 'hard', 'Validation Rules'),
    q(7, 'Which pair correctly distinguishes client-side vs server-side validation in requirements?', ['Client-side is optional; server-side is never needed', 'Both must be specified when data integrity is critical', 'Only client-side validation is required', 'Server-side validation replaces all UI rules'], 1, 'Critical data integrity requires both layers to be explicitly documented.', 'hard', 'Validation Rules'),
    q(8, 'Scenario: Credit card field accepts alphabetic characters. Which rewrite is most testable?', ['"Card field should look professional"', '"Card number field shall accept only 13-19 digits and reject non-numeric input with inline error message"', '"Users enter card details"', '"Payment form must be secure"'], 1, 'Testable validation rules specify allowed character set, length range, and error behavior.', 'medium', 'Validation Rules'),
    q(9, 'What is the primary function of validation rules in input form specifications?', ['Style submit buttons', 'Constrain and sanitize input boundaries before processing', 'Query the database directly', 'Encrypt connection routing'], 1, 'Validation rules enforce format, length, and constraint boundaries on user inputs.', 'easy', 'Validation Rules'),
    q(10, 'Scenario: A discount code field has no rule for case sensitivity. What validation gap exists?', ['Missing rule for accepted character case and whitespace handling', 'Missing page title', 'Missing database index', 'Missing user avatar'], 0, 'Input validation must clarify case sensitivity and trimming behavior for deterministic testing.', 'hard', 'Validation Rules'),
  ],
  'Acceptance Criteria': [
    q(1, 'What is an Acceptance Criterion in requirement validation?', ['A legal clause accepting deliverables', 'Conditions a product must satisfy to be accepted by the user or customer', 'The test case results checklist', 'Jest configuration files'], 1, 'Acceptance criteria define measurable conditions for feature completion.', 'easy', 'Acceptance Criteria'),
    q(2, 'Scenario: "Report shall be generated within a reasonable timeframe." How can this be made testable?', ['Change "reasonable" to "super fast"', 'Remove the requirement', 'Change to "PDF report ready within 5.0 seconds of clicking Export"', 'Let the developer decide'], 2, 'Concrete time metrics replace subjective terms like "reasonable".', 'easy', 'Acceptance Criteria'),
    q(3, 'Which acceptance criterion is measurable for a login feature?', ['"Login should feel smooth"', '"After 3 failed attempts, account locks for 15 minutes and displays lockout message"', '"Login page must be beautiful"', '"Users can log in easily"'], 1, 'Measurable criteria specify exact thresholds, durations, and system responses.', 'medium', 'Acceptance Criteria'),
    q(4, 'Scenario: A search feature lacks acceptance criteria. What is the most critical gap?', ['No color palette defined', 'No measurable success conditions for result relevance, response time, or empty-state behavior', 'No footer links', 'No copyright notice'], 1, 'Features without acceptance criteria cannot be objectively verified at UAT.', 'medium', 'Acceptance Criteria'),
    q(5, 'Which requirement includes proper acceptance criteria?', ['"Dashboard loads quickly"', '"Dashboard renders all 12 KPI widgets within 2 seconds under 50 concurrent users"', '"Dashboard is user-friendly"', '"Dashboard looks modern"'], 1, 'Acceptance criteria include specific metrics and load conditions.', 'medium', 'Acceptance Criteria'),
    q(6, 'Scenario: E-commerce checkout has no criteria for partial payment failure. What acceptance criteria is missing?', ['Button hover color', 'System behavior when payment gateway returns timeout or partial charge', 'Logo dimensions', 'Font size'], 1, 'Acceptance criteria must cover failure scenarios, not just happy paths.', 'hard', 'Acceptance Criteria'),
    q(7, 'How does an RTM (Requirements Traceability Matrix) support acceptance criteria?', ['It replaces acceptance criteria', 'It maps requirements to test cases verifying each criterion is covered', 'It estimates project budget', 'It defines UI themes'], 1, 'RTM ensures every acceptance criterion has corresponding test coverage.', 'hard', 'Acceptance Criteria'),
    q(8, 'Scenario: "90% of users complete onboarding." What additional detail is needed?', ['Definition of "onboarding" steps, user population, and measurement period', 'Company address', 'Server hostname', 'Button border radius'], 0, 'Acceptance criteria must define scope, population, and measurement methodology.', 'hard', 'Acceptance Criteria'),
    q(9, 'Which is a well-formed Given-When-Then acceptance criterion?', ['"Feature works well"', '"Given a logged-in user with 2FA enabled, when entering valid OTP within 30 seconds, then access is granted"', '"System is fast"', '"UI is intuitive"'], 1, 'Given-When-Then format provides clear preconditions, actions, and expected outcomes.', 'medium', 'Acceptance Criteria'),
    q(10, 'Scenario: Admin approval workflow has no criteria for rejection. What should be added?', ['Acceptance criteria for rejection reasons, notifications, and audit trail entries', 'Header background image', 'Social media links', 'Page animation duration'], 0, 'All workflow branches need explicit acceptance criteria including rejection paths.', 'easy', 'Acceptance Criteria'),
  ],
  'Business Rules': [
    q(1, 'What defines a Business Rule in requirement engineering?', ['A constraint or policy defining business operation aspects', 'Technical database query specification', 'A contract between client and vendor', 'CSS layout grid columns'], 0, 'Business rules describe policies, calculations, and operational constraints.', 'easy', 'Business Rules'),
    q(2, 'Scenario: "VIP customers receive discounts on checkout." What is missing?', ['Payment method description', 'Exact discount percentage, conditions, and eligibility rules', 'Button animations', 'Login page background URL'], 1, 'Business rules must specify precise calculation formulas and eligibility conditions.', 'easy', 'Business Rules'),
    q(3, 'Scenario: "Loans approved if credit score is good." What is the primary issue?', ['Credit score is invalid', 'It lacks a title', 'The term "good" is qualitative and undefined', 'It does not use "shall"'], 2, 'Credit thresholds must be quantified (e.g., score >= 700).', 'medium', 'Business Rules'),
    q(4, 'Which is a structural constraint business rule?', ['Website header must be blue', 'An order cannot be placed without at least one active line item', 'Server should backup tables daily', 'Users can contact help desk via phone'], 1, 'Structural constraints dictate data validation boundaries and business logic gates.', 'hard', 'Business Rules'),
    q(5, 'Scenario: Tax calculation rule says "apply appropriate tax." What rewrite is correct?', ['"Tax is calculated"', '"Sales tax = order subtotal × applicable jurisdiction rate; rates defined in Appendix B"', '"Tax should be fair"', '"System handles tax"'], 1, 'Business rules need explicit formulas and reference data sources.', 'medium', 'Business Rules'),
    q(6, 'A loyalty program rule lacks tier definitions. What business rule element is missing?', ['Tier thresholds, point accrual rates, and redemption limits', 'Page footer text', 'Server port number', 'Icon file path'], 0, 'Loyalty business rules require complete tier structure and calculation logic.', 'hard', 'Business Rules'),
    q(7, 'Scenario: Refund policy states "refunds allowed sometimes." What issue exists?', ['Missing refund eligibility conditions, time windows, and approval workflow', 'Missing login page', 'Missing database name', 'Missing CSS framework'], 0, 'Business rules cannot use subjective terms like "sometimes" without defined conditions.', 'medium', 'Business Rules'),
    q(8, 'Which business rule is testable?', ['"Premium users get better service"', '"Users with subscription tier Gold or above may access Feature X; tier determined by active subscription flag"', '"Pricing should be competitive"', '"Support is available"'], 1, 'Testable business rules define identifiable conditions and outcomes.', 'medium', 'Business Rules'),
    q(9, 'Scenario: Commission rule applies to "top performers" without definition. What is needed?', ['Quantified performance metrics and commission calculation formula', 'Office address', 'Logo color', 'Page layout grid'], 0, 'Performance-based business rules require measurable thresholds.', 'hard', 'Business Rules'),
    q(10, 'How should conflicting business rules be handled in a requirements review?', ['Ignore the conflict', 'Document the inconsistency and request client clarification on precedence', 'Delete both rules', 'Approve and fix in development'], 1, 'Conflicting business rules must be flagged and resolved before approval.', 'easy', 'Business Rules'),
  ],
  'Requirement Completeness': [
    q(1, 'Scenario: "User submits checkout and transaction completes." What critical gap exists?', ['No color scheme mentioned', 'No exception handling for payment gateway failures', 'No login requirement', 'No signature field'], 1, 'Complete requirements cover happy paths and exception/failure scenarios.', 'easy', 'Requirement Completeness'),
    q(2, 'Which indicates an incomplete requirement?', ['Specifies response time with load conditions', 'Describes only the success path without error handling or edge cases', 'Includes validation rules', 'Has measurable acceptance criteria'], 1, 'Incomplete requirements omit error paths, boundaries, or dependencies.', 'easy', 'Requirement Completeness'),
    q(3, 'Scenario: User management spec covers create and read but not update/delete. What is this?', ['Ambiguity issue', 'Functional completeness gap', 'Security issue only', 'Performance issue'], 1, 'CRUD operations should be complete or explicitly scoped with exclusions.', 'medium', 'Requirement Completeness'),
    q(4, 'What should be checked for requirement completeness during validation?', ['All workflow branches, inputs, outputs, and dependencies are documented', 'Only the main happy path', 'Only UI colors', 'Only database table names'], 0, 'Completeness review verifies all paths, actors, and dependencies are covered.', 'medium', 'Requirement Completeness'),
    q(5, 'Scenario: API spec defines request format but not response format. What is missing?', ['Response schema, status codes, and error payloads', 'Button label', 'Page title', 'Logo size'], 0, 'API requirements must document both request and response contracts.', 'medium', 'Requirement Completeness'),
    q(6, 'Scenario: Notification feature lacks delivery failure handling. What completeness element is absent?', ['Retry logic, failure notifications, and dead-letter handling', 'Font family', 'Header image', 'Copyright year'], 0, 'Notification requirements need complete delivery lifecycle including failures.', 'hard', 'Requirement Completeness'),
    q(7, 'Which technique helps identify completeness gaps?', ['Input-Process-Output mapping and workflow decomposition', 'Random sampling', 'Code compilation', 'Load testing only'], 0, 'IPO mapping and workflow analysis reveal missing steps and outputs.', 'hard', 'Requirement Completeness'),
    q(8, 'Scenario: Report export covers PDF but not CSV despite dashboard showing export options. What gap is this?', ['Inconsistency between UI description and documented export formats', 'Missing page background', 'Missing user avatar', 'Missing server OS'], 0, 'All advertised capabilities must be fully specified in requirements.', 'medium', 'Requirement Completeness'),
    q(9, 'Scenario: Multi-step wizard lacks step transition rules. What is incomplete?', ['Conditions for advancing, skipping, going back, and saving partial progress', 'Button color', 'Page width', 'Icon library'], 0, 'Multi-step flows need complete navigation and state persistence rules.', 'hard', 'Requirement Completeness'),
    q(10, 'What makes a data migration requirement complete?', ['Source, target, mapping rules, rollback plan, and validation checkpoints', '"Data will be migrated"', 'Migration happens at night', 'Developer decides approach'], 0, 'Migration requirements need end-to-end specification including rollback.', 'easy', 'Requirement Completeness'),
  ],
  'Ambiguity Detection': [
    q(1, 'Which requirement is clearest and least ambiguous?', ['"System should load quickly"', '"Backend responds within 1.5 seconds under 100 concurrent requests"', '"System must be secure"', '"Users experience seamless checkout"'], 1, 'Concrete metrics eliminate subjective terms like "quickly" and "seamless".', 'easy', 'Ambiguity Detection'),
    q(2, 'Scenario: "Portal must support massive concurrent file uploads." How would you classify this?', ['Incomplete requirement', 'Functional gap', 'Ambiguous/non-testable requirement', 'Inconsistent requirement'], 2, '"Massive" is subjective without quantified file sizes and concurrent user counts.', 'medium', 'Ambiguity Detection'),
    q(3, 'How can ambiguity in "The UI should be user-friendly" be resolved?', ['Change to "UI shall be beautiful"', 'Specify "90% of trained operators complete checkout in under 3 minutes"', 'Remove the requirement', 'Leave as-is because usability is qualitative'], 1, 'Usability can be measured with task completion rates and time limits.', 'medium', 'Ambiguity Detection'),
    q(4, 'What is the primary danger of non-testable requirements?', ['Slower code development', 'QA cannot write pass/fail test cases, causing validation disputes', 'Lower client payment', 'Server memory issues'], 1, 'Non-testable requirements lead to subjective acceptance disputes.', 'easy', 'Ambiguity Detection'),
    q(5, 'Scenario: "System shall provide adequate notification." What ambiguous term needs clarification?', ['"Adequate" — needs specific channels, timing, and content requirements', '"System" — needs server hostname', '"Shall" — needs legal review', '"Provide" — needs API key'], 0, 'Subjective qualifiers like "adequate" must be replaced with specific criteria.', 'medium', 'Ambiguity Detection'),
    q(6, 'Which words commonly signal ambiguous requirements?', ['Shall, must, will', 'Quickly, adequate, user-friendly, seamless, robust', 'Given, when, then', 'Input, process, output'], 1, 'Vague adjectives indicate ambiguity requiring quantification.', 'easy', 'Ambiguity Detection'),
    q(7, 'Scenario: "Reports should be generated periodically." What clarification is needed?', ['Exact schedule (daily at 2 AM UTC), format, and recipient list', 'Report font size', 'Page background color', 'Button shape'], 0, '"Periodically" must be replaced with explicit scheduling parameters.', 'hard', 'Ambiguity Detection'),
    q(8, 'Two requirements use "real-time" differently — one means 1 second, another means 1 minute. What issue is this?', ['Ambiguity and inconsistency in terminology', 'Security gap', 'Missing acceptance criteria only', 'Complete requirement'], 0, 'Terms like "real-time" must have consistent, quantified definitions.', 'hard', 'Ambiguity Detection'),
    q(9, 'Scenario: "Support multiple languages" without locale list. What should the analyst recommend?', ['Specify supported locales, fallback language, and translation scope', 'Remove i18n entirely', 'Use only English', 'Add more adjectives'], 0, 'Scope terms like "multiple" need explicit enumeration or boundaries.', 'medium', 'Ambiguity Detection'),
    q(10, 'Which rewrite best removes ambiguity from "System handles errors gracefully"?', ['"System shows errors"', '"On unhandled exceptions, system logs error code, displays user-friendly message, and preserves session state"', '"Errors are bad"', '"Graceful means nice"'], 1, 'Graceful error handling must specify logging, user messaging, and state preservation.', 'hard', 'Ambiguity Detection'),
  ],
  'Exception Handling': [
    q(1, 'Scenario: Checkout requirement covers success path only. What exception path is most critical?', ['Payment gateway timeout or failure response', 'Button hover color', 'Page header logo', 'Footer copyright'], 0, 'Payment failures are critical exception paths that must be documented.', 'easy', 'Exception Handling'),
    q(2, 'What should exception handling requirements specify?', ['System response, user messaging, retry logic, and data rollback behavior', 'Only that errors occur', 'Button styling on error pages', 'Server hardware specs'], 0, 'Complete exception specs cover detection, response, recovery, and user communication.', 'medium', 'Exception Handling'),
    q(3, 'Scenario: File upload lacks rules for oversized files. What exception handling is missing?', ['Max file size limit, rejection message, and partial upload cleanup', 'File icon color', 'Upload button position', 'Page title'], 0, 'Upload features need boundary exceptions with clear user feedback.', 'easy', 'Exception Handling'),
    q(4, 'Scenario: API spec has no 500-error behavior. What should be added?', ['Server error response format, logging requirements, and client retry guidance', 'Success response only', 'Database schema', 'CSS classes'], 0, 'API requirements must document error responses for all failure categories.', 'medium', 'Exception Handling'),
    q(5, 'Which is a well-specified exception handling requirement?', ['"System handles errors"', '"On DB connection failure, retry 3 times with exponential backoff, then display maintenance message and queue request"', '"Errors are logged"', '"System is robust"'], 1, 'Exception handling needs specific retry counts, backoff, and fallback behaviors.', 'hard', 'Exception Handling'),
    q(6, 'Scenario: Concurrent edit conflict has no resolution rule. What exception handling is needed?', ['Conflict detection, merge/override policy, and user notification', 'Page background', 'Font weight', 'Logo placement'], 0, 'Concurrency exceptions require explicit resolution strategies.', 'hard', 'Exception Handling'),
    q(7, 'Scenario: Session expires during form fill. What exception path should be documented?', ['Auto-save draft, session renewal prompt, and data recovery on re-login', 'Ignore the scenario', 'Clear all data silently', 'Redirect to homepage without message'], 0, 'Session timeout exceptions need data preservation and user guidance.', 'medium', 'Exception Handling'),
    q(8, 'What distinguishes exception handling from validation rules?', ['Exception handling covers system/runtime failures; validation covers input constraints', 'They are identical', 'Validation handles server crashes', 'Exception handling is only for UI'], 0, 'Validation prevents bad input; exception handling manages failure recovery.', 'medium', 'Exception Handling'),
    q(9, 'Scenario: Third-party service unavailable. What exception requirement is needed?', ['Fallback behavior, circuit breaker policy, and degraded mode functionality', 'Ignore third-party failures', 'Always show error 500', 'Hide the feature permanently'], 0, 'External dependency failures need documented fallback and degradation strategies.', 'hard', 'Exception Handling'),
    q(10, 'Scenario: Batch job partial failure. What should requirements specify?', ['Which records failed, retry scope, rollback policy, and admin notification', 'Job runs at night', 'Job name', 'Button color'], 0, 'Batch processing exceptions need granular failure reporting and recovery.', 'easy', 'Exception Handling'),
  ],
  'Checklist Evaluation': [
    q(1, 'What is the primary role of a checklist in static requirement review?', ['Automate test execution', 'Replace UAT', 'Provide systematic framework preventing analyst oversight', 'Estimate project budgets'], 2, 'Checklists ensure systematic evaluation of quality aspects across all requirements.', 'easy', 'Checklist Evaluation'),
    q(2, 'When validating against a checklist, what should you do if a rule is violated?', ['Modify the checklist to match', 'Ignore for important clients', 'Record detailed observation and suggest concrete rewrite', 'Approve and fix in development'], 2, 'Violations must be documented with specific remediation recommendations.', 'easy', 'Checklist Evaluation'),
    q(3, 'Scenario: Analyst marks all checklist items "Pass" but AI audit found 5 ambiguities. What mistake occurred?', ['Correct evaluation', 'Incorrect checklist evaluation — failed items marked as pass', 'Client error', 'Tool malfunction only'], 1, 'Checklist results must accurately reflect identified defects.', 'medium', 'Checklist Evaluation'),
    q(4, 'How should checklist comments be written for failed items?', ['"Bad requirement"', 'Specific violation description with location, issue type, and suggested fix', '"Failed"', 'Leave blank'], 1, 'Failed checklist items need actionable, specific comments.', 'medium', 'Checklist Evaluation'),
    q(5, 'Scenario: Analyst skips security checklist items for a payment module. What evaluation error is this?', ['Incomplete checklist evaluation — all applicable rules must be assessed', 'Acceptable shortcut', 'Client preference', 'Tool limitation'], 0, 'All applicable checklist categories must be evaluated for each requirement.', 'hard', 'Checklist Evaluation'),
    q(6, 'What is the relationship between checklist evaluation and quality score?', ['Quality score should reflect pass/fail ratio of evaluated checklist items', 'Quality score is random', 'Checklist does not affect score', 'Only AI determines score'], 0, 'Quality scores derive from checklist pass rates and identified defect severity.', 'medium', 'Checklist Evaluation'),
    q(7, 'Scenario: Two analysts evaluate the same requirement with different checklist results. What should happen?', ['Accept both', 'Admin reviews discrepancies during verification to ensure evaluation accuracy', 'Average the scores', 'Ignore checklist'], 1, 'Discrepant evaluations are resolved during admin verification.', 'hard', 'Checklist Evaluation'),
    q(8, 'When should a checklist item be marked "N/A"?', ['When the rule genuinely does not apply to this requirement type, with documented justification', 'Whenever evaluation is difficult', 'For all security items', 'Never'], 0, 'N/A requires justification — the rule must truly not apply to the requirement scope.', 'medium', 'Checklist Evaluation'),
    q(9, 'Scenario: Analyst passes "testability" but requirement uses only subjective terms. What error?', ['Incorrect checklist evaluation — subjective terms fail testability rules', 'Correct pass', 'Minor issue only', 'Client responsibility'], 0, 'Subjective language fails testability checklist criteria.', 'easy', 'Checklist Evaluation'),
    q(10, 'How does AI comparative audit complement checklist evaluation?', ['Replaces checklist entirely', 'Flags potential gaps for analyst verification before finalizing checklist results', 'Eliminates manual review', 'Reduces project scope'], 1, 'AI audit assists analysts in identifying gaps to verify against checklist rules.', 'hard', 'Checklist Evaluation'),
  ],
};

const DIFFICULTY_MAP = {
  easy: ['easy', 'Easy', 'Beginner'],
  medium: ['medium', 'Medium', 'Intermediate'],
  hard: ['hard', 'Hard', 'Advanced', 'Challenging'],
};

function normalizeDifficulty(level) {
  const lower = (level || '').toLowerCase();
  if (DIFFICULTY_MAP.easy.some((d) => lower.includes(d.toLowerCase()))) return 'easy';
  if (DIFFICULTY_MAP.hard.some((d) => lower.includes(d.toLowerCase()))) return 'hard';
  return 'medium';
}

function computeCategoryWeights(mistakeCounts) {
  const weights = {};
  for (const cat of COMPETENCY_CATEGORIES) {
    weights[cat] = 1;
  }

  for (const [mistakeType, count] of Object.entries(mistakeCounts)) {
    const cat = MISTAKE_TO_CATEGORY[mistakeType];
    if (cat) weights[cat] = (weights[cat] || 1) + count * 2;
  }

  return weights;
}

function distributeQuestionSlots(weights, total = 10) {
  const categories = Object.keys(weights);
  const totalWeight = categories.reduce((sum, cat) => sum + weights[cat], 0);
  const slots = {};
  let assigned = 0;

  for (const cat of categories) {
    const slot = Math.max(1, Math.round((weights[cat] / totalWeight) * total));
    slots[cat] = slot;
    assigned += slot;
  }

  while (assigned > total) {
    const maxCat = categories.reduce((a, b) => (slots[a] >= slots[b] ? a : b));
    if (slots[maxCat] > 1) {
      slots[maxCat] -= 1;
      assigned -= 1;
    } else break;
  }

  while (assigned < total) {
    const maxWeightCat = categories.reduce((a, b) => (weights[a] >= weights[b] ? a : b));
    slots[maxWeightCat] = (slots[maxWeightCat] || 0) + 1;
    assigned += 1;
  }

  return slots;
}

function selectQuestionsFromBank(categorySlots) {
  const selected = [];
  const usedTexts = new Set();

  for (const [category, count] of Object.entries(categorySlots)) {
    const pool = [...(localQuestionBank[category] || [])];
    const shuffled = pool.sort(() => Math.random() - 0.5);

    let added = 0;
    for (const question of shuffled) {
      if (added >= count) break;
      if (usedTexts.has(question.question)) continue;
      usedTexts.add(question.question);
      selected.push({ ...question, competencyCategory: category });
      added += 1;
    }
  }

  return selected;
}

function balanceDifficulty(questions, targetTotal = 10) {
  const easyTarget = 3;
  const mediumTarget = 4;
  const hardTarget = 3;

  const byDiff = { easy: [], medium: [], hard: [] };
  for (const q of questions) {
    byDiff[normalizeDifficulty(q.difficultyLevel)].push(q);
  }

  const result = [];
  const pick = (arr, n) => arr.splice(0, Math.min(n, arr.length));

  result.push(...pick(byDiff.easy, easyTarget));
  result.push(...pick(byDiff.medium, mediumTarget));
  result.push(...pick(byDiff.hard, hardTarget));

  const allRemaining = [...byDiff.easy, ...byDiff.medium, ...byDiff.hard];
  while (result.length < targetTotal && allRemaining.length > 0) {
    result.push(allRemaining.shift());
  }

  return result.slice(0, targetTotal).map((q, idx) => ({ ...q, id: idx + 1 }));
}

function buildAssessmentQuestions(mistakeCounts) {
  const weights = computeCategoryWeights(mistakeCounts);
  const slots = distributeQuestionSlots(weights, 10);
  let questions = selectQuestionsFromBank(slots);

  if (questions.length < 10) {
    const allQuestions = COMPETENCY_CATEGORIES.flatMap((cat) => localQuestionBank[cat] || []);
    const usedTexts = new Set(questions.map((q) => q.question));
    for (const q of allQuestions.sort(() => Math.random() - 0.5)) {
      if (questions.length >= 10) break;
      if (!usedTexts.has(q.question)) {
        usedTexts.add(q.question);
        questions.push({ ...q });
      }
    }
  }

  return balanceDifficulty(questions, 10);
}

module.exports = {
  COMPETENCY_CATEGORIES,
  MISTAKE_TO_CATEGORY,
  localQuestionBank,
  normalizeDifficulty,
  computeCategoryWeights,
  buildAssessmentQuestions,
};
