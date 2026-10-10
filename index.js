require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const { signup, login } = require("./auth");
const { createPost, listPosts } = require("./posts");
const { requireAuth } = require("./middleware");
const { toggleLike, addComment, listComments } = require("./social");
const { getProfile, searchUsers, toggleFollow, updateProfile } = require("./users");
const { createMessage, listMessages, listNotifications } = require("./extras");
const { testDatabase } = require("./db");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const reelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload a video file."));
    }
  }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

let client = null;

app.post("/api/posts", requireAuth, createPost);
app.get("/api/posts", listPosts);
app.post("/api/reels/upload", reelUpload.single("video"), async (req, res) => {
  try {
    const { caption, username } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ error: "Please select a video." });
    }

    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "socialapp/reels" },
        (error, result) => error ? reject(error) : resolve(result)
      );
      Readable.from(req.file.buffer).pipe(stream);
    });

    const { pool } = require("./db");
    const userResult = await pool.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [typeof username === "string" && username.trim() ? username.trim() : "Aravind"]
    );

    if (!userResult.rows.length) {
      return res.status(400).json({
        error: "User not found. Please sign in with a registered account first."
      });
    }

    const postResult = await pool.query(
      `INSERT INTO posts (user_id, caption, media_url)
       VALUES ($1, $2, $3)
       RETURNING id, caption, media_url AS "videoUrl", created_at`,
      [
        userResult.rows[0].id,
        typeof caption === "string" ? caption.trim().slice(0, 2000) : "",
        uploaded.secure_url
      ]
    );

    res.status(201).json({ reel: postResult.rows[0] });
  } catch (err) {
    console.error("Reel upload failed:", err.message);
    res.status(500).json({ error: "Reel upload failed. Please try again." });
  }
});

app.get("/api/reels", async (req, res) => {
  try {
    const result = await require("./db").pool.query(`
      SELECT p.id, p.caption, p.media_url AS "videoUrl",
             p.created_at, u.username
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.media_url IS NOT NULL
        AND p.media_url <> ''
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    res.json({ reels: result.rows });
  } catch (err) {
    console.error("Load reels failed:", err.message);
    res.status(500).json({ error: "Could not load reels." });
  }
});
app.post("/api/posts/:postId/like", requireAuth, toggleLike);
app.post("/api/posts/:postId/comments", requireAuth, addComment);
app.get("/api/posts/:postId/comments", listComments);

app.post("/api/signup", signup);
app.post("/api/login", login);

app.get("/api/users/search", searchUsers);
app.get("/api/users/:username", getProfile);
app.patch("/api/profile", requireAuth, updateProfile);
app.post("/api/users/:username/follow", requireAuth, toggleFollow);

app.post("/api/messages", requireAuth, createMessage);
app.get("/api/messages/:userId", requireAuth, listMessages);
app.get("/api/notifications", requireAuth, listNotifications);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "SocialApp AI" });
});

app.post("/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI chat is temporarily unavailable." });
    }
    if (!client) {
      client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please enter a message." });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: "Message is too long." });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions:
        "You are SocialApp AI Companion. Give helpful, clear answers. " +
        "Reply in Telugu when the user writes in Telugu; otherwise use their language.",
      input: message.trim()
    });

    res.json({ reply: response.output_text });
  } catch (err) {
    console.error("AI request failed:", JSON.stringify({status: err.status, code: err.code, type: err.type, message: err.message}));
    res.status(500).json({
      error: "AI reply failed. Check server configuration and API billing."
    });
  }
});

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await testDatabase();
    app.listen(port, "0.0.0.0", () => {
      console.log(`SocialApp AI backend listening on port ${port}`);
    });
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    process.exit(1);
  }
}

startServer();
