const { pool } = require("./db");

async function getProfile(req, res) {
  try {
    const username = String(req.params.username || "").trim();
    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id=u.id) AS post_count,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id=u.id) AS followers,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id=u.id) AS following
       FROM users u WHERE LOWER(u.username)=LOWER($1)`,
      [username]
    );
    if (!result.rowCount) return res.status(404).json({ error: "User not found." });
    res.json({ user: result.rows[0] });
  } catch (e) {
    console.error("Profile failed:", e.message);
    res.status(500).json({ error: "Could not load profile." });
  }
}

async function searchUsers(req, res) {
  try {
    const q = String(req.query.q || "").trim().slice(0, 50);
    if (!q) return res.json({ users: [] });
    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url
       FROM users WHERE username ILIKE $1 OR COALESCE(display_name,'') ILIKE $1
       ORDER BY username LIMIT 30`,
      [`%${q}%`]
    );
    res.json({ users: result.rows });
  } catch (e) {
    console.error("User search failed:", e.message);
    res.status(500).json({ error: "Could not search users." });
  }
}

async function toggleFollow(req, res) {
  try {
    const followerId = req.user.userId;
    const username = String(req.params.username || "").trim();
    const target = await pool.query(
      "SELECT id FROM users WHERE LOWER(username)=LOWER($1)",
      [username]
    );
    if (!target.rowCount) return res.status(404).json({ error: "User not found." });
    const followingId = target.rows[0].id;
    if (followerId === followingId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const existing = await pool.query(
      "SELECT id FROM follows WHERE follower_id=$1 AND following_id=$2",
      [followerId, followingId]
    );
    if (existing.rowCount) {
      await pool.query(
        "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
        [followerId, followingId]
      );
      return res.json({ following: false });
    }

    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [followerId, followingId]
    );
    res.json({ following: true });
  } catch (e) {
    console.error("Follow failed:", e.message);
    res.status(500).json({ error: "Could not update follow." });
  }
}

async function updateProfile(req, res) {
  try {
    const { displayName, bio, avatarUrl } = req.body || {};
    const result = await pool.query(
      `UPDATE users SET display_name=$1, bio=$2, avatar_url=$3
       WHERE id=$4
       RETURNING id, username, display_name, bio, avatar_url`,
      [
        typeof displayName === "string" ? displayName.slice(0, 100) : null,
        typeof bio === "string" ? bio.slice(0, 300) : "",
        typeof avatarUrl === "string" ? avatarUrl.slice(0, 2000) : null,
        req.user.userId
      ]
    );
    res.json({ user: result.rows[0] });
  } catch (e) {
    console.error("Profile update failed:", e.message);
    res.status(500).json({ error: "Could not update profile." });
  }
}

module.exports = { getProfile, searchUsers, toggleFollow, updateProfile };
