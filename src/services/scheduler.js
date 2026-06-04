const cron = require('node-cron');
const { pool } = require('../db');
const { sendFutureMessage } = require('./emailService');

const startScheduler = () => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    console.log(`[Scheduler] Checking for due messages at ${new Date().toISOString()}`);

    let client;
    try {
      client = await pool.connect();

      // Lock and fetch due messages in one atomic query to avoid double-sends
      const result = await client.query(`
        UPDATE messages
        SET delivered = TRUE, delivered_at = NOW()
        WHERE id IN (
          SELECT m.id FROM messages m
          WHERE m.delivered = FALSE
            AND m.deliver_at <= NOW()
          FOR UPDATE SKIP LOCKED
        )
        RETURNING
          messages.id,
          messages.title,
          messages.body,
          messages.recipient_email,
          messages.recipient_name,
          messages.deliver_at,
          messages.user_id
      `);

      if (result.rows.length === 0) {
        return;
      }

      console.log(`[Scheduler] Found ${result.rows.length} message(s) to deliver`);

      // Fetch sender names for all unique user_ids
      const userIds = [...new Set(result.rows.map((m) => m.user_id))];
      const usersResult = await client.query(
        'SELECT id, name FROM users WHERE id = ANY($1)',
        [userIds]
      );
      const usersMap = Object.fromEntries(usersResult.rows.map((u) => [u.id, u.name]));

      // Send emails, roll back delivery flag if email fails
      for (const message of result.rows) {
        try {
          await sendFutureMessage({
            message,
            senderName: usersMap[message.user_id] || 'Someone',
          });
          console.log(`[Scheduler] ✅ Delivered message ${message.id} to ${message.recipient_email}`);
        } catch (emailErr) {
          console.error(`[Scheduler] ❌ Failed to send message ${message.id}:`, emailErr.message);

          // Roll back delivered flag so it retries next cycle
          await client.query(
            'UPDATE messages SET delivered = FALSE, delivered_at = NULL WHERE id = $1',
            [message.id]
          );
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error during scheduled run:', err.message);
    } finally {
      if (client) client.release();
    }
  });

  console.log('⏰ Scheduler started — checking every minute for due messages');
};

module.exports = { startScheduler };
