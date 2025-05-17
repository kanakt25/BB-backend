const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: [String],
    default: ['Student'], 
  },
  profilePic: {
    type: String,
    default: '/default-profile.png',
  },
  department: {
    type: String,
    default: '',
  },

  // Teacher-specific fields
  subjects: {
    type: [String],
    default: [],
  },
  availability: {
    type: String,
    default: '',
  },
  experience: {
    type: String,
    default: '',
  },
  qualification: {
    type: String,
    default: '',
  },
  charge: {
    type: String, 
    default: '',
  },

  // Student-specific fields
  course: {
    type: String,
    default: '',
  },
  interests: {
    type: [String],
    default: [],
  },
  ratings: {
    type: [Number],
    default: [],
  },

  // Relationships
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
});

// Password hash before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password compare method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
