require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend from parent folder
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/budgets',   require('./routes/budgets'));
app.use('/api/goals',     require('./routes/goals'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/salary',    require('./routes/salary'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ SpendSense server running at http://localhost:${PORT}`);
  console.log(`   Open your browser and go to: http://localhost:${PORT}\n`);
});
