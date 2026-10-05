const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, required: true, trim: true },
  amount:     { type: Number, required: true, min: 0 },
  date:       { type: String, required: true },
  category:   { type: String, default: 'other' },
  recurrence: { type: String, enum: ['once','monthly','yearly'], default: 'monthly' },
  paid:       { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
