const { dbManager, initializeDatabase } = require('./server/database');

async function testDatabase() {
  try {
    await initializeDatabase();
    
    console.log('=== データベーステスト開始 ===');
    
    // ユーザーテスト
    console.log('\n1. ユーザーデータ:');
    const users = await dbManager.all('SELECT id, name, email, role FROM users LIMIT 5');
    console.log(users);
    
    // 会議テスト
    console.log('\n2. 会議データ:');
    const meetings = await dbManager.all('SELECT id, title, date, status FROM meetings LIMIT 5');
    console.log(meetings);
    
    // 議題テスト
    console.log('\n3. 議題データ:');
    const agendas = await dbManager.all('SELECT id, meeting_id, title, order_no FROM agendas LIMIT 5');
    console.log(agendas);
    
    // 組合情報テスト
    console.log('\n4. 組合情報:');
    const association = await dbManager.get('SELECT * FROM association_master LIMIT 1');
    console.log(association);
    
    // ゴミ収集スケジュールテスト
    console.log('\n5. ゴミ収集スケジュール:');
    const garbageSchedule = await dbManager.all('SELECT * FROM garbage_schedule LIMIT 5');
    console.log(garbageSchedule);
    
    // お知らせテスト
    console.log('\n6. お知らせ:');
    const announcements = await dbManager.all('SELECT * FROM announcements LIMIT 5');
    console.log(announcements);
    
    console.log('\n=== データベーステスト完了 ===');
    
    await dbManager.close();
  } catch (error) {
    console.error('テストエラー:', error);
    process.exit(1);
  }
}

testDatabase();