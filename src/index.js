/*
 * FutureMail – Entry Point
 *
 * This is the main server file for FutureMail, an application that lets users
 * schedule messages to be delivered at a future date and time.
 *
 * Responsibilities:
 *  - Loads environment variables via dotenv
 *  - Sets up an Express app with security (Helmet) and CORS middleware
 *  - Mounts authentication routes (/auth) and message routes (/messages)
 *  - Provides a /health endpoint for uptime checks
 *  - Initialises the database connection on startup
 *  - Starts the scheduler service that polls for and delivers due messages
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { initDB } = require('./db');
const { startScheduler } = require('./services/scheduler');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await initDB();
    startScheduler();

    app.listen(PORT, () => {
      console.log(`🚀 FutureMail server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
