const express = require('express');
const router = express.Router();
const { handleContactMessage } = require('../controllers/contactController');

// Route to handle contact form submission
router.post('/contact', handleContactMessage);

module.exports = router;
