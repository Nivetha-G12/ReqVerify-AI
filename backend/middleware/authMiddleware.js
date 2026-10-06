const jwt = require('jsonwebtoken');
const { getCollection, parseNumericId } = require('../db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'requirement_analysis_jwt_secret_token_key_2026');
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne(
      { id: parseNumericId(decoded.id) },
      { projection: { _id: 0, id: 1, username: 1, email: 1, role: 1, experience: 1 } }
    );

    if (!user) {
      return res.status(401).json({ message: 'User belonging to this token no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
