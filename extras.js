const { pool } = require("./db");

async function createMessage(req, res) {
  try {
    const to = Number(req.body?.toUserId);
    const text = req.body?.text;
    if (!Number.isInteger(to) || to < 1 || typeof text !== "string" || !text.trim() || text.length > 2000)
      return res.status(400).json({ error: "Enter a valid recipient and message." });

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, text)
       VALUES ($1,$2,$3) RETURNING id, sender_id, receiver_id, text, created_at`,
      [req.user.userId, to, text.trim()]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (e) {
    console.error("Message failed:", e.message);
    res.status(500).json({ error: "Could not send message." });
  }
}

async function listMessages(req, res) {
  try {
    const other = Number(req.params.userId);
    if (!Number.isInteger(other) || other < 1)
      return res.status(400).json({ error: "Invalid user ID." });

    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, text, created_at FROM messages
       WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
       ORDER BY created_at ASC LIMIT 200`,
      [req.user.userId, other]
    );
    res.json({ messages: result.rows });
  } catch (e) {
    console.error("Messages load failed:", e.message);
    res.status(500).json({ error: "Could not load messages." });
  }
}

async function listNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, actor_id, kind, post_id, created_at
       FROM notifications WHERE user_id=$1
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.userId]
    );
    res.json({ notifications: result.rows });
  } catch (e) {
    console.error("Notifications failed:", e.message);
    res.status(500).json({ error: "Could not load notifications." });
  }
}

module.exports = { createMessage, listMessages, listNotifications };
