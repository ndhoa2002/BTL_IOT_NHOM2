const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config({ path: './config.env' });

// Import services and configs
const { testConnection } = require('./config/database');
const mqttService = require('./services/mqttService');
const WebSocketService = require('./services/webSocketService');

// Import routes
const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global variables
global.mqttService = mqttService;

// Initialize WebSocket service
const wsService = new WebSocketService(server);
global.wsService = wsService;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mqttConnected: mqttService.isConnected,
    wsClients: wsService.getConnectedClientsCount(),
    uptime: process.uptime()
  });
});

// WebSocket status endpoint
app.get('/api/ws-status', (req, res) => {
  res.json({
    connectedClients: wsService.getConnectedClientsCount(),
    connectedUsers: wsService.getConnectedUsers()
  });
});

// Debug MQTT cache endpoint
app.get('/api/debug/mqtt-cache', (req, res) => {
  mqttService.debugCache();
  res.json({
    message: 'Cache debug info logged to console',
    mqttConnected: mqttService.isConnected,
    connectedUsers: mqttService.connectedUsers.size
  });
});

// Test database connection and tables
app.get('/api/debug/database', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // Test database connection
    const [testResult] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connection test:', testResult[0]);
    
    // Test users table
    const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
    
    // Test dhtsensor table
    const [dhtCount] = await pool.execute('SELECT COUNT(*) as count FROM dhtsensor');
    
    // Test motionsensor table
    const [motionCount] = await pool.execute('SELECT COUNT(*) as count FROM motionsensor');
    
    // Test action table
    const [actionCount] = await pool.execute('SELECT COUNT(*) as count FROM action');
    
    // Test MQTT service database connection
    const mqttDbConnected = await mqttService.testDatabaseConnection();
    
    res.json({
      message: 'Database connection successful',
      mqttDbConnected,
      tables: {
        users: users[0].count,
        dhtsensor: dhtCount[0].count,
        motionsensor: motionCount[0].count,
        action: actionCount[0].count
      }
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Start MQTT service
    mqttService.connect();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 WebSocket status: http://localhost:${PORT}/api/ws-status`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  mqttService.disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  mqttService.disconnect();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer(); 