const connectivityManager = (() => {
  // Configuration
  const config = {
    maxReconnectAttempts: 5,
    initialReconnectDelay: 1000,
    maxReconnectDelay: 30000
  };

  // State
  let ws = null;
  let reconnectAttempts = 0;
  let reconnectDelay = config.initialReconnectDelay;
  let offlineAtLoad = !navigator.onLine;

  // DOM Elements
  const elements = {
    status: document.getElementById("connection-status"),
    statusText: document.getElementById("status-text"),
    errorPage: document.getElementById("error-page"),
    appContent: document.getElementById("app-content"),
    messageInput: document.getElementById("message-input"),
    sendButton: document.getElementById("send-button"),
    messagesContainer: document.getElementById("messages"),
    errorDetails: document.getElementById("error-details")
  };

  // Initialize the manager
  function init() {
    setupEventListeners();
    checkInitialConnection();
  }

  // Check initial connection state
  function checkInitialConnection() {
    if (offlineAtLoad) {
      showOfflineState();
      showErrorPage();
    } else {
      connectWebSocket();
    }
  }

  // Set up event listeners
  function setupEventListeners() {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    elements.sendButton.addEventListener("click", sendMessage);
    elements.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  // Connection handlers
  function handleOnline() {
    console.log("Network connection restored");
    updateStatus(true);
    hideErrorPage();
    if (!ws || ws.readyState === WebSocket.CLOSED) connectWebSocket();
  }

  function handleOffline() {
    console.log("Network connection lost");
    updateStatus(false);
    if (ws) {
      ws.close();
      ws = null;
    }
    if (!offlineAtLoad) showErrorPage();
  }

  // WebSocket management
  function connectWebSocket() {
    if (ws) ws.close();

    ws = new WebSocket(`ws://${window.location.hostname}:8080`);

    ws.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts = 0;
      reconnectDelay = config.initialReconnectDelay;
      updateStatus(true);
      offlineAtLoad = false;
      hideErrorPage();
    };

    ws.onmessage = (event) => {
      if (event.data === "--heartbeat--") return;
      addMessage(event.data, "server");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      updateStatus(false);
      showErrorPage("server");
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      updateStatus(false);
      showErrorPage("server");
    };
  }

  function scheduleReconnect() {
    if (reconnectAttempts < config.maxReconnectAttempts && navigator.onLine) {
      reconnectAttempts++;
      reconnectDelay = Math.min(reconnectDelay * 2, config.maxReconnectDelay);
      console.log(`Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts})`);
      setTimeout(connectWebSocket, reconnectDelay);
    } else {
      console.log("Max reconnection attempts reached or offline");
      updateStatus(false);
    }
  }

  // Message handling
  function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(message);
      addMessage(message, "client");
      elements.messageInput.value = "";
    } else {
      addMessage("Failed to send - not connected", "error");
    }
  }

  function addMessage(text, source) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${source}`;
    messageElement.textContent = text;
    elements.messagesContainer.appendChild(messageElement);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
  }

  // UI updates
  function updateStatus(online) {
    elements.status.classList.toggle("online", online);
    elements.status.classList.toggle("offline", !online);
    elements.statusText.textContent = online ? "Online" : "Offline";
  }

  function showErrorPage(errorType = "connection") {
    elements.errorPage.classList.remove("hidden");
    elements.appContent.classList.add("hidden");
    elements.errorDetails.textContent = errorType === "server"
      ? "The server is not responding. Please try again later."
      : "Failed to connect to the server. Please check your internet connection and try again.";
  }

  function hideErrorPage() {
    elements.errorPage.classList.add("hidden");
    elements.appContent.classList.remove("hidden");
  }

  function showOfflineState() {
    updateStatus(false);
  }

  return { init };
})();

// Service Worker Registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(reg => console.log("ServiceWorker registered"))
      .catch(err => console.log("ServiceWorker registration failed:", err));
  });
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => connectivityManager.init());
