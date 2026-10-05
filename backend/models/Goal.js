const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:       { type: String, required: true, trim: true },
  category:   { type: String, default: 'other' },
  target:     { type: Number, required: true, min: 1 },
  saved:      { type: Number, default: 0 },
  targetDate: { type: String, default: '' },
  priority:   { type: String, enum: ['high','medium','low'], default: 'medium' },
  notes:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
