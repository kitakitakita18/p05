const { dbManager } = require('./database');

async function migrateStatus() {
  try {
    await dbManager.connect();
    
    console.log('既存のステータス値を新しい値に移行中...');
    
    // 古いステータス値を新しい値にマッピング
    await dbManager.run("UPDATE agendas SET status = 'not_started' WHERE status = 'pending'");
    await dbManager.run("UPDATE agendas SET status = 'in_progress' WHERE status = 'discussed'");
    await dbManager.run("UPDATE agendas SET status = 'completed' WHERE status = 'approved'");
    await dbManager.run("UPDATE agendas SET status = 'completed' WHERE status = 'rejected'");
    
    console.log('ステータス値の移行が完了しました。');
    
    // 移行後の確認
    console.log('\n移行後のステータス値:');
    const statusCounts = await dbManager.all('SELECT status, COUNT(*) as count FROM agendas GROUP BY status');
    console.log(statusCounts);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await dbManager.close();
  }
}

migrateStatus();