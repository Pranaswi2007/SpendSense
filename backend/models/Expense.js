const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  amount:   { type: Number, required: true, min: 0 },
  date:     { type: String, required: true },
  category: { type: String, required: true },
  payment:  { type: String, default: 'Cash' },
  notes:    { type: String, default: '' },
}, { timestamps: true });

expenseSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
