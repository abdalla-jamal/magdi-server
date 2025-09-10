const express = require('express');
const router = express.Router();
const { shareViaEmail } = require('../controllers/shareController');

// Share via Email
router.post('/email', shareViaEmail);

module.exports = router;


