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
    reels: []
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SocialApp backend running on port ${PORT}`);
});

