const { connect, getCollection } = require('./db');

async function test() {
  try {
    const db = await connect();
    console.log('Successfully connected to MongoDB.');

    const usersCollection = await getCollection('users');
    const emp = await usersCollection.findOne({ id: 2, role: 'qa_analyst' });
    console.log('Employee Harini:', emp);

    const collections = {
      requirementsCollection: await getCollection('requirements'),
      reportsCollection: await getCollection('validation_reports'),
      assessmentsCollection: await getCollection('competency_assessments'),
      mistakesCollection: await getCollection('mistake_logs'),
      attemptsCollection: await getCollection('quiz_attempts'),
    };

    console.log('Running buildEmployeeStats checks manually...');
    
    const assignedCount = await collections.requirementsCollection.countDocuments({ assigned_to: emp.id });
    const submittedCount = await collections.reportsCollection.countDocuments({ qa_analyst_id: emp.id });
    const approvedCount = await collections.reportsCollection.countDocuments({ qa_analyst_id: emp.id, status: 'approved' });
    const qaMistakeCount = await collections.reportsCollection.countDocuments({
      qa_analyst_id: emp.id,
      $or: [{ status: 'qa_rejected' }, { admin_decision: 'reject_qa' }],
    });
    const returnedToClientCount = await collections.reportsCollection.countDocuments({
      qa_analyst_id: emp.id,
      $or: [{ status: 'returned_to_client' }, { admin_decision: 'return_client' }],
    });

    console.log('Counts:', { assignedCount, submittedCount, approvedCount, qaMistakeCount, returnedToClientCount });

    const avgScoreResult = await collections.assessmentsCollection
      .aggregate([
        { $match: { qa_analyst_id: emp.id, status: 'completed', score: { $exists: true } } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } },
      ])
      .toArray();
    console.log('avgScoreResult:', avgScoreResult);

    const mistakesRes = await collections.mistakesCollection
      .aggregate([
        { $match: { qa_analyst_id: emp.id } },
        { $group: { _id: '$mistake_type', count: { $sum: '$frequency' } } },
      ])
      .toArray();
    console.log('mistakesRes:', mistakesRes);

    const assessmentsRes = await collections.assessmentsCollection
      .find({ qa_analyst_id: emp.id })
      .project({ _id: 0 })
      .sort({ created_at: -1 })
      .toArray();
    console.log('assessmentsRes count:', assessmentsRes.length);

    const attempts = await collections.attemptsCollection
      .find({ qa_analyst_id: emp.id })
      .sort({ completed_at: -1 })
      .project({ _id: 0 })
      .toArray();
    console.log('attempts count:', attempts.length);

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error during test query:', error);
    process.exit(1);
  }
}

test();
