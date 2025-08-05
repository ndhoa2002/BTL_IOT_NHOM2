const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config.env' });

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map để track clients và user info
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection');

      // Authenticate connection
      this.authenticateConnection(ws, req);

      ws.on('message', (message) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });

    console.log('✅ WebSocket server started');
  }

  authenticateConnection(ws, req) {
    try {
      // Get token from query string or headers
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.authorization?.split(' ')[1];

      if (!token) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication token required'
        }));
        ws.close();
        return;
      }

      // Verify JWT token
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid or expired token'
          }));
          ws.close();
          return;
        }

        // Store client with user info
        this.clients.set(ws, {
          userId: decoded.id,
          username: decoded.username,
          email: decoded.email,
          connectedAt: new Date()
        });

        console.log(`👤 User ${decoded.username} connected via WebSocket`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connection',
          message: 'Connected successfully',
          user: {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email
          }
        }));

        // Add user to MQTT service
        if (global.mqttService) {
          global.mqttService.addConnectedUser(decoded.id, {
            username: decoded.username,
            email: decoded.email
          });
        }
      });

    } catch (error) {
      console.error('❌ WebSocket authentication error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication failed'
      }));
      ws.close();
    }
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received WebSocket message:', data);

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'control_light':
          this.handleLightControl(ws, data);
          break;

        case 'get_latest_data':
          this.sendLatestData(ws);
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type'
          }));
      }

    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  async handleLightControl(ws, data) {
    try {
      const clientInfo = this.clients.get(ws);
      if (!clientInfo) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Client not authenticated'
        }));
        return;
      }

      const { status } = data;
      if (status === undefined || ![0, 1].includes(status)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid light status'
        }));
        return;
      }

      // Control light via MQTT
      if (global.mqttService) {
        global.mqttService.controlLight(status);
      }

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'light_control_response',
        status,
        message: `Light ${status === 1 ? 'turned on' : 'turned off'} successfully`,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ Error handling light control:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to control light'
      }));
    }
  }

  async sendLatestData(ws) {
    try {
      const clientInfo = this.clients.get(ws);
      if (!clientInfo) {
        return;
      }

      // Get latest data from database
      const { pool } = require('../config/database');

      const [dhtData] = await pool.execute(
        'SELECT humidity, temperature, time FROM dhtsensor WHERE user_id = ? ORDER BY time DESC LIMIT 1',
        [clientInfo.userId]
      );

      const [motionData] = await pool.execute(
        'SELECT motion, time FROM motionsensor WHERE user_id = ? ORDER BY time DESC LIMIT 1',
        [clientInfo.userId]
      );

      const [actionData] = await pool.execute(
        'SELECT status, time FROM action WHERE user_id = ? ORDER BY time DESC LIMIT 1',
        [clientInfo.userId]
      );

      ws.send(JSON.stringify({
        type: 'latest_data',
        data: {
          dht: dhtData[0] || { humidity: null, temperature: null, time: null },
          motion: motionData[0] || { motion: 0, time: null },
          action: actionData[0] || { status: 0, time: null }
        },
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('❌ Error sending latest data:', error);
    }
  }

  handleDisconnection(ws) {
    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      console.log(`👤 User ${clientInfo.username} disconnected from WebSocket`);
      
      // Remove from MQTT service
      if (global.mqttService) {
        global.mqttService.removeConnectedUser(clientInfo.userId);
      }
      
      this.clients.delete(ws);
    }
  }

  // Broadcast message to all connected clients
  broadcast(message) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Send message to specific user
  sendToUser(userId, message) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.wss.clients.forEach((client) => {
      const clientInfo = this.clients.get(client);
      if (client.readyState === WebSocket.OPEN && clientInfo && clientInfo.userId === userId) {
        client.send(messageStr);
      }
    });
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Get connected users info
  getConnectedUsers() {
    const users = [];
    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        users.push(clientInfo);
      }
    });
    return users;
  }
}

module.exports = WebSocketService; 