/**
 * Google Apps Script for IoT Alert Logging
 * Deploy this as a web app with execute permissions for "Anyone"
 *
 * Setup Instructions:
 * 1. Go to script.google.com
 * 2. Create a new project
 * 3. Paste this code
 * 4. Create a Google Sheet and get its ID
 * 5. Replace SHEET_ID with your actual sheet ID
 * 6. Deploy as web app
 * 7. Copy the deployment URL to your React app
 */

// Replace with your Google Sheet ID
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "IoT_Alerts_Log";

function doGet(e) {
  return ContentService.createTextOutput(
    "IoT Alert Logging Service is running!"
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);

    // Log the received data for debugging
    console.log("Received data:", data);

    // Get or create the spreadsheet
    const sheet = getOrCreateSheet();

    // Add the log entry
    const result = addLogEntry(sheet, data);

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "Log entry added successfully",
        rowAdded: result.rowAdded,
        timestamp: new Date().toISOString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error processing request:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString(),
        timestamp: new Date().toISOString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {
  try {
    // Try to open existing spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // If sheet doesn't exist, create it
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      setupSheetHeaders(sheet);
    }

    // Check if headers exist, if not add them
    if (sheet.getLastRow() === 0) {
      setupSheetHeaders(sheet);
    }

    return sheet;
  } catch (error) {
    console.error("Error accessing sheet:", error);
    throw new Error(
      "Could not access Google Sheet. Check SHEET_ID: " + SHEET_ID
    );
  }
}

function setupSheetHeaders(sheet) {
  const headers = [
    "Timestamp",
    "Date",
    "Time",
    "Alert Type",
    "Severity",
    "Title",
    "Message",
    "Temperature (°C)",
    "Humidity (%)",
    "Motion",
    "Light Status",
    "Night Mode",
    "MQTT Connected",
    "Alert ID",
  ];

  // Add headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#4285f4");
  headerRange.setFontColor("white");

  // Freeze header row
  sheet.setFrozenRows(1);

  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);

  console.log("Sheet headers setup completed");
}

function addLogEntry(sheet, data) {
  try {
    const row = [
      data.timestamp || new Date().toISOString(),
      data.date || new Date().toLocaleDateString("vi-VN"),
      data.time || new Date().toLocaleTimeString("vi-VN"),
      data.type || "",
      data.severity || "",
      data.title || "",
      data.message || "",
      data.temperature || "",
      data.humidity || "",
      data.motion === "1" ? "Có chuyển động" : "Không có",
      data.lightStatus === "1" ? "Đang bật" : "Đã tắt",
      data.isNightTime ? "Ban đêm" : "Ban ngày",
      data.mqttConnected ? "Đã kết nối" : "Mất kết nối",
      data.id || "",
    ];

    // Add the row to the sheet
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);

    // Add conditional formatting based on severity
    const newRowRange = sheet.getRange(lastRow + 1, 1, 1, row.length);

    switch (data.severity) {
      case "danger":
        newRowRange.setBackground("#ffebee"); // Light red
        break;
      case "warning":
        newRowRange.setBackground("#fff3e0"); // Light orange
        break;
      case "info":
        newRowRange.setBackground("#e3f2fd"); // Light blue
        break;
    }

    console.log("Log entry added at row:", lastRow + 1);

    // Auto-resize columns if needed
    sheet.autoResizeColumns(1, row.length);

    return {
      rowAdded: lastRow + 1,
      data: row,
    };
  } catch (error) {
    console.error("Error adding log entry:", error);
    throw new Error("Failed to add log entry: " + error.toString());
  }
}

// Function to clean up old logs (optional - can be triggered manually or via time-based trigger)
function cleanupOldLogs(daysToKeep = 30) {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let rowsDeleted = 0;

    // Start from the bottom to avoid index shifting
    for (let i = data.length - 1; i >= 1; i--) {
      // Skip header row
      const timestamp = new Date(data[i][0]);
      if (timestamp < cutoffDate) {
        sheet.deleteRow(i + 1);
        rowsDeleted++;
      }
    }

    console.log(`Cleaned up ${rowsDeleted} old log entries`);
    return rowsDeleted;
  } catch (error) {
    console.error("Error cleaning up old logs:", error);
    throw error;
  }
}

// Function to get log statistics (optional)
function getLogStats() {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return { totalLogs: 0 };

    const stats = {
      totalLogs: data.length - 1, // Exclude header
      byType: {},
      bySeverity: {},
      lastLogTime: data[data.length - 1][0],
    };

    // Count by type and severity
    for (let i = 1; i < data.length; i++) {
      const type = data[i][3];
      const severity = data[i][4];

      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    }

    return stats;
  } catch (error) {
    console.error("Error getting log stats:", error);
    throw error;
  }
}
