const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { dbManager, initializeDatabase } = require('./database');

// Render用の環境変数読み込み設定
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/.env' });

// 環境変数のフォールバック値を設定
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'https://p05-phgg.onrender.com';

const app = express();
const PORT = process.env.PORT || 5105;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// JWT verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Routes
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // データベースからユーザーを検索
    const user = await dbManager.get(
      'SELECT id, name, email, password, role, room_number FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 簡単なパスワード認証（実際のアプリケーションではハッシュ化が必要）
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, room_number: user.room_number } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User management routes
app.get('/api/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const users = await dbManager.all('SELECT id, name, email, role, role_cd, room_number, phone, created_at, updated_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role, role_cd, room_number, phone } = req.body;
    
    // Convert role_cd to role for backward compatibility
    let userRole = role;
    if (role_cd) {
      switch (role_cd) {
        case 1: userRole = 'admin'; break;
        case 2: userRole = 'chairperson'; break;
        case 3: userRole = 'board_member'; break;
        case 4: userRole = 'resident'; break;
        default: userRole = role || 'resident';
      }
    }
    
    // データベースに新しいユーザーを作成
    const result = await dbManager.run(
      'INSERT INTO users (name, email, password, role, role_cd, room_number, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, password || 'password', userRole, role_cd || 4, room_number, phone]
    );
    
    // 作成されたユーザーを取得
    const newUser = await dbManager.get(
      'SELECT id, name, email, role, role_cd, room_number, phone, created_at, updated_at FROM users WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, role_cd, room_number, phone } = req.body;
    
    // Convert role_cd to role for backward compatibility
    let userRole = role;
    if (role_cd) {
      switch (role_cd) {
        case 1: userRole = 'admin'; break;
        case 2: userRole = 'chairperson'; break;
        case 3: userRole = 'board_member'; break;
        case 4: userRole = 'resident'; break;
        default: userRole = role || 'resident';
      }
    }
    
    // データベースでユーザーを更新
    const result = await dbManager.run(
      'UPDATE users SET name = ?, email = ?, role = ?, role_cd = ?, room_number = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, email, userRole, role_cd || 4, room_number, phone, parseInt(id)]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 更新されたユーザーを取得
    const updatedUser = await dbManager.get(
      'SELECT id, name, email, role, role_cd, room_number, phone, created_at, updated_at FROM users WHERE id = ?',
      [parseInt(id)]
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    // Prevent deleting self
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // データベースからユーザーを削除
    const result = await dbManager.run('DELETE FROM users WHERE id = ?', [userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', id: userId });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset user password
app.put('/api/users/:id/reset-password', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // データベースでパスワードを更新
    const result = await dbManager.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPassword, parseInt(id)]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Board meeting routes
app.get('/api/meetings', authenticateToken, async (req, res) => {
  try {
    const meetings = await dbManager.all(
      'SELECT * FROM meetings ORDER BY date DESC'
    );
    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recent meetings for dashboard - last 3 completed meetings
app.get('/api/meetings/recent', authenticateToken, async (req, res) => {
  try {
    // Get the 3 most recent completed meetings regardless of month
    const meetings = await dbManager.all(
      `SELECT * FROM meetings 
       WHERE status = 'completed' 
       ORDER BY date DESC 
       LIMIT 3`
    );
    
    res.json(meetings);
  } catch (error) {
    console.error('Get recent meetings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Next meeting for dashboard - closest upcoming meeting that is not completed or cancelled
app.get('/api/meetings/next', authenticateToken, async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    // Get the next meeting that is not completed or cancelled, ordered by date
    const nextMeeting = await dbManager.get(
      `SELECT * FROM meetings 
       WHERE status NOT IN ('completed', 'cancelled') 
       AND date >= ?
       ORDER BY date ASC 
       LIMIT 1`,
      [now]
    );
    
    res.json(nextMeeting || null);
  } catch (error) {
    console.error('Get next meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get meetings by year for agenda management
app.get('/api/meetings/by-year/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Get all meetings for the specified year
    const meetings = await dbManager.all(
      `SELECT * FROM meetings 
       WHERE strftime('%Y', date) = ?
       ORDER BY date ASC`,
      [year]
    );
    
    res.json(meetings);
  } catch (error) {
    console.error('Get meetings by year error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available years for meetings
app.get('/api/meetings/years', authenticateToken, async (req, res) => {
  try {
    const years = await dbManager.all(
      `SELECT DISTINCT strftime('%Y', date) as year 
       FROM meetings 
       WHERE date IS NOT NULL 
       ORDER BY year DESC`
    );
    
    res.json(years.map(row => row.year));
  } catch (error) {
    console.error('Get meeting years error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/meetings', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { title, date, time_start, time_end, location, description, status, meeting_type } = req.body;
    
    // データベースに新しい会議を作成
    const result = await dbManager.run(
      'INSERT INTO meetings (title, date, time_start, time_end, location, description, status, meeting_type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        date || new Date('1970-01-01').toISOString(),
        time_start || '14:00',
        time_end || '16:00',
        location,
        description,
        status || 'tentative',
        meeting_type || 'regular',
        req.user.userId
      ]
    );
    
    // 作成された会議を取得
    const newMeeting = await dbManager.get(
      'SELECT * FROM meetings WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newMeeting);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update meeting route
app.put('/api/meetings/:id', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, time_start, time_end, location, description, status, meeting_type } = req.body;
    
    // データベースで会議を更新
    const result = await dbManager.run(
      'UPDATE meetings SET title = ?, date = ?, time_start = ?, time_end = ?, location = ?, description = ?, status = ?, meeting_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, date, time_start, time_end, location, description, status, meeting_type, parseInt(id)]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // 更新された会議を取得
    const updatedMeeting = await dbManager.get(
      'SELECT * FROM meetings WHERE id = ?',
      [parseInt(id)]
    );
    
    res.json(updatedMeeting);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete meeting route
app.delete('/api/meetings/:id', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { id } = req.params;
    const meetingId = parseInt(id);
    
    // データベースから会議を削除
    const result = await dbManager.run('DELETE FROM meetings WHERE id = ?', [meetingId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({ 
      message: '理事会スケジュールが削除されました',
      deletedId: meetingId 
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send attendance confirmation email
app.post('/api/meetings/:id/send-attendance-email', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { id } = req.params;
    const meetingId = parseInt(id);
    
    // 理事会情報を取得
    const meeting = await dbManager.get(
      'SELECT * FROM meetings WHERE id = ?',
      [meetingId]
    );
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // 理事・理事長のユーザーを取得
    const users = await dbManager.all(
      "SELECT * FROM users WHERE role IN ('admin', 'chairperson', 'board_member')"
    );
    
    // メール送信記録をデータベースに保存
    const emailRecords = [];
    for (const user of users) {
      const result = await dbManager.run(
        'INSERT INTO email_notifications (meeting_id, type, recipient_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          meetingId,
          'attendance_request',
          user.email,
          `理事会出席確認: ${meeting.title}`,
          `${meeting.title}の出席確認をお願いします。開催日時: ${meeting.date}`,
          'sent'
        ]
      );
      emailRecords.push(result.lastID);
    }
    
    // TODO: 実際のメール送信処理（Nodemailer、SendGrid等を使用）
    // await sendEmails(users, meeting);
    
    console.log(`出席確認メール送信: 理事会ID ${meetingId}, 送信件数 ${users.length}`);
    
    const result = {
      meeting_id: meetingId,
      emails_sent: users.length,
      status: 'sent',
      sent_at: new Date(),
      email_records: emailRecords
    };
    
    res.json(result);
  } catch (error) {
    console.error('Send attendance email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send reminder email
app.post('/api/meetings/:id/send-reminder', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { id } = req.params;
    const meetingId = parseInt(id);
    
    // 理事会情報を取得
    const meeting = await dbManager.get(
      'SELECT * FROM meetings WHERE id = ?',
      [meetingId]
    );
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // 未回答者または出席予定者を取得
    const users = await dbManager.all(
      `SELECT DISTINCT u.* FROM users u
       LEFT JOIN meeting_attendance ma ON u.id = ma.user_id AND ma.meeting_id = ?
       WHERE u.role IN ('admin', 'chairperson', 'board_member')
       AND (ma.status IS NULL OR ma.status = 'pending' OR ma.status = 'attending')`,
      [meetingId]
    );
    
    // リマインダーメール送信記録をデータベースに保存
    const emailRecords = [];
    for (const user of users) {
      const result = await dbManager.run(
        'INSERT INTO email_notifications (meeting_id, type, recipient_email, subject, body, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          meetingId,
          'reminder',
          user.email,
          `理事会開催リマインダー: ${meeting.title}`,
          `明日開催予定の${meeting.title}のリマインダーです。開催日時: ${meeting.date} ${meeting.time_start}〜${meeting.time_end}`,
          'sent'
        ]
      );
      emailRecords.push(result.lastID);
    }
    
    // TODO: 実際のメール送信処理（Nodemailer、SendGrid等を使用）
    // await sendReminderEmails(users, meeting);
    
    console.log(`リマインダーメール送信: 理事会ID ${meetingId}, 送信件数 ${users.length}`);
    
    const result = {
      meeting_id: meetingId,
      reminder_emails_sent: users.length,
      status: 'sent',
      sent_at: new Date(),
      email_records: emailRecords
    };
    
    res.json(result);
  } catch (error) {
    console.error('Send reminder email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get meeting attendance summary
app.get('/api/meetings/:id/attendance-summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const meetingId = parseInt(id);
    
    // 理事会存在確認
    const meeting = await dbManager.get(
      'SELECT * FROM meetings WHERE id = ?',
      [meetingId]
    );
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // 対象ユーザー（理事・理事長・管理者）の総数を取得
    const totalInvitees = await dbManager.get(
      "SELECT COUNT(*) as count FROM users WHERE role IN ('admin', 'chairperson', 'board_member')"
    );
    
    // 出席状況別の集計を取得
    const attendanceStats = await dbManager.all(
      `SELECT 
         ma.status,
         COUNT(*) as count
       FROM meeting_attendance ma
       JOIN users u ON ma.user_id = u.id
       WHERE ma.meeting_id = ? AND u.role IN ('admin', 'chairperson', 'board_member')
       GROUP BY ma.status`,
      [meetingId]
    );
    
    // 集計結果を整理
    let attending = 0, absent = 0, pending = 0, maybe = 0;
    
    attendanceStats.forEach(stat => {
      switch(stat.status) {
        case 'attending': attending = stat.count; break;
        case 'absent': absent = stat.count; break;
        case 'pending': pending = stat.count; break;
        case 'maybe': maybe = stat.count; break;
      }
    });
    
    // 未回答者数を計算（出席情報が登録されていないユーザー）
    const respondedCount = attending + absent + maybe;
    const notRespondedCount = Math.max(0, totalInvitees.count - respondedCount);
    pending += notRespondedCount;
    
    // 出席率を計算
    const attendanceRate = totalInvitees.count > 0 ? 
      Math.round((attending / totalInvitees.count) * 100) : 0;
    
    const summary = {
      meeting_id: meetingId,
      total_invitees: totalInvitees.count,
      attending: attending,
      absent: absent,
      pending: pending,
      maybe: maybe,
      attendance_rate: attendanceRate
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Meeting attendance routes
app.get('/api/meetings/:meetingId/attendance', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meetingIdInt = parseInt(meetingId);
    
    // データベースから出席情報を取得
    let attendanceData = await dbManager.all(
      'SELECT * FROM meeting_attendance WHERE meeting_id = ?',
      [meetingIdInt]
    );
    
    // 出席データが存在しない場合は初期化
    if (attendanceData.length === 0) {
      // 理事会関係者を取得（admin, chairperson, board_member）
      const boardMembers = await dbManager.all(
        `SELECT id, name, role FROM users WHERE role IN ('admin', 'chairperson', 'board_member')`
      );
      
      // 各理事会関係者の出席データを作成
      for (const user of boardMembers) {
        const roleName = user.role === 'admin' ? '管理者' :
                        user.role === 'chairperson' ? '理事長' :
                        user.role === 'board_member' ? '理事' : '住民';
        
        await dbManager.run(
          'INSERT INTO meeting_attendance (meeting_id, user_id, member_name, role, role_name, status) VALUES (?, ?, ?, ?, ?, ?)',
          [meetingIdInt, user.id, user.name, user.role, roleName, 'maybe']
        );
      }
      
      // 初期化後のデータを再取得
      attendanceData = await dbManager.all(
        'SELECT * FROM meeting_attendance WHERE meeting_id = ?',
        [meetingIdInt]
      );
    }
    
    res.json(attendanceData);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/meetings/:meetingId/attendance', authenticateToken, authorizeRole(['admin', 'chairperson', 'board_member']), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status, userId } = req.body;
    const meetingIdInt = parseInt(meetingId);
    
    // Target user ID: either from request body or current user
    const targetUserId = userId || req.user.userId;
    
    // データベースで出席状況を更新
    const result = await dbManager.run(
      'UPDATE meeting_attendance SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE meeting_id = ? AND user_id = ?',
      [status, meetingIdInt, targetUserId]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User attendance not found' });
    }
    
    // 更新された出席情報を取得
    const updatedAttendance = await dbManager.get(
      'SELECT * FROM meeting_attendance WHERE meeting_id = ? AND user_id = ?',
      [meetingIdInt, targetUserId]
    );
    
    res.json(updatedAttendance);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk attendance update endpoint
app.post('/api/meetings/:meetingId/attendance/bulk', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { attendances } = req.body; // [{user_id, status}, ...]
    const meetingIdInt = parseInt(meetingId);
    
    if (!Array.isArray(attendances)) {
      return res.status(400).json({ error: 'Attendances must be an array' });
    }
    
    // トランザクションを開始
    await dbManager.beginTransaction();
    
    try {
      const updatedRecords = [];
      
      // 複数の出席記録を更新
      for (const attendance of attendances) {
        const { user_id, status } = attendance;
        
        if (!user_id || !status) {
          continue; // 無効なレコードはスキップ
        }
        
        const result = await dbManager.run(
          'UPDATE meeting_attendance SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE meeting_id = ? AND user_id = ?',
          [status, meetingIdInt, user_id]
        );
        
        if (result.changes > 0) {
          const updatedRecord = await dbManager.get(
            'SELECT * FROM meeting_attendance WHERE meeting_id = ? AND user_id = ?',
            [meetingIdInt, user_id]
          );
          updatedRecords.push(updatedRecord);
        }
      }
      
      // トランザクションをコミット
      await dbManager.commit();
      
      res.json({
        success: true,
        message: `${updatedRecords.length}件の出席状況を更新しました`,
        updated: updatedRecords
      });
    } catch (error) {
      // エラーが発生した場合はロールバック
      await dbManager.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Bulk attendance update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Meeting minutes routes
app.get('/api/meetings/:meetingId/minutes', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meetingIdInt = parseInt(meetingId);
    
    // データベースから議事録ファイルを取得
    const minutes = await dbManager.all(
      'SELECT * FROM meeting_minutes WHERE meeting_id = ? ORDER BY upload_date DESC',
      [meetingIdInt]
    );
    
    res.json(minutes);
  } catch (error) {
    console.error('Get meeting minutes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/meetings/:meetingId/minutes/upload', authenticateToken, authorizeRole(['admin', 'chairperson']), upload.single('file'), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meetingIdInt = parseInt(meetingId);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // データベースにファイル情報を保存
    const result = await dbManager.run(
      'INSERT INTO meeting_minutes (meeting_id, original_name, file_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        meetingIdInt,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        req.user.userId
      ]
    );
    
    // 保存されたファイル情報を取得
    const fileRecord = await dbManager.get(
      'SELECT * FROM meeting_minutes WHERE id = ?',
      [result.lastID]
    );
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileRecord
    });
  } catch (error) {
    console.error('Upload meeting minutes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/files/:fileId', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileIdInt = parseInt(fileId);
    
    // データベースからファイル情報を取得
    const fileRecord = await dbManager.get(
      'SELECT * FROM meeting_minutes WHERE id = ?',
      [fileIdInt]
    );
    
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 物理ファイルを削除
    const fs = require('fs');
    try {
      fs.unlinkSync(fileRecord.file_path);
    } catch (err) {
      console.error('Error deleting physical file:', err);
    }
    
    // データベースからファイル記録を削除
    await dbManager.run('DELETE FROM meeting_minutes WHERE id = ?', [fileIdInt]);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileIdInt = parseInt(fileId);
    
    // データベースからファイル情報を取得
    const fileRecord = await dbManager.get(
      'SELECT * FROM meeting_minutes WHERE id = ?',
      [fileIdInt]
    );
    
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // ファイルが存在するかチェック
    if (!fs.existsSync(fileRecord.file_path)) {
      return res.status(404).json({ error: 'Physical file not found' });
    }
    
    // ダウンロード用のヘッダーを設定
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.original_name}"`);
    res.setHeader('Content-Type', fileRecord.mime_type);
    
    // ファイルをストリーム
    const fileStream = fs.createReadStream(fileRecord.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Date candidate routes
app.get('/api/meetings/:meetingId/candidates', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const testCandidates = [
      {
        id: 1,
        meeting_id: parseInt(meetingId),
        candidate_date: '2025-07-20T18:00:00',
        created_at: new Date()
      },
      {
        id: 2,
        meeting_id: parseInt(meetingId),
        candidate_date: '2025-07-22T10:00:00',
        created_at: new Date()
      }
    ];
    res.json(testCandidates);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/meetings/:meetingId/candidates', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { candidate_date } = req.body;
    
    const candidate = {
      id: Date.now(),
      meeting_id: parseInt(meetingId),
      candidate_date,
      created_at: new Date()
    };
    
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Date vote routes
app.get('/api/candidates/:candidateId/votes', authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const testVotes = [
      {
        id: 1,
        candidate_id: parseInt(candidateId),
        user_id: 2,
        availability: 'available',
        created_at: new Date(),
        user_name: '理事長'
      }
    ];
    res.json(testVotes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/candidates/:candidateId/votes', authenticateToken, authorizeRole(['admin', 'chairperson', 'board_member']), async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { availability } = req.body;
    
    const vote = {
      id: Date.now(),
      candidate_id: parseInt(candidateId),
      user_id: req.user.userId,
      availability,
      created_at: new Date(),
      user_name: req.user.name
    };
    
    res.status(201).json(vote);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/meetings/:meetingId/votes', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    // Return vote summary for each candidate
    const testVoteSummary = {
      1: { available: 2, maybe: 1, unavailable: 0 },
      2: { available: 1, maybe: 2, unavailable: 0 }
    };
    res.json(testVoteSummary);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 議題管理はデータベースに移行済み

// Agenda routes
// Get all agendas across all meetings
app.get('/api/agendas', authenticateToken, async (req, res) => {
  try {
    const allAgendas = await dbManager.all(
      `SELECT a.*, m.title as meeting_title, m.date as meeting_date, u.name as created_by_name
       FROM agendas a
       LEFT JOIN meetings m ON a.meeting_id = m.id
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY m.date DESC, a.order_no ASC`
    );
    res.json(allAgendas);
  } catch (error) {
    console.error('Get all agendas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get agendas for a specific meeting
app.get('/api/agendas/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meetingAgendas = await dbManager.all(
      'SELECT * FROM agendas WHERE meeting_id = ? ORDER BY order_no ASC',
      [parseInt(meetingId)]
    );
    res.json(meetingAgendas);
  } catch (error) {
    console.error('Get agendas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/agendas', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { meeting_id, title, description, order_no, discussion_result, category, approval_status, priority, start_date, due_date } = req.body;
    
    // データベースに新しい議題を作成
    const result = await dbManager.run(
      'INSERT INTO agendas (meeting_id, title, description, order_no, status, discussion_result, category, approval_status, priority, start_date, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [parseInt(meeting_id), title, description, order_no || 1, 'not_started', discussion_result || '', category || '通常', approval_status || null, priority || 'C', start_date || null, due_date || null, req.user.userId]
    );
    
    // 作成された議題を取得
    const newAgenda = await dbManager.get(
      'SELECT * FROM agendas WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newAgenda);
  } catch (error) {
    console.error('Create agenda error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update agenda
app.put('/api/agendas/:id', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_no, status, discussion_result, category, approval_status, priority, start_date, due_date } = req.body;
    
    // データベースで議題を更新
    const result = await dbManager.run(
      'UPDATE agendas SET title = ?, description = ?, order_no = ?, status = ?, discussion_result = ?, category = ?, approval_status = ?, priority = ?, start_date = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, order_no, status, discussion_result || '', category, approval_status, priority, start_date, due_date, parseInt(id)]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }
    
    // 更新された議題を取得
    const updatedAgenda = await dbManager.get(
      'SELECT * FROM agendas WHERE id = ?',
      [parseInt(id)]
    );
    
    res.json(updatedAgenda);
  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete agenda
app.delete('/api/agendas/:id', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // データベースから議題を削除
    const result = await dbManager.run('DELETE FROM agendas WHERE id = ?', [parseInt(id)]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }
    
    res.json({ message: 'Agenda deleted successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Delete agenda error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update agenda order
app.put('/api/agendas/:meetingId/reorder', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { agendas } = req.body; // Array of {id, order_no}
    
    // トランザクションを開始
    await dbManager.beginTransaction();
    
    try {
      const result = [];
      
      // 各議題の順序を更新
      for (const agendaUpdate of agendas) {
        await dbManager.run(
          'UPDATE agendas SET order_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [agendaUpdate.order_no, agendaUpdate.id]
        );
        
        // 更新された議題を取得
        const updatedAgenda = await dbManager.get(
          'SELECT * FROM agendas WHERE id = ?',
          [agendaUpdate.id]
        );
        
        if (updatedAgenda) {
          result.push(updatedAgenda);
        }
      }
      
      // トランザクションをコミット
      await dbManager.commit();
      
      res.json(result);
    } catch (error) {
      // エラーが発生した場合はロールバック
      await dbManager.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Reorder agendas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send agenda list email
app.post('/api/agendas/:meetingId/send-email', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    // Mock email sending - in real app, send actual emails
    const result = {
      meeting_id: parseInt(meetingId),
      emails_sent: 5,
      status: 'sent',
      sent_at: new Date()
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get agenda documents
app.get('/api/agendas/:agendaId/documents', authenticateToken, async (req, res) => {
  try {
    const { agendaId } = req.params;
    
    const documents = await dbManager.all(
      'SELECT d.*, u.name as uploaded_by_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.agenda_id = ? ORDER BY d.created_at DESC',
      [parseInt(agendaId)]
    );
    
    res.json(documents);
  } catch (error) {
    console.error('Get agenda documents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload agenda document
app.post('/api/agendas/:agendaId/documents/upload', authenticateToken, authorizeRole(['admin', 'chairperson']), upload.single('file'), async (req, res) => {
  try {
    const { agendaId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // データベースに文書情報を保存
    const result = await dbManager.run(
      'INSERT INTO documents (agenda_id, filename, original_name, file_path, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        parseInt(agendaId),
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        req.user.userId
      ]
    );
    
    // 作成された文書情報を取得
    const newDocument = await dbManager.get(
      'SELECT d.*, u.name as uploaded_by_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.id = ?',
      [result.lastID]
    );
    
    res.status(201).json({
      message: 'File uploaded successfully',
      document: newDocument
    });
  } catch (error) {
    console.error('Upload agenda document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete agenda document
app.delete('/api/agendas/documents/:documentId', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // 文書情報を取得
    const document = await dbManager.get(
      'SELECT * FROM documents WHERE id = ?',
      [parseInt(documentId)]
    );
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // データベースから削除
    const result = await dbManager.run(
      'DELETE FROM documents WHERE id = ?',
      [parseInt(documentId)]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // ファイルシステムからファイルを削除
    const fs = require('fs');
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete agenda document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Garbage collection routes (removed - no longer needed for board management system)

// Announcements routes
app.get('/api/announcements', authenticateToken, authorizeRole(['admin', 'chairperson', 'board_member']), async (req, res) => {
  try {
    const announcements = await dbManager.all(
      'SELECT * FROM announcements WHERE is_published = 1 ORDER BY created_at DESC'
    );
    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/announcements', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    const { title, content, is_important } = req.body;
    
    const result = await dbManager.run(
      'INSERT INTO announcements (title, content, is_important, created_by) VALUES (?, ?, ?, ?)',
      [title, content, is_important, req.user.userId]
    );
    
    // 作成されたお知らせを取得
    const newAnnouncement = await dbManager.get(
      'SELECT * FROM announcements WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// File upload route
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// 組合情報管理はデータベースに移行済み

// ユーザー管理はデータベースに移行済み

// 出席管理はデータベースに移行済み

// Association master routes
app.get('/api/association', authenticateToken, async (req, res) => {
  try {
    // データベースから組合情報を取得
    const association = await dbManager.get(
      'SELECT * FROM association_master ORDER BY id DESC LIMIT 1'
    );
    
    if (!association) {
      return res.status(404).json({ error: 'Association not found' });
    }
    
    res.json(association);
  } catch (error) {
    console.error('Get association error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/association', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { association_code, association_name, chairperson_name, meeting_frequency, meeting_week, meeting_day_of_week, meeting_start_time, meeting_end_time } = req.body;
    
    // 既存の組合情報を取得
    const existingAssociation = await dbManager.get(
      'SELECT * FROM association_master ORDER BY id DESC LIMIT 1'
    );
    
    if (existingAssociation) {
      // 既存の組合情報を更新
      const result = await dbManager.run(
        'UPDATE association_master SET association_code = ?, association_name = ?, chairperson_name = ?, meeting_frequency = ?, meeting_week = ?, meeting_day_of_week = ?, meeting_start_time = ?, meeting_end_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [
          association_code,
          association_name,
          chairperson_name,
          parseInt(meeting_frequency),
          meeting_week ? parseInt(meeting_week) : null,
          meeting_day_of_week !== undefined ? parseInt(meeting_day_of_week) : null,
          meeting_start_time,
          meeting_end_time,
          existingAssociation.id
        ]
      );
      
      // 更新された組合情報を取得
      const updatedAssociation = await dbManager.get(
        'SELECT * FROM association_master WHERE id = ?',
        [existingAssociation.id]
      );
      
      res.json(updatedAssociation);
    } else {
      // 新規作成
      const result = await dbManager.run(
        'INSERT INTO association_master (association_code, association_name, chairperson_name, meeting_frequency, meeting_week, meeting_day_of_week, meeting_start_time, meeting_end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          association_code,
          association_name,
          chairperson_name,
          parseInt(meeting_frequency),
          meeting_week ? parseInt(meeting_week) : null,
          meeting_day_of_week !== undefined ? parseInt(meeting_day_of_week) : null,
          meeting_start_time,
          meeting_end_time
        ]
      );
      
      // 作成された組合情報を取得
      const newAssociation = await dbManager.get(
        'SELECT * FROM association_master WHERE id = ?',
        [result.lastID]
      );
      
      res.json(newAssociation);
    }
  } catch (error) {
    console.error('Update association error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate meeting schedule for next 6 months
app.post('/api/meetings/generate-schedule', authenticateToken, authorizeRole(['admin', 'chairperson']), async (req, res) => {
  try {
    // データベースから組合設定を取得
    const association = await dbManager.get(
      'SELECT * FROM association_master ORDER BY id DESC LIMIT 1'
    );
    
    if (!association) {
      return res.status(404).json({ error: 'Association settings not found' });
    }

    const generateMeetingSchedule = (association) => {
      const meetings = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 時間を00:00:00にセット
      
      // 半年先の制限日を計算（180日後）
      const sixMonthsLater = new Date(today);
      sixMonthsLater.setDate(today.getDate() + 180);
      
      console.log('=== スケジュール生成開始 ===');
      console.log('仕様: 半年先まで作成機能では必ず定例理事会を作成');
      console.log('組合基本情報:', association);
      console.log('基準日:', today.toISOString());
      console.log('半年先制限日:', sixMonthsLater.toISOString());

      // 現在の月から6ヶ月分処理（ただし半年先制限を適用）
      for (let i = 0; i < 6; i++) {
        const targetDate = new Date(today);
        targetDate.setMonth(today.getMonth() + i);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        console.log(`--- ${year}年${month + 1}月 処理開始 ---`);

        // 理事会頻度チェック
        let shouldCreateMeeting = false;
        switch (association.meeting_frequency) {
          case 1: // 毎月
            shouldCreateMeeting = true;
            break;
          case 2: // 偶数月
            shouldCreateMeeting = (month + 1) % 2 === 0;
            break;
          case 3: // 奇数月
            shouldCreateMeeting = (month + 1) % 2 === 1;
            break;
          case 4: // その他（毎月として扱う）
            shouldCreateMeeting = true;
            break;
        }
        
        console.log(`理事会頻度チェック: ${shouldCreateMeeting} (頻度: ${association.meeting_frequency}, 月: ${month + 1})`);

        if (shouldCreateMeeting && association.meeting_week && association.meeting_day_of_week !== undefined) {
          // 指定された週の指定された曜日を計算
          const firstDayOfMonth = new Date(year, month, 1);
          const firstDayOfWeek = firstDayOfMonth.getDay();
          
          console.log(`月初: ${firstDayOfMonth.toDateString()}, 曜日: ${firstDayOfWeek}`);
          
          // 第N週の指定曜日を計算
          let targetDayOfWeek = association.meeting_day_of_week;
          let daysUntilTarget = (targetDayOfWeek - firstDayOfWeek + 7) % 7;
          let meetingDate = new Date(year, month, 1 + daysUntilTarget + (association.meeting_week - 1) * 7);

          console.log(`計算された日付: ${meetingDate.toDateString()}`);
          console.log(`月チェック: ${meetingDate.getMonth() === month}, 今日以降: ${meetingDate >= today}`);

          // 月を超えないかチェック、かつ今日以降の日付、かつ半年先以内
          if (meetingDate.getMonth() === month && meetingDate >= today && meetingDate <= sixMonthsLater) {
            const meetingDateTime = new Date(meetingDate);
            meetingDateTime.setHours(
              parseInt(association.meeting_start_time.split(':')[0]),
              parseInt(association.meeting_start_time.split(':')[1])
            );

            const newMeeting = {
              title: `${year}年${month + 1}月 定例理事会`,
              date: meetingDateTime.toISOString(),
              time_start: association.meeting_start_time,
              time_end: association.meeting_end_time,
              location: 'マンション集会室',
              description: '定例理事会（自動作成）',
              status: 'tentative',
              meeting_type: 'regular', // 仕様：半年先まで作成機能では必ず定例理事会とする
              created_by: req.user.userId
            };
            
            meetings.push(newMeeting);
            console.log(`理事会追加: ${meetingDateTime.toISOString()}`);
          } else {
            console.log('条件不一致のため理事会は作成されませんでした');
            if (meetingDate.getMonth() !== month) console.log('  理由: 月を超えている');
            if (meetingDate < today) console.log('  理由: 過去の日付');
            if (meetingDate > sixMonthsLater) console.log('  理由: 半年先制限を超えている');
          }
        } else {
          console.log('設定不足のため理事会は作成されませんでした');
        }
      }

      console.log(`=== 作成された理事会: ${meetings.length}件 ===`);
      return meetings;
    };

    const newMeetings = generateMeetingSchedule(association);
    
    // データベースに会議を保存
    const savedMeetings = [];
    for (const meeting of newMeetings) {
      const result = await dbManager.run(
        'INSERT INTO meetings (title, date, time_start, time_end, location, description, status, meeting_type, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          meeting.title,
          meeting.date,
          meeting.time_start,
          meeting.time_end,
          meeting.location,
          meeting.description,
          meeting.status,
          meeting.meeting_type,
          meeting.created_by
        ]
      );
      
      const savedMeeting = await dbManager.get(
        'SELECT * FROM meetings WHERE id = ?',
        [result.lastID]
      );
      
      savedMeetings.push(savedMeeting);
    }
    
    res.json({
      message: `${savedMeetings.length}件の理事会スケジュールを作成しました`,
      meetings: savedMeetings,
      count: savedMeetings.length
    });
  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// OpenAI APIルート
const openaiRoutes = require('./routes/openai');

// 検索ルート（TypeScriptからのインポート）
try {
  const searchRoutes = require('./dist/routes/search.js').default;
  app.use('/api/search', authenticateToken, searchRoutes);
  console.log('Search routes loaded successfully');
} catch (error) {
  console.warn('Search routes not loaded:', error.message);
}

// 認証が必要なOpenAI APIルートをマウント
app.use('/api/ai', authenticateToken, openaiRoutes);
app.use('/api/openai', authenticateToken, openaiRoutes);

// 本番環境でReactのビルド済みファイルをサーブ
if (process.env.NODE_ENV === 'production') {
  // Reactのビルド済みファイルの静的サーブ
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // React SPAのルーティングに対応（すべてのAPIルート以外をindex.htmlに転送）
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// PDF自動アップロード処理
async function uploadPDFOnStartup() {
  try {
    const pdfPath = path.join(__dirname, 'kiyaku.pdf');
    
    // PDFファイルが存在するかチェック
    if (!fs.existsSync(pdfPath)) {
      console.log('kiyaku.pdfファイルが見つかりません。アップロードをスキップします。');
      return;
    }
    
    // API URLを環境変数から取得、デフォルトは本番環境
    const apiUrl = process.env.API_BASE_URL || 'https://p05-phgg.onrender.com';
    
    // 管理者ユーザーでログインしてJWTトークンを取得
    const loginResponse = await axios.post(`${apiUrl}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    
    // FormDataを作成
    const form = new FormData();
    form.append('pdf', fs.createReadStream(pdfPath));
    
    // PDFをアップロード
    const response = await axios.post(`${apiUrl}/api/upload/pdf`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('PDF自動アップロード成功:', response.data);
  } catch (err) {
    console.error('PDF自動アップロード失敗:', err.response?.data || err.message);
  }
}

// データベース初期化後にサーバーを開始
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // サーバー起動後にPDFアップロードを実行
      uploadPDFOnStartup();
    });
  } catch (error) {
    console.error('サーバーの起動に失敗しました:', error);
    process.exit(1);
  }
};

startServer();