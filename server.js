// server.js
const WebSocket = require("ws");
const http = require("http");

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket Server");
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_VALUE = "--heartbeat--";

// Track active connections
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.add(ws);

  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(HEARTBEAT_VALUE);
    }
  }, HEARTBEAT_INTERVAL);

  ws.on("message", (message) => {
    console.log(`Received: ${message}`);
    // Echo the message back to the client
    if (message !== HEARTBEAT_VALUE) {
      ws.send(`Server received: ${message}`);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    clearInterval(heartbeatInterval);
    clients.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clearInterval(heartbeatInterval);
    clients.delete(ws);
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
