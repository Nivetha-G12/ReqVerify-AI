const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const seedChecklist = [
  { text: 'Requirement must be clear.', desc: 'Avoid qualitative descriptors, pronouns, and vague terms. Ensure there is only one interpretation.' },
  { text: 'Requirement must be complete.', desc: 'All workflows, system boundaries, and necessary context must be fully documented.' },
  { text: 'Requirement must be consistent.', desc: 'Must not conflict with other requirements, terms, or definitions in the same document.' },
  { text: 'Requirement must be testable.', desc: 'Must have objective, measurable criteria to verify compliance (e.g., specific response times).' },
  { text: 'Requirement must include acceptance criteria.', desc: 'Specify clear parameters or user stories that define successful completion.' },
  { text: 'Requirement must define business rules.', desc: 'Clearly outline constraints, inputs, calculations, and conditional behaviors.' },
  { text: 'Requirement must include validation rules.', desc: 'Specify inputs formats, bounds, validation triggers, and data constraints.' },
  { text: 'Requirement must define exception handling.', desc: 'Outline system behaviors and error states when boundary checks fail or exceptions occur.' },
];

async function initDb() {
  try {
    const db = await getDb();

    const collections = ['users', 'requirements', 'checklist_rules', 'validation_reports', 'ai_analyses', 'mistake_logs', 'competency_assessments', 'counters'];
    for (const name of collections) {
      const exists = await db.listCollections({ name }).hasNext();
      if (exists) {
        await db.collection(name).drop();
      }
    }

    const usersCollection = db.collection('users');
    const requirementsCollection = db.collection('requirements');
    const checklistCollection = db.collection('checklist_rules');
    const reportsCollection = db.collection('validation_reports');
    const aiCollection = db.collection('ai_analyses');
    const mistakesCollection = db.collection('mistake_logs');
    const assessmentsCollection = db.collection('competency_assessments');
    const countersCollection = db.collection('counters');

    await usersCollection.createIndex({ id: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 }, { unique: true });

    await checklistCollection.createIndex({ id: 1 }, { unique: true });
    await checklistCollection.createIndex({ rule_text: 1 }, { unique: true });

    await requirementsCollection.createIndex({ id: 1 }, { unique: true });
    await reportsCollection.createIndex({ id: 1 }, { unique: true });
    await aiCollection.createIndex({ id: 1 }, { unique: true });
    await mistakesCollection.createIndex({ id: 1 }, { unique: true });
    await assessmentsCollection.createIndex({ id: 1 }, { unique: true });

    const passwordHashAdmin = await bcrypt.hash('adminpassword', 10);
    const passwordHashQa = await bcrypt.hash('qapassword', 10);
    const passwordHashClient = await bcrypt.hash('clientpassword', 10);

    const users = [
      { id: 1, username: 'Shakshi', email: 'shakshi@reqvalidation.com', password_hash: passwordHashAdmin, role: 'admin', employee_id: 'ADM001', level: null, experience: 0, status: 'Active', created_at: new Date() },
      { id: 2, username: 'Harini', email: 'harini@reqvalidation.com', password_hash: passwordHashQa, role: 'qa_analyst', employee_id: 'QA001', level: 'Lead QA Analyst', experience: 8, status: 'Active', employment_status: 'Full-time', created_at: new Date() },
      { id: 3, username: 'Monika', email: 'monika@reqvalidation.com', password_hash: passwordHashQa, role: 'qa_analyst', employee_id: 'QA002', level: 'Senior QA Analyst', experience: 6, status: 'Active', employment_status: 'Full-time', created_at: new Date() },
      { id: 4, username: 'Vikram', email: 'vikram@reqvalidation.com', password_hash: passwordHashQa, role: 'qa_analyst', employee_id: 'QA003', level: 'Mid-Level QA Analyst', experience: 4, status: 'Active', employment_status: 'Full-time', created_at: new Date() },
      { id: 5, username: 'Arjun', email: 'arjun@reqvalidation.com', password_hash: passwordHashQa, role: 'qa_analyst', employee_id: 'QA004', level: 'Junior QA Analyst', experience: 1, status: 'Active', employment_status: 'Full-time', created_at: new Date() },
      { id: 6, username: 'Maya', email: 'maya@reqvalidation.com', password_hash: passwordHashQa, role: 'qa_analyst', employee_id: 'QA005', level: 'Mid-Level QA Analyst', experience: 4, status: 'Active', employment_status: 'Full-time', created_at: new Date() },
      { id: 7, username: 'Varun', email: 'varun@reqvalidation.com', password_hash: passwordHashQa, role: 'qa_analyst', employee_id: 'QA006', level: 'Senior QA Analyst', experience: 6, status: 'Active', employment_status: 'Full-time', created_at: new Date() },
      { id: 8, username: 'ClientDemo', email: 'client@demo.com', password_hash: passwordHashClient, role: 'client', employee_id: 'CL001', level: null, experience: 0, status: 'Active', created_at: new Date() },
    ];

    await usersCollection.insertMany(users);

    const checklistDocs = seedChecklist.map((rule, index) => ({
      id: index + 1,
      rule_text: rule.text,
      description: rule.desc,
    }));
    await checklistCollection.insertMany(checklistDocs);

    await countersCollection.insertMany([
      { _id: 'users', seq: users.length },
      { _id: 'requirements', seq: 0 },
      { _id: 'checklist_rules', seq: checklistDocs.length },
      { _id: 'validation_reports', seq: 0 },
      { _id: 'ai_analyses', seq: 0 },
      { _id: 'mistake_logs', seq: 0 },
      { _id: 'competency_assessments', seq: 0 },
    ]);

    console.log('Database initialization and seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

initDb();
