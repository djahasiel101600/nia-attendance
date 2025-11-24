// services/SignalRService.js
import { API_CONFIG, APP_CONFIG } from '../constants/config';

class SignalRService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.callbacks = [];
    this.messageId = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = APP_CONFIG.MAX_RECONNECT_ATTEMPTS;
  }

  addCallback(callback) {
    if (typeof callback === 'function') {
      this.callbacks.push(callback);
    }
  }

  removeCallback(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  notifyCallbacks(signalType, data = null) {
    this.callbacks.forEach(callback => {
      try {
        callback(signalType, data);
      } catch (error) {
        console.error('SignalR callback error:', error);
      }
    });
  }

  // Build WebSocket URL for ASP.NET SignalR
  buildWebSocketUrl(connectionToken) {
    // ASP.NET SignalR uses this format
    const url = `wss://${API_CONFIG.BASE_URL.replace(/^https?:\/\//, '')}/signalr/connect?transport=webSockets&clientProtocol=${API_CONFIG.SIGNALR_CLIENT_PROTOCOL}&connectionToken=${encodeURIComponent(connectionToken)}&connectionData=${encodeURIComponent(`[{"name":"${API_CONFIG.SIGNALR_HUB_NAME}"}]`)}&tid=${Math.floor(Math.random() * 10)}`;
    return url;
  }

  // Send SignalR message
  sendMessage(hub, method, args = []) {
    if (this.ws && this.isConnected) {
      const message = {
        H: hub,
        M: method,
        A: args,
        I: this.messageId++
      };
      
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Handle WebSocket messages
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.M) { // Messages array
        data.M.forEach(message => {
          if (message.H === API_CONFIG.SIGNALR_HUB_NAME && message.M === 'update') {
            this.notifyCallbacks('NEW_DATA_AVAILABLE');
          }
        });
      }
    } catch (error) {
      console.error('Error parsing SignalR message:', error);
    }
  }

  // Start connection
  async startConnection(connectionToken, sessionCookies) {
    try {
      if (this.ws) {
        this.ws.close();
      }

      const wsUrl = this.buildWebSocketUrl(connectionToken);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send initial join message
        this.sendMessage(API_CONFIG.SIGNALR_HUB_NAME, 'Join');
        
        this.notifyCallbacks('CONNECTED');
      };
      
      this.ws.onmessage = (event) => this.handleMessage(event);
      
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.notifyCallbacks('DISCONNECTED', { error: `Connection closed: ${event.code}` });
        
        // Attempt reconnect
        this.attemptReconnect(connectionToken, sessionCookies);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        this.notifyCallbacks('CONNECTION_FAILED', { error });
      };
      
      return true;
    } catch (error) {
      console.error('Error starting WebSocket connection:', error);
      this.notifyCallbacks('CONNECTION_FAILED', { error });
      return false;
    }
  }

  // Attempt to reconnect
  attemptReconnect(connectionToken, sessionCookies) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.startConnection(connectionToken, sessionCookies);
        }
      }, delay);
    }
  }

  // Stop connection
  async stopConnection() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnects
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default new SignalRService();