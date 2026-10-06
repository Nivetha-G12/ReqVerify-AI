const { getDb, getNextSequence } = require('./db');

async function seed() {
  try {
    const db = await getDb();
    const requirements = db.collection('requirements');

    const newId = await getNextSequence('requirements');

    const reqDoc = {
      id: newId,
      title: 'Example: Order Checkout Failure Handling',
      client_name: 'Demo Client Ltd',
      description: `When a payment gateway returns an error, the checkout flow shall display a clear error message to the user, retry the payment request up to 2 times, and persist the failed transaction details in the error log for support. The system shall not charge the user more than once for the same order. Acceptance Criteria: (1) On gateway timeout, user sees "Payment failed — please try again" and may retry; (2) The system retries automatically up to 2 times with exponential backoff; (3) Failed attempts are logged with order id, timestamp, and gateway response; (4) No duplicate charges are created for the same payment reference.`,
      pdf_path: null,
      status: 'pending_validation',
      created_by: 1,
      assigned_to: null,
      version: 1,
      parent_id: null,
      created_at: new Date(),
    };

    const res = await requirements.insertOne(reqDoc);
    console.log('Inserted requirement with id:', reqDoc.id, 'mongo _id:', res.insertedId);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
