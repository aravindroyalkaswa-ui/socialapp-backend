const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    app: "SocialApp",
    status: "online",
    message: "SocialApp backend is running!"
  });
});

app.get("/api/reels", (req, res) => {
  res.json({
    reels: [
      {
        id: 1,
        username: "Aravind",
        caption: "Welcome to SocialApp 🔥",
        videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        likes: 0,
        comments: 0
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SocialApp backend running on port ${PORT}`);
});

