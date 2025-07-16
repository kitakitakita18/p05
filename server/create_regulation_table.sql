-- Create regulation_chunks table for OpenAI embeddings
CREATE TABLE regulation_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    union_id TEXT NOT NULL,
    regulation_name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample regulation data
INSERT INTO regulation_chunks (union_id, regulation_name, content, embedding) VALUES
('ASC001', 'サンプルマンション管理規約', '第1条（目的）この規約は、マンションの管理に関する基本的な事項を定めることを目的とする。', '[]'),
('ASC001', 'サンプルマンション管理規約', '第2条（理事長の任期）理事長の任期は2年とし、再任を妨げない。', '[]'),
('ASC001', 'サンプルマンション管理規約', '第3条（理事会の開催）理事会は毎月第2土曜日に開催する。', '[]');