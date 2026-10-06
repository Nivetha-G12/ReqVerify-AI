const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { getCollection, getNextSequence, parseNumericId } = require('../db');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'application/pdf';
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported!'));
    }
  },
});

function formatRequirementCode(requirement) {
  const rootId = requirement.root_requirement_id || requirement.parent_id || requirement.id;
  return `REQ-${String(rootId).padStart(3, '0')} V${requirement.version || 1}`;
}

function buildChangeNote(description, fallback) {
  if (!description) return fallback;
  return description.length > 180 ? `${description.slice(0, 180)}...` : description;
}

function buildRequirementPipeline(match = {}) {
  return [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'assigned_to',
        foreignField: 'id',
        as: 'assigned_to_user',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: 'id',
        as: 'created_by_user',
      },
    },
    {
      $addFields: {
        assigned_to_username: { $arrayElemAt: ['$assigned_to_user.username', 0] },
        created_by_username: { $arrayElemAt: ['$created_by_user.username', 0] },
      },
    },
    { $project: { assigned_to_user: 0, created_by_user: 0, _id: 0 } },
  ];
}

router.post('/', protect, restrictTo('admin'), upload.single('pdf'), async (req, res) => {
  const { title, clientName, description } = req.body;

  if (!title || !clientName) {
    return res.status(400).json({ message: 'Title and client name are required' });
  }

  try {
    let finalDescription = description || '';
    let pdfPath = null;

    if (req.file) {
      pdfPath = `/uploads/${req.file.filename}`;
      const dataBuffer = fs.readFileSync(req.file.path);
      const parsedData = await pdfParse(dataBuffer);
      const parsedText = parsedData.text.trim();
      if (parsedText.length > 0) {
        finalDescription = finalDescription
          ? `[Admin Description]: ${finalDescription}\n\n[Extracted PDF Content]:\n${parsedText}`
          : parsedText;
      } else if (!finalDescription) {
        finalDescription = 'Empty PDF document uploaded. No text could be extracted.';
      }
    }

    const requirementsCollection = await getCollection('requirements');
    const newId = await getNextSequence('requirements');
    const newRequirement = {
      id: newId,
      root_requirement_id: newId,
      title,
      client_name: clientName,
      description: finalDescription,
      pdf_path: pdfPath,
      status: 'pending_validation',
      created_by: req.user.id,
      assigned_to: null,
      version: 1,
      parent_id: null,
      submitted_by: req.user.id,
      change_notes: 'Initial requirement submission.',
      return_reason: null,
      admin_feedback: null,
      returned_at: null,
      archived_at: null,
      created_at: new Date(),
    };

    await requirementsCollection.insertOne(newRequirement);
    res.status(201).json(newRequirement);
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ message: 'Server error while creating requirement: ' + error.message });
  }
});

router.get('/', protect, async (req, res) => {
  const { status, client, search } = req.query;

  try {
    const requirementsCollection = await getCollection('requirements');
    const filter = {};

    if (req.user.role === 'qa_analyst') {
      filter.assigned_to = req.user.id;
    }

    if (status) {
      filter.status = status;
    }

    if (client) {
      filter.client_name = { $regex: client, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const requirements = await requirementsCollection
      .aggregate([...buildRequirementPipeline(filter), { $sort: { created_at: -1 } }])
      .toArray();

    res.json(requirements.map((req) => ({ ...req, requirement_code: formatRequirementCode(req) })));
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ message: 'Server error while fetching requirements' });
  }
});

router.get('/client/returned', protect, async (req, res) => {
  try {
    const requirementsCollection = await getCollection('requirements');
    const returned = await requirementsCollection
      .aggregate([
        ...buildRequirementPipeline({ status: 'returned_to_client' }),
        { $sort: { returned_at: -1, created_at: -1 } },
      ])
      .toArray();

    res.json(returned.map((req) => ({ ...req, requirement_code: formatRequirementCode(req) })));
  } catch (error) {
    console.error('Error fetching client returned requirements:', error);
    res.status(500).json({ message: 'Server error while fetching returned requirements' });
  }
});

router.get('/:id/versions', protect, async (req, res) => {
  const requirementId = parseNumericId(req.params.id);
  if (!requirementId) {
    return res.status(400).json({ message: 'Invalid requirement ID' });
  }

  try {
    const requirementsCollection = await getCollection('requirements');
    const current = await requirementsCollection.findOne({ id: requirementId });
    if (!current) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const rootId = current.root_requirement_id || current.parent_id || current.id;
    const versions = await requirementsCollection
      .aggregate([
        ...buildRequirementPipeline({
          $or: [
            { root_requirement_id: rootId },
            { id: rootId },
            { parent_id: rootId },
          ],
        }),
        { $sort: { version: 1, created_at: 1 } },
      ])
      .toArray();

    res.json(versions.map((req) => ({ ...req, requirement_code: formatRequirementCode(req) })));
  } catch (error) {
    console.error('Error fetching requirement versions:', error);
    res.status(500).json({ message: 'Server error while fetching requirement versions' });
  }
});

