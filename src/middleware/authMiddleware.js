const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get admin from the token
      req.admin = await Admin.findById(decoded.id).select('-password');

      if (!req.admin) {
        return res.status(401).json({ message: 'غير مصرح لك بالدخول' });
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'غير مصرح لك بالدخول' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'غير مصرح لك بالدخول، توكن غير موجود' });
  }
};

module.exports = protect; 