const express = require("express");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Satyam Study Live Server is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/get-token", async (req, res) => {
  try {
    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({
        error: "LiveKit environment variables are missing"
      });
    }

    const participantName = String(req.body.name || "").trim();
    const roomName = String(req.body.room || "").trim();

    if (!participantName || !roomName ||
        participantName.length > 50 || roomName.length > 100) {
      return res.status(400).json({
        error: "Valid name and room are required"
      });
    }

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: participantName,
        ttl: "1h"
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: false,
      canSubscribe: true,
      canPublishData: true
    });

    res.json({ token: await token.toJwt() });
  } catch (error) {
    console.error("Token creation failed");
    res.status(500).json({ error: "Could not create token" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});       }
