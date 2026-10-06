const express = require('express');
const router = express.Router();
const { getCollection } = require('../db');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const checklistCollection = await getCollection('checklist_rules');
    const rules = await checklistCollection
      .find({}, { projection: { _id: 0, id: 1, rule_text: 1, description: 1 } })
      .sort({ id: 1 })
      .toArray();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching checklist rules:', error);
    res.status(500).json({ message: 'Server error while fetching checklist rules' });
  }
});

module.exports = router;
