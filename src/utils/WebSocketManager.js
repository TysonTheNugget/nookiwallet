// WebSocketManager.js

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.onMessageCallbacks = [];
    this.token = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.messageQueue = []; // Queue for messages to be sent when the connection is open
    this.authenticated = false; // Flag to indicate if authentication is complete
  }

  connect(token) {
    this.token = token;
    this.socket = new WebSocket('ws://localhost:6789');

    this.socket.onopen = () => {
      console.log('WebSocket connection established.');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // Log the token being sent
      console.log(`Sending authentication token: ${this.token}`);

      // Send the authentication token
      this.socket.send(JSON.stringify({ token: this.token }));
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        console.error('WebSocket error:', data.error);

        if (data.error === 'Authentication failed') {
          // Close the socket and prevent further reconnection attempts
          this.socket.close();
          this.maxReconnectAttempts = 0;
          // Optionally, notify the user or redirect to login
          alert('Authentication failed. Please log in again.');
        }
      } else if (data.authenticated) {
        // Authentication successful
        console.log('Authentication successful.');
        this.authenticated = true;

        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.sendData(message);
        }
      } else {
        // Notify all registered listeners
        this.onMessageCallbacks.forEach((callback) => callback(data));
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed.');
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      // No need to call close here; the 'onclose' event will be triggered
    };
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.token); // Try to reconnect with the token
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnect attempts reached. Unable to reconnect to WebSocket.');
    }
  }

  sendData(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      if (this.authenticated) {
        this.socket.send(JSON.stringify(data));
      } else {
        console.warn('Cannot send data. Authentication not yet completed, queuing message.');
        this.messageQueue.push(data);
      }
    } else {
      console.warn('Cannot send data. WebSocket is not open, queuing message.');
      this.messageQueue.push(data);
    }
  }

  registerOnMessage(callback) {
    this.onMessageCallbacks.push(callback);
  }

  unregisterOnMessage(callback) {
    this.onMessageCallbacks = this.onMessageCallbacks.filter((cb) => cb !== callback);
  }
}

export default new WebSocketManager();
