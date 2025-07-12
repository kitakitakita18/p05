const { dbManager } = require('./database');

async function updateConstraints() {
  try {
    await dbManager.connect();
    
    console.log('テーブル制約を更新中...');
    
    // SQLiteではCHECK制約を直接変更できないため、テーブルを再作成する必要があります
    // 1. 一時テーブルを作成
    await dbManager.run(`
      CREATE TABLE agendas_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        order_no INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'finished')),
        discussion_result TEXT,
        category VARCHAR(50) DEFAULT '通常',
        approval_status VARCHAR(20) DEFAULT NULL CHECK (approval_status IN ('approved', 'rejected') OR approval_status IS NULL),
        priority VARCHAR(1) DEFAULT 'C' CHECK (priority IN ('S', 'A', 'B', 'C')),
        start_date DATE DEFAULT NULL,
        due_date DATE DEFAULT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. 古いステータス値を新しい値にマッピングしながらデータを移行
    await dbManager.run(`
      INSERT INTO agendas_new (
        id, meeting_id, title, description, order_no, status, discussion_result, 
        category, approval_status, priority, start_date, due_date, created_by, created_at, updated_at
      )
      SELECT 
        id, meeting_id, title, description, order_no,
        CASE 
          WHEN status = 'pending' THEN 'not_started'
          WHEN status = 'discussed' THEN 'in_progress'
          WHEN status = 'approved' THEN 'completed'
          WHEN status = 'rejected' THEN 'completed'
          ELSE 'not_started'
        END as status,
        discussion_result,
        COALESCE(category, '通常') as category,
        CASE 
          WHEN status = 'approved' THEN 'approved'
          WHEN status = 'rejected' THEN 'rejected'
          ELSE NULL
        END as approval_status,
        COALESCE(priority, 'C') as priority,
        start_date, due_date, created_by, created_at, updated_at
      FROM agendas
    `);
    
    // 3. 古いテーブルを削除
    await dbManager.run('DROP TABLE agendas');
    
    // 4. 新しいテーブルの名前を変更
    await dbManager.run('ALTER TABLE agendas_new RENAME TO agendas');
    
    console.log('テーブル制約の更新が完了しました。');
    
    // 確認
    console.log('\n移行後のステータス値:');
    const statusCounts = await dbManager.all('SELECT status, COUNT(*) as count FROM agendas GROUP BY status');
    console.log(statusCounts);
    
    console.log('\n移行後の採否区分:');
    const approvalCounts = await dbManager.all('SELECT approval_status, COUNT(*) as count FROM agendas GROUP BY approval_status');
    console.log(approvalCounts);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await dbManager.close();
  }
}

updateConstraints();