// messageController.js
const mongoose = require('mongoose');
const Message = require('../models/Message');

// Function to handle sending a message
const sendMessage = async (req, res) => {
  try {
    const { receiver, text } = req.body;
    const sender = req.user._id;


    // Validate that receiver and text are provided
    if (!receiver || !text) {
      return res.status(400).json({ error: 'Receiver ID and message text are required' });
    }
     // Check if receiver is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiver)) {
      return res.status(400).json({ error: 'Invalid receiver ID' });
    }

    // Check if req.user is populated correctly
    if (!req.user || !req.user.id) {
      return res.status(400).json({ error: 'User not authenticated' });
    }

    // Create the message
    const message = new Message({
      sender: req.user.id,
      receiver: new mongoose.Types.ObjectId(receiver),
      text,
    });

    const savedMessage = await message.save();

    // Populate sender and receiver details
    const populatedMessage = await Message.populate(savedMessage, [
      { path: 'sender', select: 'name profilePic' },
      { path: 'receiver', select: 'name profilePic' }
    ]);

    // Send response with populated message
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//  getMessages function 
const getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const userId = req.user.id;

     // Validate receiverId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: 'Invalid receiver ID' });
    }

    // Fetch messages between the current user and the receiver
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: receiverId },
        { sender: receiverId, receiver: userId }
      ]
    })
      .sort({ createdAt: 1 })  
      .populate('sender', 'name profilePic') 
      .populate('receiver', 'name profilePic'); 

    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all conversations for the logged-in user
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get messages involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name profilePic')
      .populate('receiver', 'name profilePic');

    // Group by the conversation partner
    const conversationsMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.sender._id.toString() === userId.toString()
        ? msg.receiver._id.toString()
        : msg.sender._id.toString();

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, msg);
      }
    });

    const latestConversations = Array.from(conversationsMap.values());

    res.status(200).json(latestConversations);
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};



module.exports = { sendMessage, getMessages, getConversations };