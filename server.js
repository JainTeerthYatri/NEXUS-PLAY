const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`NexusPlay Streaming Bridge listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const streamKey = urlParams.get("key");

  if (!streamKey) {
    console.log("Connection rejected: Missing stream key");
    ws.close();
    return;
  }

  console.log(`Stream connected with key: ${streamKey}`);

  // Target YouTube RTMP endpoint using the validated stream key[cite: 5]
  const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

  // Spawn system-level FFmpeg binary process[cite: 5]
  const ffmpegArgs = [
    "-i", "-",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-c:a", "aac",
    "-ar", "44100",
    "-b:a", "128k",
    "-f", "flv",
    rtmpUrl
  ];

  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  ffmpegProcess.stdout.on("data", (data) => {
    console.log(`ffmpeg stdout: ${data}`);
  });

  ffmpegProcess.stderr.on("data", (data) => {
    console.error(`ffmpeg stderr: ${data}`);
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`ffmpeg process closed with code ${code}`);
  });

  ws.on("message", (message) => {
    // Write incoming WebM/binary chunks directly to FFmpeg's standard input (stdin)[cite: 5]
    if (ffmpegProcess.stdin.writable) {
      ffmpegProcess.stdin.write(message);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    if (ffmpegProcess.stdin.writable) {
      ffmpegProcess.stdin.end();
    }
    ffmpegProcess.kill("SIGKILL");
  });
});