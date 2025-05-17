const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getConversations
} = require('../controllers/messageController');
const protect = require('../middleware/AuthMiddleware');

// POST route to send a message
router.post('/', protect, sendMessage);

// ✅ Conversations route must come before generic ID route
router.get('/conversations/list', protect, getConversations);


// GET messages with a specific user
router.get('/:receiverId', protect, getMessages);

module.exports = router;
