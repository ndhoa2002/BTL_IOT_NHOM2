# 🌡️ IoT Status Dashboard

Một dashboard thời gian thực hiển thị dữ liệu từ thiết bị IoT ESP8266 thông qua giao thức MQTT.

## ✨ Tính năng

- 📊 Hiển thị nhiệt độ, độ ẩm, và trạng thái chuyển động real-time
- 🔗 Kết nối MQTT WebSocket
- 🎨 Giao diện đẹp với TailwindCSS
- 📱 Responsive design
- 🟢 Hiển thị trạng thái kết nối MQTT

## 🛠️ Công nghệ sử dụng

- **ReactJS** - Frontend framework
- **MQTT.js** - MQTT client cho WebSocket
- **TailwindCSS** - Styling
- **ESP8266** - Thiết bị IoT (publisher)

## 📋 Yêu cầu hệ thống

- Node.js >= 16.x
- npm hoặc yarn
- MQTT Broker hỗ trợ WebSocket (ví dụ: Mosquitto)

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình MQTT Broker

Mặc định, ứng dụng kết nối tới:

- **Host**: `192.168.1.100`
- **Port**: `9001` (WebSocket)

Để thay đổi địa chỉ broker, sửa file `src/components/Dashboard.js`:

```javascript
const mqttClient = mqtt.connect("ws://YOUR_BROKER_IP:9001");
```

### 3. Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## 📊 MQTT Topics

Dashboard subscribe các topics sau:

| Topic             | Mô tả         | Dữ liệu mẫu               |
| ----------------- | ------------- | ------------------------- |
| `iot/temperature` | Nhiệt độ (°C) | `"29.5"`                  |
| `iot/humidity`    | Độ ẩm (%)     | `"63.1"`                  |
| `iot/motion`      | Chuyển động   | `"1"` (có), `"0"` (không) |

## 🖥️ Giao diện

Dashboard hiển thị:

1. **Header** - Tiêu đề và trạng thái kết nối MQTT
2. **Cards chính**:
   - 🌡️ Nhiệt độ (màu đỏ)
   - 💧 Độ ẩm (màu xanh dương)
   - 🔔 Phát hiện chuyển động (xanh lá nếu có, xám nếu không)
3. **Thông tin kết nối** - Chi tiết broker và topics
4. **Footer** - Thông tin thiết bị

## ⚙️ Cấu hình MQTT Broker (Mosquitto)

### Cài đặt Mosquitto

**Ubuntu/Debian:**

```bash
sudo apt install mosquitto mosquitto-clients
```

**macOS:**

```bash
brew install mosquitto
```

### Cấu hình WebSocket

Tạo file cấu hình `/etc/mosquitto/conf.d/websocket.conf`:

```
listener 1883
protocol mqtt

listener 9001
protocol websockets
```

### Khởi động Mosquitto

```bash
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

## 🧪 Test MQTT

Để test kết nối, bạn có thể publish dữ liệu thử:

```bash
# Test nhiệt độ
mosquitto_pub -h 192.168.1.100 -t iot/temperature -m "25.6"

# Test độ ẩm
mosquitto_pub -h 192.168.1.100 -t iot/humidity -m "58.2"

# Test chuyển động
mosquitto_pub -h 192.168.1.100 -t iot/motion -m "1"
```

## 📱 ESP8266 Code Mẫu

```cpp
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(2, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int motion = digitalRead(0); // PIR sensor

  client.publish("iot/temperature", String(temp).c_str());
  client.publish("iot/humidity", String(hum).c_str());
  client.publish("iot/motion", String(motion).c_str());

  delay(2000);
}
```

## 🔧 Troubleshooting

### Lỗi kết nối MQTT

- Kiểm tra IP và port của broker
- Đảm bảo firewall không chặn port 9001
- Kiểm tra Mosquitto có chạy và cấu hình WebSocket

### Lỗi CORS

- Đảm bảo broker hỗ trợ CORS cho WebSocket
- Thử dùng broker cloud nếu cần

### Dashboard không nhận dữ liệu

- Kiểm tra topics đúng format
- Xem console log để debug
- Test bằng MQTT client tools

## 📁 Cấu trúc project

```
IOT/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Dashboard.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🤝 Contributing

1. Fork project
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Distributed under the MIT License.

## 📧 Liên hệ

Nếu có thắc mắc, vui lòng tạo issue trên GitHub repo.
