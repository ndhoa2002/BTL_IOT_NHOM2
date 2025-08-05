const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get latest sensor data for a user
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get latest DHT sensor data
    const [dhtData] = await pool.execute(
      'SELECT humidity, temperature, time FROM dhtsensor WHERE user_id = ? ORDER BY time DESC LIMIT 1',
      [userId]
    );

    // Get latest motion sensor data
    const [motionData] = await pool.execute(
      'SELECT motion, time FROM motionsensor WHERE user_id = ? ORDER BY time DESC LIMIT 1',
      [userId]
    );

    // Get latest action data
    const [actionData] = await pool.execute(
      'SELECT status, time FROM action WHERE user_id = ? ORDER BY time DESC LIMIT 1',
      [userId]
    );

    res.json({
      dht: dhtData[0] || { humidity: null, temperature: null, time: null },
      motion: motionData[0] || { motion: 0, time: null },
      action: actionData[0] || { status: 0, time: null }
    });

  } catch (error) {
    console.error('Get latest data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get sensor data history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 100 } = req.query;

    let query, params;

    switch (type) {
      case 'dht':
        query = 'SELECT humidity, temperature, time FROM dhtsensor WHERE user_id = ? ORDER BY time DESC LIMIT ?';
        params = [userId, parseInt(limit)];
        break;
      case 'motion':
        query = 'SELECT motion, time FROM motionsensor WHERE user_id = ? ORDER BY time DESC LIMIT ?';
        params = [userId, parseInt(limit)];
        break;
      case 'action':
        query = 'SELECT status, time FROM action WHERE user_id = ? ORDER BY time DESC LIMIT ?';
        params = [userId, parseInt(limit)];
        break;
      default:
        return res.status(400).json({ message: 'Invalid type parameter. Use: dht, motion, or action' });
    }

    const [data] = await pool.execute(query, params);
    res.json({ data });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Control light (toggle action)
router.post('/control-light', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    if (status === undefined || ![0, 1].includes(status)) {
      return res.status(400).json({ message: 'Status must be 0 or 1' });
    }

    // Insert new action record
    await pool.execute(
      'INSERT INTO action (user_id, status) VALUES (?, ?)',
      [userId, status]
    );

    res.json({ 
      message: `Light ${status === 1 ? 'turned on' : 'turned off'} successfully`,
      status,
      time: new Date()
    });

  } catch (error) {
    console.error('Control light error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get sensor statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    // DHT sensor stats
    const [dhtStats] = await pool.execute(
      `SELECT 
        AVG(humidity) as avg_humidity,
        AVG(temperature) as avg_temperature,
        MAX(temperature) as max_temperature,
        MIN(temperature) as min_temperature,
        COUNT(*) as total_readings
       FROM dhtsensor 
       WHERE user_id = ? AND time >= ?`,
      [userId, dateFilter]
    );

    // Motion sensor stats
    const [motionStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_detections,
        COUNT(CASE WHEN motion = 1 THEN 1 END) as motion_detected
       FROM motionsensor 
       WHERE user_id = ? AND time >= ?`,
      [userId, dateFilter]
    );

    // Action stats
    const [actionStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN status = 1 THEN 1 END) as light_on_actions
       FROM action 
       WHERE user_id = ? AND time >= ?`,
      [userId, dateFilter]
    );

    res.json({
      period: `${days} days`,
      dht: dhtStats[0],
      motion: motionStats[0],
      action: actionStats[0]
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router; 