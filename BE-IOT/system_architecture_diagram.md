# Sơ đồ kiến trúc hệ thống IoT Web

## Hình 0.2: Sơ đồ hoạt động hệ thống IoT Web

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              HỆ THỐNG IOT WEB                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HARDWARE      │    │   MQTT BROKER   │    │   BACKEND       │
│   LAYER         │    │   (HiveMQ)      │    │   (Node.js)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   DHT11   │  │    │  │   MQTT    │  │    │  │  Express  │  │
│  │  Sensor   │  │    │  │  Broker   │  │    │  │  Server   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│        │        │    │        │        │    │        │        │
│  ┌───────────┐  │    │        │        │    │  ┌───────────┐  │
│  │   PIR     │  │    │        │        │    │  │  WebSocket│  │
│  │  Motion   │  │    │        │        │    │  │  Service  │  │
│  │  Sensor   │  │    │        │        │    │  └───────────┘  │
│  └───────────┘  │    │        │        │    │        │        │
│        │        │    │        │        │    │  ┌───────────┐  │
│  ┌───────────┐  │    │        │        │    │  │   MQTT    │  │
│  │  ESP8266  │  │    │        │        │    │  │  Service  │  │
│  │  Arduino  │  │    │        │        │    │  └───────────┘  │
│  └───────────┘  │    │        │        │    │        │        │
└─────────┬───────┘    └────────┬────────┘    └────────┬───────┘
          │                     │                      │
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   MQTT      │    │   MQTT      │    │   HTTP      │
    │  Protocol   │    │  Protocol   │    │  Protocol   │
    └─────────────┘    └─────────────┘    └─────────────┘
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   MQTT      │    │   MQTT      │    │   WebSocket │
    │  Broker     │    │  Broker     │    │  Protocol   │
    └─────────────┘    └─────────────┘    └─────────────┘
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   MQTT      │    │   MQTT      │    │   Frontend  │
    │  Protocol   │    │  Protocol   │    │  (React.js) │
    └─────────────┘    └─────────────┘    └─────────────┘
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   MQTT      │    │   MQTT      │    │   WebSocket │
    │  Service    │    │  Service    │    │  Service    │
    └─────────────┘    └─────────────┘    └─────────────┘
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   Database  │    │   Database  │    │   Frontend  │
    │  (MySQL)    │    │  (MySQL)    │    │  (React.js) │
    └─────────────┘    └─────────────┘    └─────────────┘
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   Data      │    │   Data      │    │   User      │
    │  Storage    │    │  Storage    │    │  Interface  │
    └─────────────┘    └─────────────┘    └─────────────┘
          │                     │                      │
          │                     │                      │
          ▼                     ▼                      ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   Google    │    │   Google    │    │   Browser   │
    │   Sheets    │    │   Sheets    │    │  (Chrome)   │
    └─────────────┘    └─────────────┘    └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CHI TIẾT LUỒNG DỮ LIỆU                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

1. HARDWARE LAYER:
   - DHT11 Sensor: Đo nhiệt độ và độ ẩm
   - PIR Motion Sensor: Phát hiện chuyển động
   - ESP8266 Arduino: Xử lý và gửi dữ liệu

2. MQTT BROKER (HiveMQ):
   - Nhận dữ liệu từ ESP8266
   - Phân phối dữ liệu đến Backend
   - Quản lý các topic: iot/temperature, iot/humidity, iot/motion, iot/light

3. BACKEND (Node.js):
   - Express Server: API REST
   - MQTT Service: Kết nối và xử lý dữ liệu MQTT
   - WebSocket Service: Giao tiếp real-time với Frontend
   - Database: Lưu trữ dữ liệu MySQL
   - Authentication: JWT token

4. FRONTEND (React.js):
   - Dashboard: Hiển thị dữ liệu real-time
   - Login/Register: Xác thực người dùng
   - WebSocket Client: Nhận dữ liệu real-time
   - Google Sheets Integration: Ghi log

5. DATABASE (MySQL):
   - users: Thông tin người dùng
   - dhtsensor: Dữ liệu nhiệt độ/độ ẩm
   - motionsensor: Dữ liệu chuyển động
   - action: Lịch sử điều khiển

6. EXTERNAL SERVICES:
   - Google Sheets: Ghi log hệ thống
   - Google Apps Script: Xử lý dữ liệu

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PROTOCOLS & TECHNOLOGIES                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

- MQTT Protocol: Giao tiếp giữa ESP8266 và MQTT Broker
- WebSocket Protocol: Giao tiếp real-time giữa Backend và Frontend
- HTTP/HTTPS: API REST và giao tiếp web
- JWT: Xác thực người dùng
- MySQL: Cơ sở dữ liệu
- React.js: Frontend framework
- Node.js: Backend runtime
- Express.js: Web framework
- Tailwind CSS: Styling framework 