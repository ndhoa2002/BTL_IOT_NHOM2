import React, { useState, useEffect } from "react";

const Dashboard = ({ user, onLogout }) => {
  const [temperature, setTemperature] = useState("--");
  const [humidity, setHumidity] = useState("--");
  const [motion, setMotion] = useState("0");
  const [lightStatus, setLightStatus] = useState("0"); // Add light status state
  const [isConnected, setIsConnected] = useState(false);
  const [wsClient, setWsClient] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Navigation state
  // const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'temperature', 'motion', 'light'

  // Alert system
  const [alerts, setAlerts] = useState([]);
  const [lastMotionTime, setLastMotionTime] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [motionSoundEnabled, setMotionSoundEnabled] = useState(true);
  const [lastAlertTimes, setLastAlertTimes] = useState({
    temperature: null,
    humidity: null,
    motion: null,
    connection: null,
  });
  const [logStatus, setLogStatus] = useState("ready"); // 'ready', 'sending', 'success', 'error'
  const [logsQueue, setLogsQueue] = useState([]);

  // Google Sheets logging configuration
  const GOOGLE_APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyK3BqnygL1FeEWsoIFiHdzrrshkQZ9s7CaQhyWhoWpSKJ4DijGmJ1wZmLc1wbb31A0yg/exec"; // Replace with your script URL

  // Update current time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Function to send log to Google Sheets
  const sendLogToGoogleSheets = async (logData) => {
    try {
      setLogStatus("sending");

      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // Required for Google Apps Script
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logData),
      });

      // Since we use 'no-cors', we can't read the response
      // We'll assume success if no error is thrown
      setLogStatus("success");

      // Remove from queue after successful send
      setLogsQueue((prev) => prev.filter((log) => log.id !== logData.id));

      console.log("✅ Log sent to Google Sheets successfully:", logData);
    } catch (error) {
      console.error("❌ Error sending log to Google Sheets:", error);
      setLogStatus("error");

      // Keep in queue for retry
      if (!logsQueue.find((log) => log.id === logData.id)) {
        setLogsQueue((prev) => [...prev, logData]);
      }
    }
  };

  // Function to retry failed logs
  const retryFailedLogs = async () => {
    if (logsQueue.length === 0) return;

    console.log(`🔄 Retrying ${logsQueue.length} failed logs...`);

    for (const log of logsQueue) {
      await sendLogToGoogleSheets(log);
      // Add delay between retries
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  // Auto-retry failed logs every 5 minutes
  useEffect(() => {
    const retryInterval = setInterval(() => {
      if (logsQueue.length > 0 && logStatus !== "sending") {
        retryFailedLogs();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(retryInterval);
  }, [logsQueue, logStatus]);

  // Function to add new alert with debouncing
  const addAlert = (
    type,
    title,
    message,
    severity = "warning",
    debounceMinutes = 5
  ) => {
    const now = new Date();
    const lastAlertTime = lastAlertTimes[type];

    // Check if enough time has passed since last alert of this type (except for motion alerts)
    if (
      type !== "motion" &&
      lastAlertTime &&
      now - lastAlertTime < debounceMinutes * 60 * 1000
    ) {
      return; // Skip this alert due to debouncing
    }

    // For motion alerts, debounce for 30 seconds to avoid spam
    if (type === "motion" && lastAlertTime && now - lastAlertTime < 30 * 1000) {
      return;
    }

    const newAlert = {
      id: Date.now(),
      type,
      title,
      message,
      severity, // 'info', 'warning', 'danger'
      timestamp: now,
      dismissed: false,
    };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 9)]); // Keep only 10 most recent alerts

    // Update last alert time for this type
    setLastAlertTimes((prev) => ({
      ...prev,
      [type]: now,
    }));

    // Play sound if enabled
    if (soundEnabled && severity !== "info") {
      // Không phát chuông báo thông thường cho motion alerts
      if (type !== "motion") {
        playAlertSound(severity);
      }
    }

    // Send log to Google Sheets
    const logData = {
      id: newAlert.id,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString("vi-VN"),
      time: now.toLocaleTimeString("vi-VN"),
      type: type,
      severity: severity,
      title: title,
      message: message,
      temperature: temperature,
      humidity: humidity,
      motion: motion,
      lightStatus: lightStatus,
      isNightTime: isNightTime(),
      mqttConnected: isConnected,
    };

    // Send to Google Sheets (async, won't block UI)
    sendLogToGoogleSheets(logData);
  };

  // Function to play alert sound
  const playAlertSound = (severity, type = 'alert') => {
    try {
      // Beep cho mọi loại alert
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Motion beep sẽ cao hơn
      if (type === 'motion') {
        oscillator.frequency.value = 900;
        oscillator.type = "square";
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.4
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      } else {
        oscillator.frequency.value = severity === "danger" ? 800 : 600;
        oscillator.type = "square";
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  };

  // Function to dismiss alert
  const dismissAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, dismissed: true } : alert
      )
    );
  };

  // Function to clear all alerts
  const clearAllAlerts = () => {
    setAlerts([]);
  };

  // Check for night time (22:00 - 06:00 GMT+7)
  const isNightTime = () => {
    const vietnamTime = new Date(currentTime.getTime() + 7 * 60 * 60 * 1000);
    const hour = vietnamTime.getUTCHours();
    return hour >= 22 || hour < 6;
  };

  // Monitor temperature for alerts
  useEffect(() => {
    const temp = parseFloat(temperature);
    if (!isNaN(temp)) {
      if (temp > 35) {
        addAlert(
          "temperature",
          "Cảnh báo nhiệt độ cao",
          `Nhiệt độ hiện tại ${temp}°C vượt quá ngưỡng an toàn (35°C)`,
          "danger"
        );
      } else if (temp > 30) {
        addAlert(
          "temperature",
          "Nhiệt độ cao",
          `Nhiệt độ hiện tại ${temp}°C khá cao, cần theo dõi`,
          "warning"
        );
      } else if (temp < 10) {
        addAlert(
          "temperature",
          "Nhiệt độ thấp",
          `Nhiệt độ hiện tại ${temp}°C khá thấp`,
          "warning"
        );
      }
    }
  }, [temperature]);

  // Monitor humidity for alerts
  useEffect(() => {
    const hum = parseFloat(humidity);
    if (!isNaN(hum)) {
      if (hum > 80) {
        addAlert(
          "humidity",
          "Độ ẩm quá cao",
          `Độ ẩm hiện tại ${hum}% quá cao, có thể gây mốc`,
          "warning"
        );
      } else if (hum < 30) {
        addAlert(
          "humidity",
          "Độ ẩm quá thấp",
          `Độ ẩm hiện tại ${hum}% quá thấp, không khí khô`,
          "warning"
        );
      }
    }
  }, [humidity]);

  // Monitor motion for night alerts
  useEffect(() => {
    if (motion === "1") {
      setLastMotionTime(new Date());

      // Phát chuông báo motion nếu được bật
      if (motionSoundEnabled) {
        playAlertSound("warning", "motion");
      }

      if (isNightTime()) {
        addAlert(
          "motion",
          "🚨 Phát hiện chuyển động ban đêm",
          "Có chuyển động bất thường được phát hiện trong thời gian nghỉ ngơi",
          "danger"
        );
      } else {
        addAlert(
          "motion",
          "Phát hiện chuyển động",
          "Có người di chuyển trong khu vực",
          "info"
        );
      }
    }
  }, [motion, currentTime, motionSoundEnabled]);

  // Monitor MQTT connection
  useEffect(() => {
    if (!isConnected) {
      addAlert(
        "connection",
        "Mất kết nối",
        "Mất kết nối với hệ thống IoT, đang thử kết nối lại...",
        "danger"
      );
    }
  }, [isConnected]);

  useEffect(() => {
    // WebSocket connection to backend
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const ws = new WebSocket(`ws://localhost:5000?token=${token}`);

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        switch (data.type) {
          case 'connection':
            console.log("WebSocket connection established:", data.message);
            break;
          case 'sensor_data':
            handleSensorData(data);
            break;
          case 'latest_data':
            handleLatestData(data);
            break;
          case 'light_control_response':
            console.log("Light control response:", data.message);
            break;
          case 'error':
            console.error("WebSocket error:", data.message);
            break;
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
    };

    setWsClient(ws);

    // Cleanup on component unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Handle sensor data from WebSocket
  const handleSensorData = (data) => {
    console.log("🔄 Received sensor data:", data);
    switch (data.topic) {
      case "iot/temperature":
        console.log("🌡️ Setting temperature:", data.value);
        setTemperature(data.value);
        break;
      case "iot/humidity":
        console.log("💧 Setting humidity:", data.value);
        setHumidity(data.value);
        break;
      case "iot/motion":
        console.log("🔔 Setting motion:", data.value);
        setMotion(data.value);
        break;
      case "iot/light":
        console.log("💡 Setting light status:", data.value);
        setLightStatus(data.value);
        break;
      default:
        console.log("Unknown topic:", data.topic);
    }
  };

  // Handle latest data from WebSocket
  const handleLatestData = (data) => {
    if (data.data) {
      if (data.data.dht) {
        setTemperature(data.data.dht.temperature || "--");
        setHumidity(data.data.dht.humidity || "--");
      }
      if (data.data.motion) {
        setMotion(data.data.motion.motion?.toString() || "0");
      }
      if (data.data.action) {
        setLightStatus(data.data.action.status?.toString() || "0");
      }
    }
  };

  // Auto control light: Turn ON at 7 AM and Turn OFF at 11 PM GMT+7
  useEffect(() => {
    const checkTimeAndControlLight = () => {
      const now = new Date();

      // Convert to GMT+7 (Vietnam timezone)
      const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      const currentHour = vietnamTime.getUTCHours();
      const currentMinute = vietnamTime.getUTCMinutes();
      const currentSecond = vietnamTime.getUTCSeconds();

      // Check if it's exactly 7:00:00 AM GMT+7 - Auto turn ON
      if (currentHour === 21 && currentMinute === 4 && currentSecond === 20) {
        console.log("🌅 7 AM GMT+7 - Auto turning on light");

        // Auto turn on light if connected and light is off
        if (wsClient && isConnected && lightStatus === "0") {
          setLightStatus("1"); // Cập nhật state ngay lập tức
          wsClient.send(JSON.stringify({
            type: 'control_light',
            status: 1
          }));
          console.log("✅ Light automatically turned ON at 7 AM GMT+7");
        }
      }

      // Check if it's exactly 23:00:00 (11 PM) GMT+7 - Auto turn OFF
      if (currentHour === 21 && currentMinute === 4 && currentSecond === 40) {
        console.log("🌙 11 PM GMT+7 - Auto turning off light");

        // Auto turn off light if connected and light is on
        if (wsClient && isConnected && lightStatus === "1") {
          setLightStatus("0"); // Cập nhật state ngay lập tức
          wsClient.send(JSON.stringify({
            type: 'control_light',
            status: 0
          }));
          console.log("✅ Light automatically turned OFF at 11 PM GMT+7");
        }
      }
    };

    // Check every second
    const timeInterval = setInterval(checkTimeAndControlLight, 1000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(timeInterval);
    };
  }, [wsClient, isConnected, lightStatus]);

  // Function to toggle light status
  const toggleLight = async () => {
    if (wsClient && isConnected) {
      const newStatus = lightStatus === "1" ? "0" : "1";
      setLightStatus(newStatus); // Cập nhật state ngay lập tức
      wsClient.send(JSON.stringify({
        type: 'control_light',
        status: parseInt(newStatus)
      }));

      // Gọi API để lưu vào database
      try {
        const token = localStorage.getItem('token');
        await fetch('http://localhost:5000/api/sensors/control-light', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: parseInt(newStatus) })
        });
      } catch (err) {
        console.error('Lỗi khi lưu trạng thái bật/tắt đèn:', err);
      }
    }
  };

  // Alert Component
  const AlertCard = ({ alert, onDismiss }) => {
    const getSeverityStyles = (severity) => {
      switch (severity) {
        case "danger":
          return "border-red-500 bg-red-50";
        case "warning":
          return "border-yellow-500 bg-yellow-50";
        case "info":
          return "border-blue-500 bg-blue-50";
        default:
          return "border-gray-500 bg-gray-50";
      }
    };

    const getSeverityIcon = (severity) => {
      switch (severity) {
        case "danger":
          return "⚠️";
        case "warning":
          return "⚡";
        case "info":
          return "ℹ️";
        default:
          return "🔔";
      }
    };

    return (
      <div
        className={`rounded-lg border-l-4 p-4 mb-3 ${getSeverityStyles(
          alert.severity
        )} ${alert.dismissed ? "opacity-50" : ""}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <span className="text-xl">{getSeverityIcon(alert.severity)}</span>
            <div>
              <h4 className="font-semibold text-gray-800">{alert.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-2">
                {alert.timestamp.toLocaleTimeString("vi-VN")} -{" "}
                {alert.timestamp.toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
          {!alert.dismissed && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  };

  // Alert Panel Component
  const AlertPanel = () => {
    const activeAlerts = alerts.filter((alert) => !alert.dismissed);
    const recentAlerts = alerts.slice(0, 5);

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-700">
              Cảnh báo hệ thống
            </h3>
            <div className="flex items-center space-x-2">
              {activeAlerts.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {activeAlerts.length}
                </span>
              )}
              <LogStatusComponent />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                soundEnabled
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
              title="Bật/tắt âm thanh cảnh báo"
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>
            <button
              onClick={() => setMotionSoundEnabled(!motionSoundEnabled)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                motionSoundEnabled
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
              title="Bật/tắt chuông báo chuyển động"
            >
              {motionSoundEnabled ? "🔔" : "🔕"}
            </button>
            {alerts.length > 0 && (
              <button
                onClick={clearAllAlerts}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Xóa tất cả
              </button>
            )}
          </div>
        </div>

        {recentAlerts.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {recentAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={dismissAlert}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl">✅</span>
            <p className="mt-2">Không có cảnh báo nào</p>
          </div>
        )}
      </div>
    );
  };

  // Log Status Component
  const LogStatusComponent = () => {
    const getStatusColor = (status) => {
      switch (status) {
        case "sending":
          return "text-blue-600 bg-blue-100";
        case "success":
          return "text-green-600 bg-green-100";
        case "error":
          return "text-red-600 bg-red-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case "sending":
          return "📤";
        case "success":
          return "✅";
        case "error":
          return "❌";
        default:
          return "📊";
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case "sending":
          return "Đang gửi log...";
        case "success":
          return "Log đã được gửi";
        case "error":
          return "Lỗi gửi log";
        default:
          return "Sẵn sàng ghi log";
      }
    };

    return (
      <div className="flex items-center space-x-2">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
            logStatus
          )}`}
        >
          <span className="mr-1">{getStatusIcon(logStatus)}</span>
          {getStatusText(logStatus)}
        </span>
        {logsQueue.length > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100">
            {logsQueue.length} chờ gửi
          </span>
        )}
        {logsQueue.length > 0 && logStatus === "error" && (
          <button
            onClick={retryFailedLogs}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
        )}
        <button
          onClick={() => {
            addAlert(
              "test",
              "🧪 Test Alert",
              "Đây là alert test để kiểm tra Google Sheets logging",
              "info"
            );
          }}
          className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Test Log
        </button>
      </div>
    );
  };

  // Enhanced Status Card with Alert Indicators
  const EnhancedStatusCard = ({
    title,
    value,
    unit,
    color,
    icon,
    hasAlert,
    alertType,
    onClick,
  }) => (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${color} relative cursor-pointer hover:shadow-xl transition-all duration-200 ${onClick ? 'hover:scale-105' : ''}`}
      onClick={onClick}
    >
      {hasAlert && (
        <div className="absolute -top-2 -right-2">
          <span className="flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 text-white text-xs items-center justify-center">
              !
            </span>
          </span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            <span className="text-lg text-gray-500 ml-2">{unit}</span>
          </div>
          {onClick && (
            <p className="text-xs text-blue-600 mt-2">Click để xem chi tiết →</p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  const StatusCard = ({ title, value, unit, color, icon }) => (
    <div className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            <span className="text-lg text-gray-500 ml-2">{unit}</span>
          </div>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  const MotionCard = ({ title, isActive, icon, onClick }) => (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
        isActive ? "border-green-500" : "border-gray-400"
      } cursor-pointer hover:shadow-xl transition-all duration-200 ${onClick ? 'hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
          <div className="flex items-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isActive ? "Phát hiện" : "Không có"}
            </span>
          </div>
          {onClick && (
            <p className="text-xs text-blue-600 mt-2">Click để xem chi tiết →</p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  // Light Control Card Component
  const LightControlCard = ({ title, isOn, onToggle, icon, onClick }) => (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
        isOn ? "border-yellow-500" : "border-gray-400"
      } cursor-pointer hover:shadow-xl transition-all duration-200 ${onClick ? 'hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isOn
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isOn ? "Đang bật" : "Đã tắt"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              disabled={!isConnected}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isConnected
                  ? isOn
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isOn ? "Tắt đèn" : "Bật đèn"}
            </button>
          </div>
          {onClick && (
            <p className="text-xs text-blue-600 mt-2">Click để xem chi tiết →</p>
          )}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  // Time and Schedule Card Component
  const TimeScheduleCard = ({ currentTime, icon }) => {
    // Convert to GMT+7 (Vietnam timezone)
    const vietnamTime = new Date(currentTime.getTime() + 7 * 60 * 60 * 1000);
    const timeString = vietnamTime.toISOString().substr(11, 8); // HH:MM:SS format
    const dateString = vietnamTime.toISOString().substr(0, 10); // YYYY-MM-DD format

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Thời gian & Lịch trình
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Thời gian hiện tại (GMT+7):
                </span>
                <span className="text-xl font-bold text-blue-600">
                  {timeString}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Ngày:</span>
                <span className="text-sm font-medium text-gray-800">
                  {dateString}
                </span>
              </div>

              {/* Auto Schedule Info */}
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">
                  Lịch trình tự động:
                </h4>

                {/* Auto Turn ON */}
                <div className="p-3 bg-green-50 rounded-lg border-l-2 border-green-400">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">🌅</span>
                    <span className="text-sm text-green-700 font-medium">
                      Tự động BẬT đèn: 07:00:00 GMT+7
                    </span>
                  </div>
                </div>

                {/* Auto Turn OFF */}
                <div className="p-3 bg-blue-50 rounded-lg border-l-2 border-blue-400">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">🌙</span>
                    <span className="text-sm text-blue-700 font-medium">
                      Tự động TẮT đèn: 23:00:00 GMT+7
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-4xl ml-4">{icon}</div>
        </div>
      </div>
    );
  };

  // Render different pages based on currentPage state
  // if (currentPage === 'temperature') {
  //   return (
  //     <TemperatureHumidityPage 
  //       onBack={() => setCurrentPage('dashboard')} 
  //     />
  //   );
  // }

  // if (currentPage === 'motion') {
  //   return (
  //     <MotionPage 
  //       onBack={() => setCurrentPage('dashboard')} 
  //     />
  //   );
  // }

  // if (currentPage === 'light') {
  //   return (
  //     <LightControlPage 
  //       onBack={() => setCurrentPage('dashboard')} 
  //     />
  //   );
  // }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              IoT Status Dashboard
            </h1>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg text-gray-600">
                Trạng thái kết nối WebSocket:
              </span>
              <span className="text-2xl">{isConnected ? "🟢" : "🔴"}</span>
              <span
                className={`font-medium ${
                  isConnected ? "text-green-600" : "text-red-600"
                }`}
              >
                {isConnected ? "Đã kết nối" : "Mất kết nối"}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Xin chào, {user.username}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              )}
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* Alert Panel */}
        <div className="mb-8">
          <AlertPanel />
        </div>

        {/* Sensor Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <EnhancedStatusCard
            title="Nhiệt độ"
            value={temperature}
            unit="°C"
            color="border-red-500"
            icon="🌡️"
            hasAlert={alerts.some(
              (alert) => alert.type === "temperature" && !alert.dismissed
            )}
            alertType="temperature"
            onClick={() => {}}
          />

          <EnhancedStatusCard
            title="Độ ẩm"
            value={humidity}
            unit="%"
            color="border-blue-500"
            icon="💧"
            hasAlert={alerts.some(
              (alert) => alert.type === "humidity" && !alert.dismissed
            )}
            alertType="humidity"
            onClick={() => {}}
          />

          <MotionCard
            title="Phát hiện chuyển động"
            isActive={motion === "1"}
            icon="🔔"
            onClick={() => {}}
          />
        </div>

        {/* Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <LightControlCard
            title="Điều khiển đèn"
            isOn={lightStatus === "1"}
            onToggle={toggleLight}
            icon="💡"
            onClick={() => {}}
          />

          <TimeScheduleCard currentTime={currentTime} icon="⏰" />
        </div>

        {/* Connection Info */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Thông tin kết nối
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>Connected to MQTT broker: {isConnected ? "🟢" : "🔴"}</div>
            <div>
              <strong>Topics đăng ký:</strong>
              <ul className="mt-2 space-y-1 ml-4">
                <li>• iot/temperature</li>
                <li>• iot/humidity</li>
                <li>• iot/motion</li>
              </ul>
            </div>
          </div>

          {/* Night Mode Indicator */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Chế độ ban đêm:
              </span>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-lg ${
                    isNightTime() ? "text-blue-600" : "text-yellow-600"
                  }`}
                >
                  {isNightTime() ? "🌙" : "☀️"}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isNightTime() ? "text-blue-600" : "text-yellow-600"
                  }`}
                >
                  {isNightTime()
                    ? "ĐANG BẬT (22:00-06:00)"
                    : "ĐANG TẮT (06:00-22:00)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Dashboard cập nhật thời gian thực từ thiết bị IoT ESP8266</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
