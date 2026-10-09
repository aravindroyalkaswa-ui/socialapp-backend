const { pool } = require("./db");

async function createPost(req, res) {
  try {
    const { caption, mediaUrl } = req.body || {};
    const userId = req.user.userId;

    if (typeof caption !== "string" || !caption.trim() || caption.length > 2000) {
      return res.status(400).json({
        error: "Caption must be between 1 and 2000 characters."
      });
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, caption, media_url)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, caption, media_url, created_at`,
      [
        userId,
        caption.trim(),
        typeof mediaUrl === "string" && mediaUrl.trim()
          ? mediaUrl.slice(0, 2000)
          : null
      ]
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error("Create post failed:", err.message);
    res.status(500).json({ error: "Could not create post." });
  }
}

async function listPosts(req, res) {
  try {
    const result = await pool.query(
      `SELECT p.id, p.user_id, u.username, u.display_name,
              p.caption, p.media_url, p.created_at,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );

    res.json({ posts: result.rows });
  } catch (err) {
    console.error("List posts failed:", err.message);
    res.status(500).json({ error: "Could not load posts." });
  }
}

module.exports = { createPost, listPosts };
