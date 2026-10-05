const express = require('express');
const Goal    = require('../models/Goal');
const protect = require('../middleware/auth');
const router  = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try { res.json(await Goal.find({ user: req.user._id }).sort({ createdAt: -1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, category, target, saved, targetDate, priority, notes } = req.body;
    if (!name || !target) return res.status(400).json({ message: 'name and target required' });
    const g = await Goal.create({
      user: req.user._id, name, category: category || 'other',
      target, saved: saved || 0, targetDate: targetDate || '',
      priority: priority || 'medium', notes: notes || '',
    });
    res.status(201).json(g);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const g = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!g) return res.status(404).json({ message: 'Goal not found' });
    ['name','category','target','saved','targetDate','priority','notes']
      .forEach(f => { if (req.body[f] !== undefined) g[f] = req.body[f]; });
    await g.save();
    res.json(g);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/goals/:id/add-funds
router.patch('/:id/add-funds', async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount required' });
    const g = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!g) return res.status(404).json({ message: 'Goal not found' });
    g.saved = (g.saved || 0) + amount;
    await g.save();
    res.json(g);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const g = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!g) return res.status(404).json({ message: 'Goal not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
