-- Tạo database
CREATE DATABASE IF NOT EXISTS iot_pj;
USE iot_pj;

-- Bảng users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng dhtsensor
CREATE TABLE dhtsensor (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng motionsensor
CREATE TABLE motionsensor (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    motion TINYINT(1) NOT NULL DEFAULT 0,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng action
CREATE TABLE action (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 0,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tạo indexes để tối ưu performance
CREATE INDEX idx_dhtsensor_user_time ON dhtsensor(user_id, time);
CREATE INDEX idx_motionsensor_user_time ON motionsensor(user_id, time);
CREATE INDEX idx_action_user_time ON action(user_id, time);

-- Insert sample user (password: admin123)
INSERT INTO users (username, password, email, phone) VALUES 
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@example.com', '0123456789'); 