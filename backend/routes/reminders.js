const express  = require('express');
const Reminder = require('../models/Reminder');
const protect  = require('../middleware/auth');
const router   = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try { res.json(await Reminder.find({ user: req.user._id }).sort({ date: 1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, amount, date, category, recurrence } = req.body;
    if (!title || !amount || !date)
      return res.status(400).json({ message: 'title, amount and date required' });
    const r = await Reminder.create({
      user: req.user._id, title, amount, date,
      category: category || 'other',
      recurrence: recurrence || 'monthly',
      paid: false,
    });
    res.status(201).json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/reminders/:id/pay
router.patch('/:id/pay', async (req, res) => {
  try {
    const r = await Reminder.findOne({ _id: req.params.id, user: req.user._id });
    if (!r) return res.status(404).json({ message: 'Reminder not found' });
    r.paid = true;
    await r.save();
    res.json(r);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!r) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
