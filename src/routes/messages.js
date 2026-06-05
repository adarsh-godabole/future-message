const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate } = require('./auth');

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// POST /messages — create a future message
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Message body is required'),
    body('recipient_email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid recipient email is required'),
    body('recipient_name').optional().trim(),
  body('deliver_at')
  .isISO8601()
  .withMessage('deliver_at must be a valid ISO 8601 date'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, body: messageBody, recipient_email, recipient_name, deliver_at } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO messages (user_id, title, body, recipient_email, recipient_name, deliver_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, recipient_email, recipient_name, deliver_at, delivered, created_at`,
        [req.user.id, title, messageBody, recipient_email, recipient_name || null, deliver_at]
      );

      res.status(201).json({ message: result.rows[0] });
    } catch (err) {
      console.error('Create message error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /messages — list all messages for logged-in user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, recipient_email, recipient_name, deliver_at, delivered, delivered_at, created_at
       FROM messages
       WHERE user_id = $1
       ORDER BY deliver_at ASC`,
      [req.user.id]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('List messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /messages/:id — get a single message
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, body, recipient_email, recipient_name, deliver_at, delivered, delivered_at, created_at
       FROM messages
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });
  } catch (err) {
    console.error('Get message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /messages/:id — delete a pending message
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM messages
       WHERE id = $1 AND user_id = $2 AND delivered = FALSE
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Message not found, already delivered, or not authorized',
      });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
