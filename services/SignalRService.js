// services/SignalRService.js - WEB SOCKET DIRECT APPROACH
class SignalRService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.callbacks = [];
    this.messageId = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
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
    const url = `wss://attendance.caraga.nia.gov.ph/signalr/connect?transport=webSockets&clientProtocol=1.5&connectionToken=${encodeURIComponent(connectionToken)}&connectionData=${encodeURIComponent('[{"name":"biohub"}]')}&tid=${Math.floor(Math.random() * 10)}`;
    console.log('🔧 WebSocket URL:', url);
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
      console.log('📨 SignalR message:', data);
      
      if (data.M) { // Messages array
        data.M.forEach(message => {
          if (message.H === 'biohub' && message.M === 'update') {
            console.log('🔔 BioHub update received');
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
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send initial join message
        this.sendMessage('biohub', 'Join');
        
        this.notifyCallbacks('CONNECTED');
      };
      
      this.ws.onmessage = (event) => this.handleMessage(event);
      
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.notifyCallbacks('DISCONNECTED', { error: `Connection closed: ${event.code}` });
        
        // Attempt reconnect
        this.attemptReconnect(connectionToken, sessionCookies);
      };
      
      this.ws.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
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
      
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.startConnection(connectionToken, sessionCookies);
        }
      }, delay);
    } else {
      console.log('❌ Max reconnection attempts reached');
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
    console.log('✅ SignalR connection stopped');
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default new SignalRService();