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
      const raw = event.data;
      // Ignore keepalive pings (e.g. "0" every ~10s) and non-JSON
      if (raw === '' || raw === '0' || raw === 0) return;

      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data || typeof data !== 'object') return;

      if (data.M) { // Messages array
        data.M.forEach(message => {
          const hub = (message.H || '').toString();
          const method = (message.M || '').toString();
          const expectedHub = (API_CONFIG.SIGNALR_HUB_NAME || '').toString();
          if (hub.toLowerCase() === expectedHub.toLowerCase() && method.toLowerCase() === 'update') {
            console.log('📡 SignalR: Attendance update received');
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
      console.log('🔌 SignalR: Opening WebSocket...');
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('✅ SignalR: WebSocket connected');
        
        // Send initial join message
        this.sendMessage(API_CONFIG.SIGNALR_HUB_NAME, 'Join');
        console.log('📤 SignalR: Join sent');
        
        this.notifyCallbacks('CONNECTED');
      };
      
      this.ws.onmessage = (event) => this.handleMessage(event);
      
      this.ws.onclose = (event) => {
        this.isConnected = false;
        console.log('❌ SignalR: WebSocket closed', event.code, event.reason || '');
        this.notifyCallbacks('DISCONNECTED', { error: `Connection closed: ${event.code}` });
        
        // Attempt reconnect
        this.attemptReconnect(connectionToken, sessionCookies);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ SignalR: WebSocket error', error);
        this.isConnected = false;
        this.notifyCallbacks('CONNECTION_FAILED', { error });
      };
      
      return true;
    } catch (error) {
      console.error('❌ SignalR: Failed to start WebSocket', error);
      this.notifyCallbacks('CONNECTION_FAILED', { error });
      return false;
    }
  }

  // Attempt to reconnect
  attemptReconnect(connectionToken, sessionCookies) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.notifyCallbacks('RECONNECTING');
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