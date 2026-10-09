const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

async function signup(req, res) {
  try {
    const { username, displayName, password } = req.body || {};

    if (
      typeof username !== "string" ||
      !/^[a-zA-Z0-9_]{3,30}$/.test(username) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        error: "Username must be 3-30 letters, numbers or underscores; password must be 8-72 characters."
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, display_name, bio, avatar_url`,
      [username, typeof displayName === "string" ? displayName.slice(0, 100) : username, hash]
    );

    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already exists." });
    }
    console.error("Signup failed:", err.message);
    res.status(500).json({ error: "Signup failed." });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Enter username and password." });
    }

    const result = await pool.query(
      "SELECT id, username, display_name, password_hash FROM users WHERE username = $1",
      [username]
    );
    const user = result.rows[0];

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      user: { id: user.id, username: user.username, display_name: user.display_name },
      token
    });
  } catch (err) {
    console.error("Login failed:", err.message);
    res.status(500).json({ error: "Login failed." });
  }
}

module.exports = { signup, login };
