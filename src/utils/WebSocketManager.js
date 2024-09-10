import { v4 as uuidv4 } from 'uuid'; // Import UUID library

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.onMessageCallbacks = [];
    this.reconnectInterval = 5000; // 5 seconds
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.messageQueue = []; // Queue for messages to be sent when the connection is open
  }

  // Generate a unique player ID using UUID
  generatePlayerId() {
    return uuidv4();
  }

  connect() {
    this.socket = new WebSocket('ws://localhost:6789');

    this.socket.onopen = () => {
      console.log('WebSocket connection established.');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Send any queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.sendData(message);
      }
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Notify all registered listeners
      this.onMessageCallbacks.forEach(callback => callback(data));
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed.');
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.socket.close(); // Close the socket and try to reconnect
    };
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(); // Try to reconnect
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnect attempts reached. Unable to reconnect to WebSocket.');
    }
  }

  sendData(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send data. WebSocket is not open, queuing message.');
      this.messageQueue.push(data); // Queue the message if the socket is not open
    }
  }

  registerOnMessage(callback) {
    this.onMessageCallbacks.push(callback);
  }

  unregisterOnMessage(callback) {
    this.onMessageCallbacks = this.onMessageCallbacks.filter(cb => cb !== callback);
  }
}

export default new WebSocketManager();
