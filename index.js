const { testDatabase } = require("./db");
testDatabase().catch(error => {
  console.error("DATABASE CONNECTION FAILED:", error.message);
});
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() + "-" + Math.random().toString(36).slice(2) + ext;

    cb(null, name);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  }
});

let reels = [
  {
    id: 1,
    username: "Aravind",
    caption: "Welcome to SocialApp 🔥 #SocialApp",
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    likes: 12,
    comments: 3
  },
  {
    id: 2,
    username: "Rahul",
    caption: "Beautiful day ✨ #reels #explore",
    videoUrl:
      "https://www.w3schools.com/html/mov_bbb.mp4",
    likes: 28,
    comments: 6
  },
  {
    id: 3,
    username: "Priya",
    caption: "Keep smiling 😊 #SocialApp",
    videoUrl:
      "https://media.w3.org/2010/05/sintel/trailer.mp4",
    likes: 45,
    comments: 9
  }
];

app.get("/", (req, res) => {
  res.json({
    app: "SocialApp",
    status: "online",
    message: "SocialApp backend is running!"
  });
});

app.get("/api/reels", (req, res) => {
  res.json({
    reels: reels
  });
});

app.post("/api/reels/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No video uploaded"
    });
  }

  const username = req.body.username || "User";
  const caption = req.body.caption || "";

  const reel = {
    id: Date.now(),
    username: username,
    caption: caption,
    videoUrl:
      `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
    likes: 0,
    comments: 0
  };

  reels.unshift(reel);

  res.status(201).json({
    message: "Reel uploaded successfully",
    reel: reel
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SocialApp backend running on port ${PORT}`);
});
