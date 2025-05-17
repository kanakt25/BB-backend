const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Generate JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Enhanced password validation
const validatePassword = (password) => {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
};

// REGISTER USER
exports.register = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    bio,
    department,
    experience,
    qualification,
    course,
    interestedSubjects,
    availability,
    charge
  } = req.body;

  try {
    // Input validation
    if (!name || !email || !password || !role?.length || !department) {
      return res.status(400).json({ msg: 'Please fill all required fields' });
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@jnu\.ac\.in$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Only @jnu.ac.in email addresses are allowed' });
    }

    // Password validation
    try {
      validatePassword(password);
    } catch (error) {
      return res.status(400).json({ msg: error.message });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash the password with enhanced logging
    const cleanPassword = password.trim();

    // Create new user
    const newUser = new User({
      name,
      email,
      password: cleanPassword,
      role,
      bio,
      department,
      profilePic: '',
      subjects: [],
      availability: availability || '',
      qualification: qualification || '',
      experience: experience || '',
      charge: charge || '',
      course: course || '',
      interests: interestedSubjects ? interestedSubjects.split(',').map(s => s.trim()) : [],
      students: [],
      teachers: [],
      ratings: [],
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id);

    // Return response without sensitive data
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      bio: newUser.bio,
      department: newUser.department,
      profilePic: newUser.profilePic,
      qualification: newUser.qualification,
      experience: newUser.experience,
      charge: newUser.charge,
      course: newUser.course,
      subjects: newUser.subjects,
      availability: newUser.availability,
      students: newUser.students,
      teachers: newUser.teachers,
      ratings: newUser.ratings
    };

    res.status(201).json({
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      msg: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please provide both email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();


    // Find user
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      console.log('User not found for email:', cleanEmail);
      return res.status(400).json({ msg: 'Invalid credentials' }); // Generic message for security
    }

    // Password comparison with detailed logging
    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Prepare user response without sensitive data
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      department: user.department,
      profilePic: user.profilePic,
      qualification: user.qualification,
      experience: user.experience,
      charge: user.charge,
      course: user.course,
      subjects: user.subjects,
      availability: user.availability,
      students: user.students,
      teachers: user.teachers,
      ratings: user.ratings
    };

    res.status(200).json({
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      msg: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// GET ALL TEACHERS
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: { $in: ['Teacher'] } })
      .select('-password -__v -createdAt -updatedAt');
    res.status(200).json(teachers);
  } catch (err) {
    console.error('Get teachers error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// SEARCH TEACHERS
exports.searchTeachers = async (req, res) => {
  const { query, type } = req.query;

  try {
    if (!query || !type) {
      return res.status(400).json({ msg: 'Both query and type are required' });
    }

    const regex = new RegExp(query, 'i');
    let filter = { role: { $in: ['Teacher'] } };

    switch (type) {
      case 'name':
        filter.name = regex;
        break;
      case 'subject':
        filter.subjects = regex;
        break;
      case 'department':
        filter.department = regex;
        break;
      default:
        return res.status(400).json({ msg: 'Invalid search type' });
    }

    const results = await User.find(filter)
      .select('-password -__v -createdAt -updatedAt');
    res.status(200).json(results);
  } catch (err) {
    console.error('Teacher search error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// UPDATE USER ROLE
exports.updateUserRole = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized' });
    }

    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ 
        success: false,
        message: 'No role data provided' 
      });
    }

    if (!Array.isArray(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Role must be provided as an array' 
      });
    }

    if (role.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'At least one role must be specified' 
      });
    }

     const validRoles = ['Teacher', 'Student', 'Admin'];
    const invalidRoles = role.filter(r => !validRoles.includes(r));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid roles provided: ${invalidRoles.join(', ')}` 
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' });
    }
    res.status(200).json({
      success: true,
       user 
      });

  } catch (err) {
    console.error('Role update error:', err);
    return res.status(500).json({ 
      success: false,
      message: err.message || 'Server error during role update',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// UPDATE USER PROFILE
exports.updateUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updateData = {};
    const { body } = req;

    // Basic fields
    const basicFields = ['name', 'bio', 'availability', 'experience', 'qualification', 'department', 'course', 'charge'];
    basicFields.forEach(field => {
      if (body[field] !== undefined) updateData[field] = body[field];
    });

    // Array fields
    if (body.subjects) {
      try {
        updateData.subjects = Array.isArray(body.subjects) ? body.subjects : JSON.parse(body.subjects);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid subjects format' });
      }
    }

    if (body.interests) {
      try {
        updateData.interests = Array.isArray(body.interests) ? body.interests : JSON.parse(body.interests);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid interests format' });
      }
    }

    // File upload
    if (req.file) {
      updateData.profilePic = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v -createdAt -updatedAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};