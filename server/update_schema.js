const { dbManager } = require('./database');

async function updateAgendasSchema() {
  try {
    await dbManager.connect();
    
    console.log('議題テーブルのスキーマを更新中...');
    
    // 1. 種別カラムを追加
    try {
      await dbManager.run(`ALTER TABLE agendas ADD COLUMN category VARCHAR(50) DEFAULT '通常'`);
      console.log('種別カラムを追加しました');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('種別カラム追加エラー:', error.message);
      }
    }
    
    // 2. 採否区分を追加
    try {
      await dbManager.run(`ALTER TABLE agendas ADD COLUMN approval_status VARCHAR(20) DEFAULT NULL`);
      console.log('採否区分カラムを追加しました');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('採否区分カラム追加エラー:', error.message);
      }
    }
    
    // 3. 優先順位区分を追加
    try {
      await dbManager.run(`ALTER TABLE agendas ADD COLUMN priority VARCHAR(1) DEFAULT 'C'`);
      console.log('優先順位区分カラムを追加しました');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('優先順位区分カラム追加エラー:', error.message);
      }
    }
    
    // 4. 開始日を追加
    try {
      await dbManager.run(`ALTER TABLE agendas ADD COLUMN start_date DATE DEFAULT NULL`);
      console.log('開始日カラムを追加しました');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('開始日カラム追加エラー:', error.message);
      }
    }
    
    // 5. 期限日を追加
    try {
      await dbManager.run(`ALTER TABLE agendas ADD COLUMN due_date DATE DEFAULT NULL`);
      console.log('期限日カラムを追加しました');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('期限日カラム追加エラー:', error.message);
      }
    }
    
    // 6. discussion_result列を追加（存在しない場合）
    try {
      await dbManager.run(`ALTER TABLE agendas ADD COLUMN discussion_result TEXT`);
      console.log('議論結果カラムを追加しました');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        console.error('議論結果カラム追加エラー:', error.message);
      }
    }
    
    console.log('議題テーブルのスキーマ更新が完了しました');
    
  } catch (error) {
    console.error('スキーマ更新エラー:', error);
  } finally {
    await dbManager.close();
  }
}

updateAgendasSchema();