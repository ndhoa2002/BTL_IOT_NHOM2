# 📊 Hướng dẫn Setup Google Sheets Logging cho IoT Dashboard

## 🚀 Bước 1: Tạo Google Sheet

1. Truy cập [Google Sheets](https://sheets.google.com)
2. Tạo một sheet mới
3. Đặt tên: "IoT Alert Logs" (hoặc tên bạn muốn)
4. Copy **Sheet ID** từ URL (phần giữa `/d/` và `/edit`)
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID_HERE]/edit
   ```

## 🔧 Bước 2: Setup Google Apps Script

### 2.1 Tạo Apps Script Project

1. Truy cập [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Paste nội dung từ file `google-apps-script.js`
4. Thay thế `YOUR_GOOGLE_SHEET_ID_HERE` bằng Sheet ID thực tế

### 2.2 Deploy Web App

1. Click **Deploy** → **New deployment**
2. Choose type: **Web app**
3. Settings:
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
4. Click **Deploy**
5. Copy **Web app URL** (sẽ có dạng: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`)

## ⚙️ Bước 3: Cập nhật React App

1. Mở file `src/components/Dashboard.js`
2. Tìm dòng:
   ```javascript
   const GOOGLE_APPS_SCRIPT_URL =
     "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
   ```
3. Thay thế bằng URL thực tế từ bước 2.2

## 📋 Cấu trúc Data được log

Mỗi alert sẽ được ghi với các thông tin sau:

| Cột            | Dữ liệu    | Mô tả                                                  |
| -------------- | ---------- | ------------------------------------------------------ |
| Timestamp      | ISO String | Thời gian chính xác                                    |
| Date           | dd/mm/yyyy | Ngày (định dạng VN)                                    |
| Time           | hh:mm:ss   | Giờ (định dạng VN)                                     |
| Alert Type     | string     | Loại alert (temperature, humidity, motion, connection) |
| Severity       | string     | Mức độ (info, warning, danger)                         |
| Title          | string     | Tiêu đề alert                                          |
| Message        | string     | Nội dung chi tiết                                      |
| Temperature    | number     | Nhiệt độ hiện tại                                      |
| Humidity       | number     | Độ ẩm hiện tại                                         |
| Motion         | string     | Trạng thái chuyển động                                 |
| Light Status   | string     | Trạng thái đèn                                         |
| Night Mode     | string     | Chế độ ban đêm                                         |
| MQTT Connected | string     | Trạng thái kết nối                                     |
| Alert ID       | string     | ID duy nhất của alert                                  |

## 🎨 Tính năng đặc biệt

### Conditional Formatting

- **Danger alerts**: Nền đỏ nhạt
- **Warning alerts**: Nền cam nhạt
- **Info alerts**: Nền xanh nhạt

### Auto Management

- Headers tự động được tạo
- Columns tự động resize
- Row đầu được freeze

### Error Handling

- Retry mechanism cho failed logs
- Queue system cho logs chưa gửi được
- Status indicator trong UI

## 🔄 Functions quản lý (Optional)

### Cleanup Old Logs

```javascript
// Xóa logs cũ hơn 30 ngày
cleanupOldLogs(30);
```

### Get Statistics

```javascript
// Lấy thống kê logs
const stats = getLogStats();
console.log(stats);
```

## 🚨 Troubleshooting

### Lỗi thường gặp:

1. **"Could not access Google Sheet"**

   - Kiểm tra SHEET_ID có đúng không
   - Đảm bảo sheet tồn tại và có quyền truy cập

2. **"Network error"**

   - Kiểm tra Web App URL có đúng không
   - Đảm bảo deployment settings là "Anyone"

3. **"Log status shows error"**
   - Mở Console (F12) để xem error details
   - Kiểm tra CORS settings

### Debug Steps:

1. Test Web App URL trực tiếp bằng browser
2. Kiểm tra execution transcript trong Apps Script
3. Verify permissions và sharing settings

## 📊 Monitoring Dashboard

Trong IoT Dashboard, bạn sẽ thấy:

- **📤 Đang gửi log...**: Khi đang upload
- **✅ Log đã được gửi**: Upload thành công
- **❌ Lỗi gửi log**: Có lỗi xảy ra
- **X chờ gửi**: Số logs trong queue

## 🔒 Security Notes

- Apps Script chạy với quyền của account bạn
- Chỉ cần quyền "Anyone" cho web app, không cần Google account
- Data được truyền qua HTTPS
- Logs được lưu trong Google Sheet riêng của bạn

## 📈 Advanced Usage

### Time-based Triggers

Bạn có thể setup triggers để:

- Auto cleanup logs định kỳ
- Gửi summary reports
- Monitor log patterns

### Integration với other services

- Connect với Google Data Studio để tạo dashboard
- Setup email notifications cho critical alerts
- Export data để analysis

---

🎉 **Setup xong! Dashboard bây giờ sẽ tự động log tất cả alerts lên Google Sheets!**
