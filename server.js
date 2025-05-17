const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const userRoutes = require('./routes/userRoutes');
const chatbotRoutes = require('./routes/chatBotRoute');
const contactRoutes = require('./routes/contactRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');
const Contact = require('./models/Contact');

// Load environment variables
dotenv.config();

// Initialize app and server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3005'],
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.log('❌ No token provided in socket handshake');
    return next(new Error('Authentication error'));
  }

  if (!process.env.JWT_SECRET) {
    console.log('❌ JWT_SECRET not defined in .env');
    return next(new Error('Server configuration error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    console.log('✅ Socket authenticated for user:', decoded.id);
    next();
  } catch (err) {
    console.log('❌ JWT verification failed:', err.message);
    return next(new Error('Authentication error'));
  }
});

// Socket.IO Chat Logic
io.on('connection', (socket) => {
  console.log('🔌 New socket connected:', socket.id, 'for user:', socket.user.id);

  // Join user to their unique room
  socket.on('joinRoom', ({ userId }) => {
    if (userId !== socket.user.id) {
      console.log('❌ User ID mismatch in joinRoom');
      return;
    }
    socket.join(userId);
    console.log(`✅ User ${userId} joined their room`);
  });

  // Handle sending messages
  socket.on('sendMessage', async ({ senderId, receiverId, text }) => {
    if (!senderId || !receiverId || !text) {
      console.error('❌ Missing fields in message payload');
      return;
    }

    if (senderId !== socket.user.id) {
      console.error('❌ Unauthorized message attempt');
      return;
    }

    try {
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        text
      });

      const savedMessage = await message.save();
      
      // Populate sender information
      const populatedMessage = await Message.populate(savedMessage, {
        path: 'sender',
        select: 'name profilePic'
      });

      // Emit to both sender and receiver
      io.to(receiverId).emit('receiveMessage', populatedMessage);
      io.to(senderId).emit('receiveMessage', populatedMessage);
      
      console.log('📦 Message saved and delivered');
    } catch (err) {
      console.error('❌ Failed to save message:', err);
    }
  });

  // Handle typing indicator
  socket.on('typing', ({ receiverId, senderId }) => {
    if (!receiverId || !senderId) return;
    io.to(receiverId).emit('typing', { senderId });
    console.log(`✏️ User ${senderId} is typing to ${receiverId}`);
  });

  socket.on('stopTyping', ({ receiverId, senderId }) => {
    if (!receiverId || !senderId) return;
    io.to(receiverId).emit('stopTyping', { senderId });
    console.log(`🛑 User ${senderId} stopped typing to ${receiverId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3005'],
  credentials: true,
}));
app.use(express.json());

// Static folder for profile pics
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/messages', messageRoutes);


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});