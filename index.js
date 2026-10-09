require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const { signup, login } = require("./auth");
const { createPost, listPosts } = require("./posts");
const { requireAuth } = require("./middleware");
const { toggleLike, addComment, listComments } = require("./social");
const { getProfile, searchUsers, toggleFollow, updateProfile } = require("./users");
const { createMessage, listMessages, listNotifications } = require("./extras");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

let client = null;

app.post("/api/posts", requireAuth, createPost);
app.get("/api/posts", listPosts);
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

app.listen(port, "0.0.0.0", () => {
  console.log(`SocialApp AI backend running on http://127.0.0.1:${port}`);
});
