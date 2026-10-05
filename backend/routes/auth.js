const express  = require('express');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const protect  = require('../middleware/auth');
const Expense  = require('../models/Expense');
const Budget   = require('../models/Budget');
const Goal     = require('../models/Goal');
const Reminder = require('../models/Reminder');

const router = express.Router();

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const userPayload = (u) => ({
  id: u._id, firstName: u.firstName, lastName: u.lastName,
  email: u.email, phone: u.phone, avatar: u.avatar, salary: u.salary,
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, avatar } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await User.create({
      firstName, lastName, email, phone: phone || '',
      password, avatar: avatar || '😊',
    });

    res.status(201).json({ token: makeToken(user._id), user: userPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ token: makeToken(user._id), user: userPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: userPayload(req.user) });
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { firstName, lastName, phone, avatar } = req.body;
    if (firstName) user.firstName = firstName;
    if (lastName)  user.lastName  = lastName;
    if (phone)     user.phone     = phone;
    if (avatar)    user.avatar    = avatar;
    await user.save();
    res.json({ user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: 'Could not update profile' });
  }
});

// PUT /api/auth/password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both passwords required' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Could not change password' });
  }
});

// DELETE /api/auth/account  — deletes user + all their data
router.delete('/account', protect, async (req, res) => {
  try {
    const id = req.user._id;
    await Promise.all([
      Expense.deleteMany({ user: id }),
      Budget.deleteMany({ user: id }),
      Goal.deleteMany({ user: id }),
      Reminder.deleteMany({ user: id }),
      User.findByIdAndDelete(id),
    ]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete account' });
  }
});

module.exports = router;
