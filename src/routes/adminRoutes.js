// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const protect = require('../middleware/authMiddleware');
const superAdminProtect = require('../middleware/superAdminMiddleware');

// Public routes
router.post('/login', adminController.loginAdmin);

// Protected routes (للأدمن العادي والسوبر أدمن)
router.post('/logout', protect, adminController.logoutAdmin);
router.patch('/surveys/:id/status', protect, adminController.updateSurveyStatus);
router.patch('/change-password', protect, adminController.changePassword);

// Super admin routes (للسوبر أدمن فقط)
router.post('/create', protect, superAdminProtect, adminController.createAdmin);
router.get('/list', protect, superAdminProtect, adminController.listAdmins);
router.delete('/:id', protect, superAdminProtect, adminController.deleteAdmin);

module.exports = router;
