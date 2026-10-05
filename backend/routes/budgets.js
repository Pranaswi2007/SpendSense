const express = require('express');
const Budget  = require('../models/Budget');
const protect = require('../middleware/auth');
const router  = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try { res.json(await Budget.find({ user: req.user._id })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { category, limit, threshold, customLabel } = req.body;
    if (!category || !limit) return res.status(400).json({ message: 'category and limit required' });
    if (await Budget.findOne({ user: req.user._id, category }))
      return res.status(409).json({ message: 'Budget for this category already exists' });
    const b = await Budget.create({
      user: req.user._id, category, limit,
      threshold: threshold || 80, customLabel: customLabel || null,
    });
    res.status(201).json(b);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const b = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!b) return res.status(404).json({ message: 'Budget not found' });
    if (req.body.limit)     b.limit     = req.body.limit;
    if (req.body.threshold) b.threshold = req.body.threshold;
    await b.save();
    res.json(b);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const b = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!b) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/budgets/replace — Smart Planner replaces all budgets at once
router.post('/replace', async (req, res) => {
  try {
    const { budgets } = req.body;
    if (!Array.isArray(budgets)) return res.status(400).json({ message: 'budgets must be an array' });
    await Budget.deleteMany({ user: req.user._id });
    const created = await Budget.insertMany(
      budgets.map(b => ({
        user: req.user._id, category: b.category, limit: b.limit,
        threshold: b.threshold || 80, customLabel: b.customLabel || null,
      }))
    );
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
