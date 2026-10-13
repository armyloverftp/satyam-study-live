<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Satyam Study Live</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;padding:15px;
  font-family:Arial,sans-serif;
  background:#101827;color:white;
  text-align:center
}
h1{color:#60a5fa}
.card{
  max-width:600px;margin:18px auto;
  padding:18px;background:#1f2937;
  border-radius:15px
}
input,button{
  width:100%;padding:13px;
  margin:7px 0;border:0;
  border-radius:8px;font-size:16px
}
button{
  background:#2563eb;color:white;
  font-weight:bold
}
button:disabled{opacity:.5}
#videoBox{
  min-height:220px;margin-top:15px;
  padding:10px;background:#000;
  border-radius:10px;
  display:flex;flex-wrap:wrap;
  align-items:center;justify-content:center;
  gap:8px
}
#videoBox video{
  width:100%;max-height:350px;
  object-fit:contain
}
#status{color:#fbbf24;overflow-wrap:anywhere}
#chatMessages{
  height:180px;overflow-y:auto;
  background:#111827;padding:10px;
  border-radius:8px;text-align:left;
  overflow-wrap:anywhere
}
.note{color:#cbd5e1;font-size:13px}
</style>
</head>
<body>
<h1>📚 Satyam Study Live</h1>

<div class="card">
<h2>🎓 कक्षा 10 · UP Board</h2>
<p>शिक्षक की लाइव वीडियो क्लास</p>

<input id="studentName"
placeholder="अपना नाम लिखें" maxlength="50">

<input id="roomName"
placeholder="क्लास कोड लिखें" maxlength="100">

<input id="teacherKey" type="password"
placeholder="केवल शिक्षक का कोड">

<button id="joinBtn">क्लास से जुड़ें</button>
<button id="leaveBtn" disabled>क्लास छोड़ें</button>

<div id="videoBox">
📹 लाइव वीडियो यहाँ दिखाई देगा
</div>

<p id="status">नाम और क्लास कोड भरें।</p>
<p class="note">
विद्यार्थी लाइव क्लास देख सकते हैं और कमेंट कर सकते हैं।
</p>
</div>

<div class="card">
<h2>💬 लाइव कमेंट</h2>
<div id="chatMessages"></div>
<input id="chatInput"
placeholder="अपना कमेंट लिखें" maxlength="500">
<button id="sendBtn" disabled>कमेंट भेजें</button>
</div>
<script type="module">
import {
  Room,
  RoomEvent
} from "https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.esm.mjs";

const SERVER_URL =
  "https://satyam-study-live.onrender.com";

// यहाँ अपना असली LiveKit Cloud URL डालना है।
const LIVEKIT_URL = "YOUR_LIVEKIT_URL";

const $ = id => document.getElementById(id);

let liveRoom = null;
let isTeacher = false;

function status(message) {
  $("status").textContent = message;
}

function showMessage(name, message) {
  const p = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = name + ": ";
  const span = document.createElement("span");
  span.textContent = message;
  p.append(strong, span);
  $("chatMessages").appendChild(p);
  $("chatMessages").scrollTop =
    $("chatMessages").scrollHeight;
}

function showVideo(track) {
  const element = track.attach();
  $("videoBox").appendChild(element);
}

function removeVideo(track) {
  track.detach().forEach(element => element.remove());
}

$("joinBtn").addEventListener("click", async () => {
  const name = $("studentName").value.trim();
  const roomName = $("roomName").value.trim();
  const teacherKey = $("teacherKey").value.trim();

  if (!name || !roomName) {
    status("अपना नाम और क्लास कोड भरें।");
    return;
  }

  if (LIVEKIT_URL === "YOUR_LIVEKIT_URL") {
    status("पहले LiveKit URL सेट करना होगा।");
    return;
  }

  $("joinBtn").disabled = true;
  status("सर्वर से कनेक्ट हो रहे हैं...");

  try {
    const response = await fetch(
      SERVER_URL + "/get-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          room: roomName,
          role: teacherKey ? "teacher" : "student",
          teacherKey
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "टोकन नहीं मिला।");
    }

    liveRoom = new Room();

    liveRoom.on(
      RoomEvent.TrackSubscribed,
      track => showVideo(track)
    );

    liveRoom.on(
      RoomEvent.TrackUnsubscribed,
      track => removeVideo(track)
    );

    liveRoom.on(
      RoomEvent.DataReceived,
      (payload, participant) => {
        try {
          const message = JSON.parse(
            new TextDecoder().decode(payload)
          );

          if (message.type === "chat") {
            showMessage(
              participant?.identity || "विद्यार्थी",
              message.message
            );
          }
        } catch (error) {
          console.log("कमेंट पढ़ने में समस्या");
        }
      }
    );

    await liveRoom.connect(
      LIVEKIT_URL,
      data.token
    );

    isTeacher = Boolean(teacherKey);

    if (isTeacher) {
      await liveRoom.localParticipant
        .setCameraEnabled(true);

      await liveRoom.localParticipant
        .setMicrophoneEnabled(true);
    }

    $("leaveBtn").disabled = false;
    $("sendBtn").disabled = false;

    status(
      isTeacher
        ? "शिक्षक क्लास में जुड़ गए हैं।"
        : "क्लास में जुड़ गए हैं।"
    );

  } catch (error) {
    status("कनेक्शन में समस्या: " + error.message);

    if (liveRoom) {
      await liveRoom.disconnect().catch(() => {});
      liveRoom = null;
    }
  } finally {
    $("joinBtn").disabled = false;
  }
});
// लाइव कमेंट भेजना
$("sendBtn").addEventListener("click", async () => {
  if (!liveRoom) {
    status("पहले क्लास से जुड़ें।");
    return;
  }

  const message = $("chatInput").value.trim();

  if (!message) {
    status("पहले कमेंट लिखें।");
    return;
  }

  try {
    const payload = new TextEncoder().encode(
      JSON.stringify({
        type: "chat",
        message: message
      })
    );

    await liveRoom.localParticipant.publishData(
      payload,
      {
        reliable: true,
        topic: "chat"
      }
    );

    showMessage("आप", message);
    $("chatInput").value = "";
    status("कमेंट भेज दिया गया।");

  } catch (error) {
    status("कमेंट नहीं भेजा गया। दोबारा कोशिश करें।");
  }
});

// Enter दबाकर कमेंट भेजना
$("chatInput").addEventListener("keydown", event => {
  if (event.key === "Enter") {
    $("sendBtn").click();
  }
});

// क्लास छोड़ना
$("leaveBtn").addEventListener("click", async () => {
  if (liveRoom) {
    await liveRoom.disconnect();
    liveRoom = null;
  }

  $("videoBox").replaceChildren();
  $("leaveBtn").disabled = true;
  $("sendBtn").disabled = true;

  status("आपने क्लास छोड़ दी है।");
});

// कनेक्शन टूटने पर संदेश
if (liveRoom) {
  liveRoom.on(RoomEvent.Disconnected, () => {
    status("क्लास का कनेक्शन टूट गया।");
  });
}
</script>
</body>
</html>
