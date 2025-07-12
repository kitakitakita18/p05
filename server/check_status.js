const { dbManager } = require('./database');

async function checkStatus() {
  try {
    await dbManager.connect();
    
    console.log('現在のステータス値:');
    const statusCounts = await dbManager.all('SELECT status, COUNT(*) as count FROM agendas GROUP BY status');
    console.log(statusCounts);
    
    console.log('\n全議題のステータス:');
    const allAgendas = await dbManager.all('SELECT id, title, status FROM agendas LIMIT 10');
    console.log(allAgendas);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await dbManager.close();
  }
}

checkStatus();