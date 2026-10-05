const express = require('express');
const User    = require('../models/User');
const protect = require('../middleware/auth');
const router  = express.Router();

router.use(protect);

router.get('/', (req, res) => {
  res.json({ salary: req.user.salary || 0 });
});

router.put('/', async (req, res) => {
  try {
    const salary = Number(req.body.salary);
    if (isNaN(salary) || salary < 0)
      return res.status(400).json({ message: 'Valid salary required' });
    const user = await User.findByIdAndUpdate(req.user._id, { salary }, { new: true });
    res.json({ salary: user.salary });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
