# 🏠 IoT Smart Home Backend

Backend server cho hệ thống Smart Home IoT với MQTT, WebSocket và MySQL database.

## 🚀 Tính năng

- **Authentication**: JWT-based authentication với register/login
- **MQTT Integration**: Kết nối với Arduino qua MQTT broker
- **WebSocket**: Real-time communication với frontend
- **Database**: MySQL với 4 bảng chính
- **REST API**: RESTful endpoints cho sensors và users

## 📋 Cấu trúc Database

### Bảng `users`
- `id` (Primary Key)
- `username` (Unique)
- `password` (Hashed)
- `email` (Unique)
- `phone`
- `created_at`, `updated_at`

### Bảng `dhtsensor`
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `humidity`
- `temperature`
- `time`

### Bảng `motionsensor`
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `motion`
- `time`

### Bảng `action`
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `status`
- `time`

## 🛠️ Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình Database
- Tạo database MySQL
- Chạy file `database.sql` để tạo tables
- Cập nhật thông tin database trong `config.env`

### 3. Cấu hình Environment
Copy file `config.env` và cập nhật các thông tin:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=iot_dashboard
DB_PORT=3306

# MQTT Configuration
MQTT_BROKER_URL=ws://192.168.1.5:9001
MQTT_CLIENT_ID=backend_client

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

### 4. Chạy server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Sensors
- `GET /api/sensors/latest` - Lấy dữ liệu sensor mới nhất
- `GET /api/sensors/history?type=dht&limit=100` - Lấy lịch sử sensor
- `POST /api/sensors/control-light` - Điều khiển đèn
- `GET /api/sensors/stats?days=7` - Thống kê sensor

### Health Check
- `GET /api/health` - Kiểm tra trạng thái server
- `GET /api/ws-status` - Trạng thái WebSocket

## 🔌 WebSocket Events

### Client → Server
```javascript
// Control light
{
  type: 'control_light',
  status: 0 // 0 = off, 1 = on
}

// Get latest data
{
  type: 'get_latest_data'
}

// Ping
{
  type: 'ping'
}
```

### Server → Client
```javascript
// Sensor data update
{
  type: 'sensor_data',
  topic: 'iot/temperature',
  value: '25.5',
  timestamp: '2024-01-01T00:00:00.000Z'
}

// Latest data response
{
  type: 'latest_data',
  data: {
    dht: { humidity: 60, temperature: 25.5, time: '...' },
    motion: { motion: 0, time: '...' },
    action: { status: 1, time: '...' }
  }
}

// Light control response
{
  type: 'light_control_response',
  status: 1,
  message: 'Light turned on successfully'
}
```

## 🔐 Authentication

### JWT Token
- Token được gửi trong header: `Authorization: Bearer <token>`
- WebSocket connection cần token trong query string: `ws://localhost:5000?token=<token>`

### User Flow
1. User đăng ký/đăng nhập → Nhận JWT token
2. Frontend lưu token vào localStorage
3. WebSocket kết nối với token
4. Backend xác thực token và track user
5. MQTT data được lưu cho user đã login

## 📊 MQTT Topics

- `iot/temperature` - Nhiệt độ từ DHT sensor
- `iot/humidity` - Độ ẩm từ DHT sensor
- `iot/motion` - Trạng thái chuyển động
- `iot/light` - Trạng thái đèn

## 🚨 Error Handling

- Database connection errors
- MQTT connection failures
- WebSocket authentication errors
- Invalid JWT tokens
- Missing required fields

## 🔧 Development

### Scripts
```bash
npm run dev    # Development với nodemon
npm start      # Production
```

### Logs
- Console logs với emoji để dễ đọc
- Error handling chi tiết
- Connection status tracking

## 📝 Notes

- Backend chỉ kết nối MQTT khi có user login
- Mỗi user có dữ liệu sensor riêng biệt
- WebSocket connection được authenticate bằng JWT
- Auto-reconnect cho MQTT và WebSocket
- Graceful shutdown handling

## 🔗 Frontend Integration

Frontend cần:
1. Gửi token trong WebSocket connection
2. Handle WebSocket events
3. Gọi REST API với Authorization header
4. Store JWT token trong localStorage 