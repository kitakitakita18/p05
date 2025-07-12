import React, { useState } from 'react';
import { api } from '../utils/api';

const MeetingTest: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testCreateMeeting = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('Testing meeting creation...');
      const meeting = await api.createMeeting({
        title: 'テスト理事会',
        location: '会議室',
        description: 'テスト用の理事会です',
        date: new Date().toISOString(),
        status: 'confirmed'
      });
      
      console.log('Meeting created:', meeting);
      setResult(`成功: ${JSON.stringify(meeting, null, 2)}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setResult(`エラー: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetMeetings = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('Testing get meetings...');
      const meetings = await api.getMeetings();
      
      console.log('Meetings fetched:', meetings);
      setResult(`成功: ${JSON.stringify(meetings, null, 2)}`);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      setResult(`エラー: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>理事会API テスト</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testCreateMeeting} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : '理事会作成テスト'}
        </button>
        
        <button 
          onClick={testGetMeetings} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : '理事会取得テスト'}
        </button>
      </div>
      
      {result && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <strong>結果:</strong><br />
          {result}
        </div>
      )}
    </div>
  );
};

export default MeetingTest;