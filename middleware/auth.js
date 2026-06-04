/*
 * Auth Routes – /auth
 *
 * Handles user registration, login, and identity retrieval.
 * Uses express-validator to validate request bodies before any DB access.
 * Passwords are hashed with bcrypt (cost factor 12) and never returned in responses.
 * Successful auth calls return a signed JWT valid for JWT_EXPIRES_IN (default 7 days).
 *
 * Routes:
 *  POST /auth/register – create a new account; returns the user object and a JWT
 *  POST /auth/login    – verify credentials; returns the user object and a JWT
 *  GET  /auth/me       – returns the currently authenticated user (requires JWT)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');

const router = express.Router();

// POST /auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [name, email, passwordHash]
      );

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({ user, token });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      const { password_hash, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /auth/me
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
