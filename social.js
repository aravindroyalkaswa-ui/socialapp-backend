const { pool } = require("./db");

async function toggleLike(req, res) {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: "Invalid post ID." });
    }

    const existing = await pool.query(
      "SELECT id FROM likes WHERE user_id=$1 AND post_id=$2",
      [userId, postId]
    );

    if (existing.rowCount) {
      await pool.query(
        "DELETE FROM likes WHERE user_id=$1 AND post_id=$2",
        [userId, postId]
      );
      return res.json({ liked: false });
    }

    await pool.query(
      "INSERT INTO likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT (user_id,post_id) DO NOTHING",
      [userId, postId]
    );
    res.json({ liked: true });
  } catch (err) {
    console.error("Like failed:", err.message);
    res.status(500).json({ error: "Could not update like." });
  }
}

async function addComment(req, res) {
  try {
    const userId = req.user.userId;
    const postId = Number(req.params.postId);
    const { text } = req.body || {};

    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: "Invalid post ID." });
    }
    if (typeof text !== "string" || !text.trim() || text.length > 1000) {
      return res.status(400).json({ error: "Comment must be 1-1000 characters." });
    }

    const result = await pool.query(
      `INSERT INTO comments (user_id, post_id, text)
       VALUES ($1,$2,$3)
       RETURNING id, user_id, post_id, text, created_at`,
      [userId, postId, text.trim()]
    );
    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    console.error("Comment failed:", err.message);
    res.status(500).json({ error: "Could not add comment." });
  }
}

async function listComments(req, res) {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: "Invalid post ID." });
    }
    const result = await pool.query(
      `SELECT c.id, c.user_id, u.username, c.text, c.created_at
       FROM comments c JOIN users u ON u.id=c.user_id
       WHERE c.post_id=$1 ORDER BY c.created_at ASC LIMIT 100`,
      [postId]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error("Comments load failed:", err.message);
    res.status(500).json({ error: "Could not load comments." });
  }
}

module.exports = { toggleLike, addComment, listComments };
