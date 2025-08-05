#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

const char* ssid = "405 wifi";
const char* password = "andaubuoiancut";
const char* mqtt_server = "broker.hivemq.com";  // Thay đổi này - dùng HiveMQ
const int mqtt_port = 1883;

#define LIGHT D3
#define PIR_PIN D5
#define LED_PIN D6
#define DHT_PIN D4
#define DHTTYPE DHT11

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHTTYPE);

unsigned long lastReadTime = 0;
const long interval = 3000;

void callback(char* topic, byte* payload, unsigned int length) {
  payload[length] = '\0'; // kết thúc chuỗi
  String message = String((char*)payload);

  if (String(topic) == "iot/light") {
    if (message == "1") {
      digitalWrite(LIGHT, HIGH);
      Serial.println("💡 Bật đèn");
    } else {
      digitalWrite(LIGHT, LOW);
      Serial.println("💡 Tắt đèn");
    }
  }
}

void setup_wifi() {
  delay(100);
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\n✅ WiFi đã kết nối");
  Serial.print("📡 IP: "); Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("🔄 Đang kết nối MQTT... ");
    if (client.connect("esp8266_client")) {
      Serial.println("✅ thành công");
      client.subscribe("iot/light");  // Đăng ký nhận lệnh bật/tắt
    } else {
      Serial.print("❌ lỗi, rc="); Serial.println(client.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LIGHT, OUTPUT);
  digitalWrite(LIGHT, LOW); // tắt đèn ban đầu

  dht.begin();
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  int motion = digitalRead(PIR_PIN);
  digitalWrite(LED_PIN, motion);
  client.publish("iot/motion", motion == HIGH ? "1" : "0");

  unsigned long now = millis();
  if (now - lastReadTime > interval) {
    lastReadTime = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (!isnan(h)) {
      char humStr[8]; dtostrf(h, 1, 2, humStr);
      client.publish("iot/humidity", humStr);
    }

    if (!isnan(t)) {
      char tempStr[8]; dtostrf(t, 1, 2, tempStr);
      client.publish("iot/temperature", tempStr);
    }

    Serial.print("🌡️ Temp: "); Serial.print(t);
    Serial.print("°C  💧 Humidity: "); Serial.print(h); Serial.println("%");
  }

  delay(100);
} 