const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const defaultUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.DB_NAME || 'requirement_analysis';

let client;
let database;
let memoryServer;

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

async function seedInitialData(db) {
  const usersCount = await db.collection('users').countDocuments();
  if (usersCount === 0) {
    console.log('Seeding initial database records...');
    const usersCollection = db.collection('users');
    const requirementsCollection = db.collection('requirements');
    const checklistCollection = db.collection('checklist_rules');
    const reportsCollection = db.collection('validation_reports');
    const aiCollection = db.collection('ai_analyses');
    const mistakesCollection = db.collection('mistake_logs');
    const assessmentsCollection = db.collection('competency_assessments');
    const countersCollection = db.collection('counters');

    await usersCollection.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    await usersCollection.createIndex({ username: 1 }, { unique: true }).catch(() => {});
    await usersCollection.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await checklistCollection.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    await checklistCollection.createIndex({ rule_text: 1 }, { unique: true }).catch(() => {});

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

    // Seed sample requirement
    const sampleReq = {
      id: 1,
      root_requirement_id: 1,
      title: 'Order Checkout Failure Handling & Recovery',
      client_name: 'Demo Client Ltd',
      description: `When a payment gateway returns an error or timeout during checkout, the system shall display a descriptive error message to the user, retry the payment request up to 2 times with exponential backoff, and persist the failed transaction details in the error audit log for support operations. The system shall guarantee idempotency so that no duplicate charge occurs for the same order reference.\n\nAcceptance Criteria:\n1. On gateway timeout, the UI displays a retry prompt without clearing cart state.\n2. Automated retries occur maximum 2 times before user confirmation is required.\n3. Failed attempts log timestamp, order ID, gateway response code, and correlation trace ID.\n4. Idempotency key prevents double deduction across duplicate submission attempts.`,
      pdf_path: null,
      status: 'pending_validation',
      version: 1,
      parent_id: null,
      assigned_to: 2,
      created_by: 1,
      created_at: new Date(),
    };
    await requirementsCollection.insertOne(sampleReq);

    await countersCollection.insertMany([
      { _id: 'users', seq: users.length },
      { _id: 'requirements', seq: 1 },
      { _id: 'checklist_rules', seq: checklistDocs.length },
      { _id: 'validation_reports', seq: 0 },
      { _id: 'ai_analyses', seq: 0 },
      { _id: 'mistake_logs', seq: 0 },
      { _id: 'competency_assessments', seq: 0 },
    ]);

    console.log('Database seeded with initial users, checklist rules, and sample requirement.');
  }
}

async function connect() {
  if (database) return database;

  // First try direct connection
  try {
    const directClient = new MongoClient(defaultUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    await directClient.connect();
    client = directClient;
    database = client.db(dbName);
    console.log(`Connected to MongoDB at ${defaultUri}`);
    await seedInitialData(database);
    return database;
  } catch (err) {
    console.warn(`Could not connect to MongoDB at ${defaultUri}: ${err.message}`);
    console.log('Starting embedded MongoMemoryServer fallback...');
  }

  // Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    client = new MongoClient(memoryUri);
    await client.connect();
    database = client.db(dbName);
    console.log(`Embedded MongoDB started successfully at ${memoryUri}`);
    await seedInitialData(database);
    return database;
  } catch (memErr) {
    console.error('Failed to start embedded MongoMemoryServer:', memErr);
    throw memErr;
  }
}

async function getDb() {
  if (!database) {
    await connect();
  }
  return database;
}

async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

async function getNextSequence(name) {
  const db = await getDb();
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = result && (result.value !== undefined ? result.value : result);
  return doc ? doc.seq : 1;
}

function parseNumericId(value) {
  if (value == null) return null;
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

module.exports = {
  connect,
  getDb,
  getCollection,
  getNextSequence,
  parseNumericId,
};
