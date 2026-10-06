const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCollection, getNextSequence } = require('../db');
const { protect } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'requirement_analysis_jwt_secret_token_key_2026';

router.post('/register', async (req, res) => {
  const { username, email, password, role, experience } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const usersCollection = await getCollection('users');
    const userExists = await usersCollection.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const expYears = role === 'qa_analyst' ? parseInt(experience || '0', 10) : 0;
    const newId = await getNextSequence('users');

    const newUser = {
      id: newId,
      username,
      email,
      password_hash: passwordHash,
      role,
      experience: expYears,
      created_at: new Date(),
    };

    await usersCollection.insertOne(newUser);

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        experience: newUser.experience,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  try {
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        experience: user.experience,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
