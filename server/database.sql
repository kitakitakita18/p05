-- Database schema for Mansion Management System

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'chairperson', 'board_member', 'resident')),
    room_number VARCHAR(20),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meetings table
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    date TIMESTAMP,
    time_start TIME,
    time_end TIME,
    location VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'tentative' CHECK (status IN ('confirmed', 'tentative', 'completed', 'cancelled')),
    meeting_type VARCHAR(20) DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'emergency')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting attendance table
CREATE TABLE meeting_attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    member_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'attending', 'absent', 'maybe')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meeting_id, user_id)
);

-- Agendas table
CREATE TABLE agendas (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_no INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'discussed', 'approved', 'rejected')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting minutes table
CREATE TABLE meeting_minutes (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    agenda_id INTEGER REFERENCES agendas(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Garbage schedule table
CREATE TABLE garbage_schedule (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements table
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Association master table
CREATE TABLE association_master (
    id SERIAL PRIMARY KEY,
    association_code VARCHAR(20) UNIQUE NOT NULL,
    association_name VARCHAR(200) NOT NULL,
    chairperson_name VARCHAR(100) NOT NULL,
    meeting_frequency INTEGER NOT NULL CHECK (meeting_frequency IN (1, 2, 3, 4)),
    meeting_week INTEGER CHECK (meeting_week IN (1, 2, 3, 4)),
    meeting_day_of_week INTEGER CHECK (meeting_day_of_week IN (0, 1, 2, 3, 4, 5, 6)),
    meeting_start_time TIME,
    meeting_end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table for agenda items
CREATE TABLE agenda_comments (
    id SERIAL PRIMARY KEY,
    agenda_id INTEGER REFERENCES agendas(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email notifications table
CREATE TABLE email_notifications (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('meeting_confirmed', 'attendance_request', 'reminder')),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, password, role, room_number) VALUES
('管理者', 'admin@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '管理室'),
('理事長', 'chairperson@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'chairperson', '101'),
('理事', 'board@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'board_member', '201'),
('住民', 'resident@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'resident', '301');

-- Insert sample garbage schedule
INSERT INTO garbage_schedule (date, type, description) VALUES
('2024-01-08', '可燃ごみ', '月曜日・木曜日 朝8時まで'),
('2024-01-11', '可燃ごみ', '月曜日・木曜日 朝8時まで'),
('2024-01-09', '不燃ごみ', '第2・第4火曜日 朝8時まで'),
('2024-01-10', '資源ごみ', '毎週水曜日 朝8時まで'),
('2024-01-12', '粗大ごみ', '第2・第4金曜日 要予約');

-- Insert sample announcements
INSERT INTO announcements (title, content, is_important, created_by) VALUES
('新年のご挨拶', '新年明けましておめでとうございます。本年もどうぞよろしくお願いいたします。', true, 1),
('理事会開催のお知らせ', '来月の理事会を開催いたします。詳細は後日ご案内いたします。', false, 2);

-- Insert sample association master data
INSERT INTO association_master (association_code, association_name, chairperson_name, meeting_frequency, meeting_week, meeting_day_of_week, meeting_start_time, meeting_end_time) VALUES
('ASC001', 'サンプルマンション管理組合', '田中理事長', 1, 2, 6, '14:00', '16:00');