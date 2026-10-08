const { testDatabase, createUser, pool } = require("./db");
testDatabase().catch(error => {
testDatabase().catch(error => {
  console.error("DATABASE CONNECTION FAILED");
  console.error("DB ERROR CODE:", error.code);
  console.error("DB ERROR NAME:", error.name);
  console.error("DB ERROR MESSAGE:", error.message);
});
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

app.post("/api/users", async (req, res) => {
  try {
    const { username, displayName } = req.body;

    if (!username) {
      return res.status(400).json({
        error: "username is required"
      });
    }

    const user = await createUser(username, displayName || username);

    res.status(201).json({
      message: "User created successfully",
      user
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Username already exists"
      });
    }

    res.status(500).json({
      error: "Failed to create user"
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users ORDER BY id ASC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET USERS ERROR:", error.message);

    res.status(500).json({
      error: "Failed to fetch users"
    });
  }
});

app.get("/api/users/:username", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("GET USER ERROR:", error.message);

    res.status(500).json({
      error: "Failed to fetch user"
    });
  }
});

