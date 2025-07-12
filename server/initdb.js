const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLiteデータベースファイルのパス
const dbPath = path.join(__dirname, 'database.sqlite');

// データベースを作成・初期化
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベースの作成に失敗しました:', err.message);
    process.exit(1);
  }
  console.log('SQLiteデータベースに接続しました');
});

// テーブル作成とデータ投入を実行
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'chairperson', 'board_member', 'resident')),
      role_cd INTEGER DEFAULT 4,
      room_number TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Meetings table
  db.run(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date DATETIME,
      time_start TEXT,
      time_end TEXT,
      location TEXT,
      description TEXT,
      status TEXT DEFAULT 'tentative' CHECK (status IN ('confirmed', 'tentative', 'completed', 'cancelled')),
      meeting_type TEXT DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'emergency')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Meeting attendance table
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      user_id INTEGER,
      member_name TEXT,
      role TEXT,
      role_name TEXT,
      status TEXT DEFAULT 'maybe' CHECK (status IN ('attending', 'absent', 'maybe')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(meeting_id, user_id)
    )
  `);

  // Agendas table
  db.run(`
    CREATE TABLE IF NOT EXISTS agendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      order_no INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'discussed', 'approved', 'rejected')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Meeting minutes table
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_minutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      original_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      uploaded_by INTEGER,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  // Documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      agenda_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (agenda_id) REFERENCES agendas(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  // Garbage schedule table
  db.run(`
    CREATE TABLE IF NOT EXISTS garbage_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Announcements table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_important BOOLEAN DEFAULT FALSE,
      is_published BOOLEAN DEFAULT TRUE,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Association master table
  db.run(`
    CREATE TABLE IF NOT EXISTS association_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      association_code TEXT UNIQUE NOT NULL,
      association_name TEXT NOT NULL,
      chairperson_name TEXT NOT NULL,
      meeting_frequency INTEGER NOT NULL CHECK (meeting_frequency IN (1, 2, 3, 4)),
      meeting_week INTEGER CHECK (meeting_week IN (1, 2, 3, 4)),
      meeting_day_of_week INTEGER CHECK (meeting_day_of_week IN (0, 1, 2, 3, 4, 5, 6)),
      meeting_start_time TEXT,
      meeting_end_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Date candidate table
  db.run(`
    CREATE TABLE IF NOT EXISTS date_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER,
      candidate_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    )
  `);

  // Date votes table
  db.run(`
    CREATE TABLE IF NOT EXISTS date_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      user_id INTEGER,
      availability TEXT CHECK (availability IN ('available', 'maybe', 'unavailable')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES date_candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(candidate_id, user_id)
    )
  `);

  // 初期データの投入
  console.log('初期データを投入しています...');

  // Users
  const userStmt = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, role_cd, room_number, phone, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ['管理者', 'admin@mansion.com', 'password', 'admin', 1, '管理室', '03-1234-5678', '2025-07-01 00:00:00', '2025-07-01 00:00:00'],
    ['理事長', 'chairperson@mansion.com', 'password', 'chairperson', 2, '101', '090-1234-5678', '2025-07-02 00:00:00', '2025-07-02 00:00:00'],
    ['理事', 'board@mansion.com', 'password', 'board_member', 3, '201', '090-2345-6789', '2025-07-03 00:00:00', '2025-07-03 00:00:00'],
    ['住民A', 'resident@mansion.com', 'password', 'resident', 4, '301', '090-3456-7890', '2025-07-04 00:00:00', '2025-07-04 00:00:00'],
    ['デモ管理者', 'demo@mansion.com', 'demo', 'admin', 1, 'デモ管理室', '03-0000-0001', '2025-07-05 00:00:00', '2025-07-05 00:00:00'],
    ['デモ理事長', 'demo-chair@mansion.com', 'demo', 'chairperson', 2, 'デモ101', '090-0000-0002', '2025-07-05 00:00:00', '2025-07-05 00:00:00'],
    ['デモ理事', 'demo-board@mansion.com', 'demo', 'board_member', 3, 'デモ201', '090-0000-0003', '2025-07-05 00:00:00', '2025-07-05 00:00:00'],
    ['デモ住民', 'demo-resident@mansion.com', 'demo', 'resident', 4, 'デモ301', '090-0000-0004', '2025-07-05 00:00:00', '2025-07-05 00:00:00'],
    ['住民B', 'resident2@mansion.com', 'password', 'resident', 4, '302', '090-4567-8901', '2025-07-05 00:00:00', '2025-07-05 00:00:00']
  ];

  users.forEach(user => {
    userStmt.run(user);
  });
  userStmt.finalize();

  // Meetings
  const meetingStmt = db.prepare(`
    INSERT OR IGNORE INTO meetings (title, date, time_start, time_end, location, description, status, meeting_type, created_by, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const meetings = [
    ['2025年4月 定例理事会', '2025-04-12 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'completed', 'regular', 2, '2025-04-01 00:00:00', '2025-04-01 00:00:00'],
    ['2025年5月 定例理事会', '2025-05-10 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'completed', 'regular', 2, '2025-05-01 00:00:00', '2025-05-01 00:00:00'],
    ['2025年6月 定例理事会', '2025-06-14 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'completed', 'regular', 2, '2025-06-01 00:00:00', '2025-06-01 00:00:00'],
    ['2025年7月 定例理事会', '2025-07-12 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'confirmed', 'regular', 2, '2025-07-01 00:00:00', '2025-07-01 00:00:00'],
    ['2025年8月 定例理事会', '2025-08-09 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'tentative', 'regular', 2, '2025-08-01 00:00:00', '2025-08-01 00:00:00'],
    ['2025年9月 定例理事会', '2025-09-13 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'tentative', 'regular', 2, '2025-09-01 00:00:00', '2025-09-01 00:00:00'],
    ['2025年10月 定例理事会', '2025-10-11 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'tentative', 'regular', 2, '2025-10-01 00:00:00', '2025-10-01 00:00:00'],
    ['2025年11月 定例理事会', '2025-11-08 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'tentative', 'regular', 2, '2025-11-01 00:00:00', '2025-11-01 00:00:00'],
    ['2025年12月 定例理事会', '2025-12-13 18:00:00', '18:00', '20:00', 'マンション集会室', '月次定例理事会', 'tentative', 'regular', 2, '2025-12-01 00:00:00', '2025-12-01 00:00:00']
  ];

  meetings.forEach(meeting => {
    meetingStmt.run(meeting);
  });
  meetingStmt.finalize();

  // Agendas
  const agendaStmt = db.prepare(`
    INSERT OR IGNORE INTO agendas (meeting_id, title, description, order_no, status, created_by, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const agendas = [
    [1, '前回議事録の確認', '前回の理事会議事録を確認します', 1, 'pending', 2, '2025-04-01 00:00:00', '2025-04-01 00:00:00'],
    [1, '修繕計画について', '来年度の修繕計画を検討します', 2, 'pending', 2, '2025-04-01 00:00:00', '2025-04-01 00:00:00'],
    [1, '年次予算の検討', '来年度の管理費予算について話し合います', 3, 'pending', 2, '2025-04-01 00:00:00', '2025-04-01 00:00:00']
  ];

  agendas.forEach(agenda => {
    agendaStmt.run(agenda);
  });
  agendaStmt.finalize();

  // Garbage schedule
  const garbageStmt = db.prepare(`
    INSERT OR IGNORE INTO garbage_schedule (date, type, description, created_at) 
    VALUES (?, ?, ?, ?)
  `);

  const garbageSchedule = [
    ['2025-07-07', '可燃ごみ', '月曜日・木曜日 朝8時まで', '2025-07-01 00:00:00'],
    ['2025-07-08', '資源ごみ', '毎週火曜日 朝8時まで', '2025-07-01 00:00:00'],
    ['2025-07-09', '不燃ごみ', '第2・第4水曜日 朝8時まで', '2025-07-01 00:00:00'],
    ['2025-07-10', '可燃ごみ', '月曜日・木曜日 朝8時まで', '2025-07-01 00:00:00'],
    ['2025-07-11', '粗大ごみ', '第2・第4金曜日 要予約', '2025-07-01 00:00:00']
  ];

  garbageSchedule.forEach(schedule => {
    garbageStmt.run(schedule);
  });
  garbageStmt.finalize();

  // Announcements
  const announcementStmt = db.prepare(`
    INSERT OR IGNORE INTO announcements (title, content, is_important, is_published, created_by, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const announcements = [
    ['夏季休暇のお知らせ', '管理室の夏季休暇についてお知らせいたします。期間中は緊急時のみの対応となります。', true, true, 1, '2025-07-01 00:00:00', '2025-07-01 00:00:00'],
    ['理事会開催のお知らせ', '来月の理事会を開催いたします。詳細は後日ご案内いたします。', false, true, 2, '2025-07-06 00:00:00', '2025-07-06 00:00:00']
  ];

  announcements.forEach(announcement => {
    announcementStmt.run(announcement);
  });
  announcementStmt.finalize();

  // Association master
  const associationStmt = db.prepare(`
    INSERT OR IGNORE INTO association_master (association_code, association_name, chairperson_name, meeting_frequency, meeting_week, meeting_day_of_week, meeting_start_time, meeting_end_time, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  associationStmt.run('ASC001', 'サンプルマンション管理組合', '田中理事長', 1, 2, 6, '18:00', '20:00', '2025-07-01 00:00:00', '2025-07-01 00:00:00');
  associationStmt.finalize();

  console.log('データベースの初期化が完了しました');
});

// データベースを閉じる
db.close((err) => {
  if (err) {
    console.error('データベースの切断に失敗しました:', err.message);
  } else {
    console.log('データベース接続を閉じました');
  }
});