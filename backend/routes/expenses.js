const express = require('express');
const Expense = require('../models/Expense');
const protect = require('../middleware/auth');
const router  = express.Router();

router.use(protect);

// GET /api/expenses?month=9&year=2026
router.get('/', async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.month && req.query.year) {
      const m = String(req.query.month).padStart(2, '0');
      filter.date = { $regex: `^${req.query.year}-${m}` };
    }
    if (req.query.category) filter.category = req.query.category;
    res.json(await Expense.find(filter).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { name, amount, date, category, payment, notes } = req.body;
    if (!name || !amount || !date || !category)
      return res.status(400).json({ message: 'name, amount, date and category required' });
    const expense = await Expense.create({
      user: req.user._id, name, amount, date, category,
      payment: payment || 'Cash', notes: notes || '',
    });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const exp = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!exp) return res.status(404).json({ message: 'Expense not found' });
    Object.assign(exp, req.body);
    await exp.save();
    res.json(exp);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const exp = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!exp) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/expenses  (reset all)
router.delete('/', async (req, res) => {
  try {
    await Expense.deleteMany({ user: req.user._id });
    res.json({ message: 'All expenses deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
