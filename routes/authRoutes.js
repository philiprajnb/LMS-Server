const express = require('express');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  changePassword,
  promoteToAdmin
} = require('../controllers/authController');
const { auth, authorize } = require('../middleware/auth');
const { validatePromoteAdmin } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, changePassword);

// @route   PUT /api/auth/password
// @desc    Change user password (alias)
// @access  Private
router.put('/password', auth, changePassword);

// @route   POST /api/auth/admin/promote
// @desc    Promote an existing user to admin role
// @access  Private (admin)
router.post('/admin/promote', auth, authorize('admin'), validatePromoteAdmin, promoteToAdmin);

module.exports = router;