const mqtt = require('mqtt');
const { pool } = require('../config/database');
require('dotenv').config({ path: './config.env' });

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectedUsers = new Map(); // Map để track users đã login
    this.sensorCache = new Map(); // Cache để lưu tạm temperature/humidity
    this.motionCache = new Map(); // Cache để track motion detection time
  }

  connect() {
    try {
      this.client = mqtt.connect(process.env.MQTT_BROKER_URL, {
        clientId: process.env.MQTT_CLIENT_ID || 'backend_client',
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        this.isConnected = true;
        this.subscribeToTopics();
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT connection error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        console.log('🔄 MQTT reconnecting...');
      });

    } catch (error) {
      console.error('❌ Error creating MQTT client:', error);
    }
  }

  subscribeToTopics() {
    const topics = [
      'iot/temperature',
      'iot/humidity', 
      'iot/motion'
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`❌ Error subscribing to ${topic}:`, err);
        } else {
          console.log(`✅ Subscribed to ${topic}`);
        }
      });
    });
    
    console.log(`📡 MQTT subscribed to topics: ${topics.join(', ')}`);
  }

  async handleMessage(topic, message) {
    try {
      const value = message.toString();

      // Test database connection first
      const dbConnected = await this.testDatabaseConnection();
      if (!dbConnected) {
        return;
      }

      // Chỉ lưu dữ liệu vào database cho users đã login (để real-time)
      for (const [userId, userData] of this.connectedUsers) {
        if (userId && typeof userId === 'number' && userId > 0) {
          await this.saveSensorData(topic, value, userId);
        }
      }

      // Broadcast data đến tất cả WebSocket clients
      this.broadcastToWebSocket(topic, value);

    } catch (error) {
      console.error('❌ Error handling MQTT message:', error);
    }
  }

  async saveSensorData(topic, value, userId) {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        console.log(`⚠️ Invalid userId: ${userId}, skipping save for topic: ${topic}`);
        return;
      }

      switch (topic) {
        case 'iot/temperature':
        case 'iot/humidity':
          try {
            // Cache và lưu cả temperature và humidity cùng lúc
            const cacheKey = `dht_${userId}`;
            let sensorData = this.sensorCache.get(cacheKey) || { temperature: null, humidity: null };
            
            if (topic === 'iot/temperature') {
              const tempValue = parseFloat(value);
              if (isNaN(tempValue)) {
                console.log(`⚠️ Invalid temperature value: ${value} for user ${userId}`);
                return;
              }
              sensorData.temperature = tempValue;
            } else if (topic === 'iot/humidity') {
              const humValue = parseFloat(value);
              if (isNaN(humValue)) {
                console.log(`⚠️ Invalid humidity value: ${value} for user ${userId}`);
                return;
              }
              sensorData.humidity = humValue;
            }
            
            // Lưu vào cache
            this.sensorCache.set(cacheKey, sensorData);
            
            // Nếu có cả temperature và humidity, lưu vào database
            if (sensorData.temperature !== null && sensorData.humidity !== null) {
              await pool.execute(
                'INSERT INTO dhtsensor (user_id, temperature, humidity) VALUES (?, ?, ?)',
                [userId, sensorData.temperature, sensorData.humidity]
              );
              
              // Clear cache sau khi lưu
              this.sensorCache.delete(cacheKey);
            }
          } catch (dhtError) {
            console.error(`❌ Error processing DHT data for user ${userId}:`, dhtError);
          }
          break;

        case 'iot/motion':
          try {
            // Chỉ lưu khi có chuyển động (motion = 1) và giãn cách tối thiểu 2 giây
            const motionValue = parseInt(value);
            
            if (isNaN(motionValue)) {
              console.log(`⚠️ Invalid motion value: ${value} for user ${userId}`);
              return;
            }
            
            if (motionValue === 1) {
              const motionKey = `motion_${userId}`;
              const lastMotionTime = this.motionCache.get(motionKey);
              const currentTime = Date.now();
              
              // Kiểm tra xem đã qua 2 giây chưa
              if (!lastMotionTime || (currentTime - lastMotionTime) >= 2000) {
                await pool.execute(
                  'INSERT INTO motionsensor (user_id, motion) VALUES (?, ?)',
                  [userId, motionValue]
                );
                
                // Cập nhật thời gian motion cuối cùng
                this.motionCache.set(motionKey, currentTime);
              }
            }
          } catch (motionError) {
            console.error(`❌ Error processing motion data for user ${userId}:`, motionError);
          }
          break;

        default:
          console.log(`Unknown topic: ${topic}`);
      }
    } catch (error) {
      console.error(`❌ Error saving sensor data for topic ${topic}:`, error);
    }
  }

  broadcastToWebSocket(topic, value) {
    // Sẽ được implement trong WebSocket service
    if (global.wsService) {
      global.wsService.broadcast({
        type: 'sensor_data',
        topic,
        value,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Thêm user vào danh sách connected
  addConnectedUser(userId, userData) {
    this.connectedUsers.set(userId, userData);
    console.log(`👤 Added user ${userId} to connected users list`);
  }

  // Xóa user khỏi danh sách connected
  removeConnectedUser(userId) {
    this.connectedUsers.delete(userId);
    console.log(`👤 Removed user ${userId} from connected users list`);
  }

  // Publish message đến Arduino
  publishMessage(topic, message) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message.toString(), (err) => {
        if (err) {
          console.error(`❌ Error publishing to ${topic}:`, err);
        }
      });
    } else {
      console.error('❌ MQTT client not connected');
    }
  }

  // Control light
  controlLight(status) {
    this.publishMessage('iot/light', status);
  }

  // Debug method để kiểm tra cache
  debugCache() {
    console.log('🔍 Debug Cache Status:');
    console.log('📊 Sensor Cache:', this.sensorCache);
    console.log('📊 Motion Cache:', this.motionCache);
    console.log('👥 Connected Users:', this.connectedUsers);
  }

  // Test database connection
  async testDatabaseConnection() {
    try {
      await pool.execute('SELECT 1 as test');
      return true;
    } catch (error) {
      return false;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('🔌 MQTT service disconnected');
    }
  }
}

module.exports = new MQTTService();