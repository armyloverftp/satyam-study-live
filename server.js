const express = require("express");
const cors = require("cors");
const { AccessToken } = require("livekit-server-sdk");

const app = express();

app.use(cors({
  origin: [
    "https://armyloverftp.github.io"
  ]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Satyam Study Live Server is Running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/get-token", async (req, res) => {
  try {
    const { name, room, role, teacherKey } = req.body;

    if (!name || !room) {
      return res.status(400).json({
        error: "Name and room are required"
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const correctTeacherKey =
      process.env.LIVE_CLASS_TEACHER_KEY;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        error: "LiveKit server settings are missing"
      });
    }

    const isTeacher = role === "teacher";

    if (
      isTeacher &&
      (!correctTeacherKey || teacherKey !== correctTeacherKey)
    ) {
      return res.status(403).json({
        error: "Invalid teacher key"
      });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: String(name).trim().slice(0, 50),
      ttl: "1h"
    });

    token.addGrant({
      roomJoin: true,
      room: String(room).trim().slice(0, 100),
      canPublish: isTeacher,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();

    res.json({
      token: jwt,
      serverUrl: process.env.LIVEKIT_URL
    });
  } catch (error) {
    console.error("Token error:", error);

    res.status(500).json({
      error: "Unable to create LiveKit token"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Satyam Study Live server running on port ${PORT}`
  );
});
