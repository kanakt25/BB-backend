const express = require('express');
const router = express.Router();
const User = require('../models/User');
const protect = require('../middleware/AuthMiddleware');
const upload = require('../middleware/uploadMiddleware');
const Message = require('../models/Message');
const mongoose = require('mongoose');

const {
  register,
  login,
  getTeachers,
  updateUserRole,
  updateUserProfile,
} = require('../controllers/userController');

// 🔐 AUTH ROUTES
router.post('/register', register);      
router.post('/login', login);           


// 🧑‍🏫 TEACHER ROUTES
router.get('/teachers', getTeachers);    


// ----------------------
// 🔍 SEARCH ROUTE
// ----------------------
router.get('/search', async (req, res) => {
  const { query, type, subjects, experience, charge } = req.query;

  if (!query || !type) {
    return res.status(400).json({ success: false, message: 'Query and type are required' });
  }

  let searchCriteria = {};

  switch (type) {
    case 'name':
      searchCriteria.name = { $regex: query, $options: 'i' };
      break;
    case 'subject':
      searchCriteria.subjects = { $regex: query, $options: 'i' };
      break;
    case 'department':
    case 'center': 
      searchCriteria.department = { $regex: query, $options: 'i' };
      break;
    default:
      return res.status(400).json({ success: false, message: 'Invalid search type' });
  }

  if (experience) {
    searchCriteria.experience = { $gte: Number(experience) };
  }

  if (charge) {
    searchCriteria.charge = charge; 
  }

  try {
    const results = await User.find({
      role: { $in: ['Teacher'] },
      ...searchCriteria,
    }).select('-password');

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 👤 USER PROFILE ROUTES
router.put('/update-role', protect, updateUserRole); // Toggle Teacher/Student roles
router.put('/update-profile', protect, upload.single('profilePic'), updateUserProfile); // Update name, bio, subjects, etc.


// Get a specific user by ID (e.g., for profile viewing)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing user ID' });
  }

  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


module.exports = router;
