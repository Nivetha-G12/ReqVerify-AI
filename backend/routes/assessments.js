const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const db = require('../db');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  COMPETENCY_CATEGORIES,
  MISTAKE_TO_CATEGORY,
  buildAssessmentQuestions,
  normalizeDifficulty,
} = require('../data/questionBank');

const ASSESSMENT_QUESTION_COUNT = 10;

const apiKey = process.env.OPENAI_API_KEY;
let openai;
if (apiKey) {
  openai = new OpenAI({ apiKey });
} else {
  console.warn('WARNING: OPENAI_API_KEY not found in environment. Running AI Engine in fallback mock mode.');
}

async function getMistakeCountsByCategory(analystId) {
  const mistakesCollection = await db.getCollection('mistake_logs');
  const mistakesRes = await mistakesCollection
    .aggregate([
      { $match: { qa_analyst_id: analystId } },
      { $group: { _id: '$mistake_type', count: { $sum: '$frequency' } } },
    ])
    .toArray();

  const counts = {};
  for (const row of mistakesRes) {
    counts[row._id] = row.count;
  }
  return counts;
}

async function generateQuestionsWithAI(analyst, finalCategory, assessmentType, mistakeCounts, categoryDistribution) {
  const weaknessSummary = Object.entries(mistakeCounts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ') || 'No prior mistakes recorded';

  const distributionSummary = Object.entries(categoryDistribution)
    .map(([cat, count]) => `${cat}: ${count} questions`)
    .join(', ');

  const systemPrompt = `You are an expert SQA tutor. Generate exactly ${ASSESSMENT_QUESTION_COUNT} unique scenario-based multiple-choice questions for a QA Analyst competency assessment.

Assessment type: "${assessmentType}"
Primary focus category: "${finalCategory}"
Category distribution: ${distributionSummary}
Analyst weakness patterns: ${weaknessSummary}

Rules:
- Each question must be scenario-based and relevant to requirement validation.
- Include a balanced mix: 3 easy, 4 medium, 3 challenging questions.
- No duplicate questions within the assessment.
- Draw from these categories: ${COMPETENCY_CATEGORIES.join(', ')}.
- Weight questions toward categories where the analyst has frequent mistakes.

Respond ONLY with valid JSON (no markdown):
{
  "questions": [
    {
      "id": 1,
      "question": "Scenario text...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why correct",
      "difficultyLevel": "easy|medium|hard",
      "competencyCategory": "Category Name"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: systemPrompt }],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  });

  const rawJson = JSON.parse(response.choices[0].message.content);
  const questions = (rawJson.questions || []).slice(0, ASSESSMENT_QUESTION_COUNT);

  const seen = new Set();
  const unique = [];
  for (const q of questions) {
    if (!q.question || seen.has(q.question)) continue;
    seen.add(q.question);
    unique.push({
      ...q,
      difficultyLevel: normalizeDifficulty(q.difficultyLevel),
      competencyCategory: q.competencyCategory || finalCategory,
    });
  }

  if (unique.length < ASSESSMENT_QUESTION_COUNT) {
    const fallback = buildAssessmentQuestions(mistakeCounts);
    for (const q of fallback) {
      if (unique.length >= ASSESSMENT_QUESTION_COUNT) break;
      if (!seen.has(q.question)) {
        seen.add(q.question);
        unique.push(q);
      }
    }
  }

  return unique.slice(0, ASSESSMENT_QUESTION_COUNT).map((q, idx) => ({ ...q, id: idx + 1 }));
}

function computeCategoryScores(questions, answers) {
  const scores = {};
  for (const q of questions) {
    const cat = q.competencyCategory || 'General';
    if (!scores[cat]) scores[cat] = { correct: 0, total: 0 };
    scores[cat].total += 1;
    const submitted = answers[q.id];
    if (submitted !== undefined && parseInt(submitted, 10) === q.correctAnswer) {
      scores[cat].correct += 1;
    }
  }

  const result = {};
  for (const [cat, data] of Object.entries(scores)) {
    result[cat] = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
  }
  return result;
}

router.get('/recommendations', protect, restrictTo('admin'), async (req, res) => {
  try {
    const result = await db.getCollection('mistake_logs').then((mistakesCollection) =>
      mistakesCollection.aggregate([
        { $group: { _id: { qa_analyst_id: '$qa_analyst_id', mistake_type: '$mistake_type' }, reqCount: { $sum: '$frequency' } } },
        { $match: { reqCount: { $gte: 3 } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id.qa_analyst_id',
            foreignField: 'id',
            as: 'qa_user',
          },
        },
        { $unwind: '$qa_user' },
        {
          $project: {
            qa_analyst_id: '$_id.qa_analyst_id',
            qa_username: '$qa_user.username',
            mistake_type: '$_id.mistake_type',
            req_count: '$reqCount',
          },
        },
      ]).toArray()
    );

    const recommendations = result.map((r) => ({
      qaAnalystId: r.qa_analyst_id,
      qaUsername: r.qa_username,
      mistakeType: r.mistake_type,
      reqCount: parseInt(r.req_count, 10),
      recommendedCategory: MISTAKE_TO_CATEGORY[r.mistake_type] || 'Requirement Completeness',
      trainingAction: `Assign a ${MISTAKE_TO_CATEGORY[r.mistake_type] || 'Requirement Completeness'} competency assessment`,
    }));

    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching competency recommendations:', error);
    res.status(500).json({ message: 'Server error while fetching competency recommendations' });
  }
});

router.post('/generate', protect, restrictTo('admin'), async (req, res) => {
  const { qaAnalystId, category, assessmentType } = req.body;

  if (!qaAnalystId || !assessmentType) {
    return res.status(400).json({ message: 'QA Analyst ID and assessment type are required' });
  }

  const type = assessmentType;
  const analystId = Number(qaAnalystId);
  if (Number.isNaN(analystId)) {
    return res.status(400).json({ message: 'Invalid QA Analyst ID' });
  }

  try {
    const usersCollection = await db.getCollection('users');
    const assessmentsCollection = await db.getCollection('competency_assessments');

    const analyst = await usersCollection.findOne({ id: analystId, role: 'qa_analyst' });
    if (!analyst) {
      return res.status(404).json({ message: 'QA Analyst not found' });
    }

    const mistakeCounts = await getMistakeCountsByCategory(analystId);

    let finalCategory = category;
    if (!finalCategory) {
      const sorted = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        finalCategory = MISTAKE_TO_CATEGORY[sorted[0][0]] || 'Requirement Completeness';
      } else {
        finalCategory = 'Requirement Completeness';
      }
    }

    const categoryDistribution = buildAssessmentQuestions(mistakeCounts).reduce((acc, q) => {
      const cat = q.competencyCategory;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    let questions;
    if (openai && process.env.OPENAI_API_KEY) {
      try {
        questions = await generateQuestionsWithAI(analyst, finalCategory, type, mistakeCounts, categoryDistribution);
      } catch (apiError) {
        console.error('OpenAI failed, falling back to local bank:', apiError.message);
        questions = buildAssessmentQuestions(mistakeCounts);
      }
    } else {
      questions = buildAssessmentQuestions(mistakeCounts);
    }

    if (questions.length !== ASSESSMENT_QUESTION_COUNT) {
      questions = buildAssessmentQuestions(mistakeCounts);
    }

    const title = `${finalCategory} - ${type.replace(/_/g, ' ')} Assessment (${ASSESSMENT_QUESTION_COUNT} Questions)`;
    const newId = await db.getNextSequence('competency_assessments');

    const assessment = {
      id: newId,
      qa_analyst_id: analystId,
      title,
      category: finalCategory,
      assessment_type: type,
      question_count: ASSESSMENT_QUESTION_COUNT,
      category_distribution: categoryDistribution,
      weakness_profile: mistakeCounts,
      questions,
      status: 'assigned',
      created_at: new Date(),
    };

    await assessmentsCollection.insertOne(assessment);
    const created = await assessmentsCollection.findOne({ id: newId }, { projection: { _id: 0 } });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error generating competency assessment:', error);
    res.status(500).json({ message: 'Server error while generating competency assessment' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const assessmentsCollection = await db.getCollection('competency_assessments');
    const filter = {};
    if (req.user.role === 'qa_analyst') {
      filter.qa_analyst_id = req.user.id;
    }

    const assessments = await assessmentsCollection
      .aggregate([
        { $match: filter },
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
            qa_username: { $arrayElemAt: ['$qa_user.username', 0] },
          },
        },
        { $project: { qa_user: 0, _id: 0 } },
        { $sort: { created_at: -1 } },
      ])
      .toArray();

    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Server error while fetching assessments' });
  }
});

router.get('/history/:analystId', protect, async (req, res) => {
  const analystId = parseInt(req.params.analystId, 10);
  if (!analystId) {
    return res.status(400).json({ message: 'Invalid analyst ID' });
  }

  if (req.user.role === 'qa_analyst' && req.user.id !== analystId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const attemptsCollection = await db.getCollection('quiz_attempts');
    const assessmentsCollection = await db.getCollection('competency_assessments');

    const attempts = await attemptsCollection
      .find({ qa_analyst_id: analystId })
      .sort({ completed_at: -1 })
      .project({ _id: 0 })
      .toArray();

    const assessments = await assessmentsCollection
      .find({ qa_analyst_id: analystId, status: 'completed' })
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

    res.json({
      attempts,
      completedAssessments: assessments,
      categoryTrends,
      improvementPercentage,
      totalAttempts: attempts.length,
    });
  } catch (error) {
    console.error('Error fetching competency history:', error);
    res.status(500).json({ message: 'Server error while fetching competency history' });
  }
});

router.get('/:id', protect, async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (!assessmentId) {
    return res.status(400).json({ message: 'Invalid assessment ID' });
  }

  try {
    const assessmentsCollection = await db.getCollection('competency_assessments');
    const assessment = await assessmentsCollection.findOne({ id: assessmentId }, { projection: { _id: 0 } });
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (req.user.role === 'qa_analyst' && assessment.qa_analyst_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not your assessment' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment detail:', error);
    res.status(500).json({ message: 'Server error while fetching assessment details' });
  }
});

router.post('/:id/submit', protect, restrictTo('qa_analyst'), async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: 'Answers object is required' });
  }

  try {
    const assessmentsCollection = await db.getCollection('competency_assessments');
    const attemptsCollection = await db.getCollection('quiz_attempts');

    const assessment = await assessmentsCollection.findOne({ id: assessmentId });
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (assessment.qa_analyst_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not assigned to you' });
    }

    if (assessment.status === 'completed') {
      return res.status(400).json({ message: 'Assessment has already been completed' });
    }

    const questions = assessment.questions;
    let correctCount = 0;
    const totalCount = questions.length;

    questions.forEach((q) => {
      const submittedAnswer = answers[q.id];
      if (submittedAnswer !== undefined && parseInt(submittedAnswer, 10) === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalCount) * 100);
    const categoryScores = computeCategoryScores(questions, answers);

    const previousAttempt = await attemptsCollection.findOne(
      { qa_analyst_id: req.user.id },
      { sort: { completed_at: -1 } }
    );
    const improvementFromPrevious = previousAttempt
      ? score - (previousAttempt.score || 0)
      : null;

    let recommendations = '';
    const weakCategories = Object.entries(categoryScores)
      .filter(([, s]) => s < 70)
      .map(([cat]) => cat);

    if (openai && process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an SQA Trainer. Write a brief, encouraging 2-3 sentence improvement recommendation for a QA analyst based on their quiz score, category, and weak areas. Be constructive.',
            },
            {
              role: 'user',
              content: `Score: ${score}% on ${totalCount}-question quiz in "${assessment.category}". Weak categories: ${weakCategories.join(', ') || 'none'}.`,
            },
          ],
          temperature: 0.7,
        });
        recommendations = response.choices[0].message.content.trim();
      } catch (apiError) {
        console.error('Failed to generate recommendations:', apiError.message);
      }
    }

    if (!recommendations) {
      if (score === 100) {
        recommendations = `Outstanding performance in ${assessment.category}! Continue applying these standards to daily validations.`;
      } else if (score >= 75) {
        recommendations = `Good progress in ${assessment.category}. Review missed scenarios in ${weakCategories.join(', ') || 'all categories'} to strengthen edge-case detection.`;
      } else if (score >= 50) {
        recommendations = `Passing score with room for improvement. Focus retraining on ${weakCategories.join(', ') || assessment.category} — review organizational validation standards.`;
      } else {
        recommendations = `Score below passing threshold. Prioritize retraining in ${weakCategories.join(', ') || assessment.category}. Review answer explanations and practice clarifying vague requirements.`;
      }
    }

    const attemptId = await db.getNextSequence('quiz_attempts');
    const completedAt = new Date();

    await attemptsCollection.insertOne({
      id: attemptId,
      assessment_id: assessmentId,
      qa_analyst_id: req.user.id,
      answers,
      score,
      category_scores: categoryScores,
      improvement_from_previous: improvementFromPrevious,
      completed_at: completedAt,
    });

    const updateResult = await assessmentsCollection.findOneAndUpdate(
      { id: assessmentId },
      {
        $set: {
          status: 'completed',
          answers,
          score,
          category_scores: categoryScores,
          improvement_from_previous: improvementFromPrevious,
          improvement_recommendations: recommendations,
          completed_at: completedAt,
        },
      },
      { returnDocument: 'after' }
    );

    res.json({ ...updateResult.value, attempt_id: attemptId });
  } catch (error) {
    console.error('Error submitting assessment answers:', error);
    res.status(500).json({ message: 'Server error while submitting assessment answers' });
  }
});

module.exports = router;