router.get('/:id', protect, async (req, res) => {
  const requirementId = parseNumericId(req.params.id);
  if (!requirementId) {
    return res.status(400).json({ message: 'Invalid requirement ID' });
  }

  try {
    const requirementsCollection = await getCollection('requirements');
    const results = await requirementsCollection
      .aggregate(buildRequirementPipeline({ id: requirementId }))
      .toArray();

    if (results.length === 0) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const requirement = results[0];
    if (req.user.role === 'qa_analyst' && requirement.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not assigned to this requirement' });
    }

    res.json({ ...requirement, requirement_code: formatRequirementCode(requirement) });
  } catch (error) {
    console.error('Error fetching requirement detail:', error);
    res.status(500).json({ message: 'Server error while fetching requirement details' });
  }
});

router.put('/:id/assign', protect, restrictTo('admin'), async (req, res) => {
  const assignedTo = parseNumericId(req.body.assignedTo);
  const requirementId = parseNumericId(req.params.id);

  if (!assignedTo) {
    return res.status(400).json({ message: 'Please specify an analyst ID to assign' });
  }

  try {
    const usersCollection = await getCollection('users');
    const analyst = await usersCollection.findOne({ id: assignedTo, role: 'qa_analyst' });
    if (!analyst) {
      return res.status(400).json({ message: 'Invalid Analyst: User is not a QA analyst' });
    }

    const requirementsCollection = await getCollection('requirements');
    const updateResult = await requirementsCollection.findOneAndUpdate(
      { id: requirementId },
      { $set: { assigned_to: assignedTo, status: 'under_validation' } },
      { returnDocument: 'after' }
    );

    if (!updateResult.value) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    res.json(updateResult.value);
  } catch (error) {
    console.error('Error assigning requirement:', error);
    res.status(500).json({ message: 'Server error during requirement assignment' });
  }
});

router.post('/:id/revise', protect, upload.single('pdf'), async (req, res) => {
  const requirementId = parseNumericId(req.params.id);
  const { title, clientName, description } = req.body;

  if (!['admin', 'client'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only Admins or Clients can submit requirement revisions' });
  }

  try {
    const requirementsCollection = await getCollection('requirements');
    const parent = await requirementsCollection.findOne({ id: requirementId });
    if (!parent) {
      return res.status(404).json({ message: 'Parent requirement not found' });
    }

    let finalDescription = description || parent.description;
    let pdfPath = parent.pdf_path;
    const nextVersion = (parent.version || 1) + 1;
    const rootId = parent.root_requirement_id || parent.parent_id || parent.id;

    if (req.file) {
      pdfPath = `/uploads/${req.file.filename}`;
      const dataBuffer = fs.readFileSync(req.file.path);
      const parsedData = await pdfParse(dataBuffer);
      const parsedText = parsedData.text.trim();
      if (parsedText.length > 0) {
        finalDescription = description
          ? `[Admin Notes]: ${description}\n\n[Extracted PDF Content]:\n${parsedText}`
          : parsedText;
      }
    }

    const newId = await getNextSequence('requirements');
    const newRequirement = {
      id: newId,
      root_requirement_id: rootId,
      title: title || parent.title,
      client_name: clientName || parent.client_name,
      description: finalDescription,
      pdf_path: pdfPath,
      status: 'resubmitted',
      assigned_to: null,
      created_by: req.user.id,
      submitted_by: req.user.id,
      version: nextVersion,
      parent_id: parent.id,
      change_notes: buildChangeNote(description, `Client resubmitted ${formatRequirementCode(parent)} as version ${nextVersion}.`),
      return_reason: null,
      admin_feedback: null,
      returned_at: null,
      archived_at: null,
      created_at: new Date(),
    };

    await requirementsCollection.insertOne(newRequirement);
    await requirementsCollection.updateOne(
      { id: parent.id },
      { $set: { status: 'archived_version', archived_at: new Date() } }
    );
    res.status(201).json({ ...newRequirement, requirement_code: formatRequirementCode(newRequirement) });
  } catch (error) {
    console.error('Error revising requirement:', error);
    res.status(500).json({ message: 'Server error while uploading revised requirement: ' + error.message });
  }
});

router.post('/:id/return-client', protect, restrictTo('admin'), async (req, res) => {
  const requirementId = parseNumericId(req.params.id);
  const { feedback } = req.body;

  try {
    const requirementsCollection = await getCollection('requirements');
    const validationReportsCollection = await getCollection('validation_reports');

    const requirement = await requirementsCollection.findOne({ id: requirementId });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    await requirementsCollection.updateOne(
      { id: requirementId },
      {
        $set: {
          status: 'returned_to_client',
          return_reason: 'Admin returned requirement to client',
          admin_feedback: feedback || 'Returned to client for revision.',
          returned_at: new Date(),
        },
      }
    );
    await validationReportsCollection.updateMany(
      { requirement_id: requirementId },
      {
        $set: {
          status: 'returned_to_client',
          admin_feedback: feedback || 'Returned to client for revision.',
          admin_decision: 'return_client',
          returned_to_client_at: new Date(),
        },
      }
    );

    res.json({ message: 'Requirement directly returned to client for revision.' });
  } catch (error) {
    console.error('Error returning requirement to client directly:', error);
    res.status(500).json({ message: 'Server error while returning requirement' });
  }
});

module.exports = router;
