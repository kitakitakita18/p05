-- 🚀 データベース最適化スクリプト
-- マンション理事会管理システム高性能化

-- 1. 🔍 既存テーブルの最適化インデックス追加

-- ユーザーテーブル最適化
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_room_number ON users(room_number);

-- 会議テーブル最適化
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_type ON meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_date_status ON meetings(date, status);

-- 議題テーブル最適化
CREATE INDEX IF NOT EXISTS idx_agendas_meeting_id ON agendas(meeting_id);
CREATE INDEX IF NOT EXISTS idx_agendas_status ON agendas(status);
CREATE INDEX IF NOT EXISTS idx_agendas_meeting_order ON agendas(meeting_id, order_no);

-- 会議出席テーブル最適化
CREATE INDEX IF NOT EXISTS idx_attendance_meeting_id ON meeting_attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON meeting_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON meeting_attendance(status);

-- 議事録テーブル最適化
CREATE INDEX IF NOT EXISTS idx_minutes_meeting_id ON meeting_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_minutes_approved ON meeting_minutes(is_approved);

-- 文書テーブル最適化
CREATE INDEX IF NOT EXISTS idx_documents_meeting_id ON documents(meeting_id);
CREATE INDEX IF NOT EXISTS idx_documents_agenda_id ON documents(agenda_id);
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);

-- お知らせテーブル最適化
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_important ON announcements(is_important);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- ゴミスケジュールテーブル最適化
CREATE INDEX IF NOT EXISTS idx_garbage_date ON garbage_schedule(date);
CREATE INDEX IF NOT EXISTS idx_garbage_type ON garbage_schedule(type);
CREATE INDEX IF NOT EXISTS idx_garbage_date_type ON garbage_schedule(date, type);

-- 議題コメントテーブル最適化
CREATE INDEX IF NOT EXISTS idx_agenda_comments_agenda_id ON agenda_comments(agenda_id);
CREATE INDEX IF NOT EXISTS idx_agenda_comments_user_id ON agenda_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_comments_created_at ON agenda_comments(created_at DESC);

-- 2. 📊 統計テーブル追加（パフォーマンス監視用）

CREATE TABLE IF NOT EXISTS query_performance_stats (
    id SERIAL PRIMARY KEY,
    query_type VARCHAR(50) NOT NULL,
    query_duration_ms INTEGER NOT NULL,
    query_params TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    is_cached BOOLEAN DEFAULT FALSE,
    cache_hit_rate DECIMAL(5,2)
);

CREATE INDEX idx_perf_stats_type ON query_performance_stats(query_type);
CREATE INDEX idx_perf_stats_executed_at ON query_performance_stats(executed_at DESC);
CREATE INDEX idx_perf_stats_duration ON query_performance_stats(query_duration_ms DESC);

-- 3. 🗂️ 検索最適化用のマテリアライズドビュー

-- 最新会議情報ビュー
CREATE OR REPLACE VIEW v_latest_meetings AS
SELECT 
    m.id,
    m.title,
    m.date,
    m.time_start,
    m.time_end,
    m.location,
    m.status,
    m.meeting_type,
    u.name as created_by_name,
    COUNT(ma.id) as total_attendees,
    COUNT(CASE WHEN ma.status = 'attending' THEN 1 END) as confirmed_attendees,
    COUNT(a.id) as agenda_count
FROM meetings m
LEFT JOIN users u ON m.created_by = u.id
LEFT JOIN meeting_attendance ma ON m.id = ma.meeting_id
LEFT JOIN agendas a ON m.id = a.meeting_id
WHERE m.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY m.id, m.title, m.date, m.time_start, m.time_end, 
         m.location, m.status, m.meeting_type, u.name;

-- ユーザー活動統計ビュー
CREATE OR REPLACE VIEW v_user_activity_stats AS
SELECT 
    u.id,
    u.name,
    u.role,
    u.room_number,
    COUNT(DISTINCT ma.meeting_id) as meetings_attended,
    COUNT(DISTINCT ac.id) as comments_posted,
    COUNT(DISTINCT m.id) as meetings_created,
    MAX(COALESCE(ma.created_at, ac.created_at, m.created_at)) as last_activity
FROM users u
LEFT JOIN meeting_attendance ma ON u.id = ma.user_id AND ma.status = 'attending'
LEFT JOIN agenda_comments ac ON u.id = ac.user_id
LEFT JOIN meetings m ON u.id = m.created_by
WHERE u.role != 'admin'
GROUP BY u.id, u.name, u.role, u.room_number;

-- 4. 🔧 定期メンテナンス用プロシージャ

-- 古いデータクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_old_performance_stats()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_performance_stats 
    WHERE executed_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- テーブル統計更新
    ANALYZE query_performance_stats;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- パフォーマンス統計更新関数
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
BEGIN
    ANALYZE users;
    ANALYZE meetings;
    ANALYZE agendas;
    ANALYZE meeting_attendance;
    ANALYZE meeting_minutes;
    ANALYZE documents;
    ANALYZE announcements;
    ANALYZE garbage_schedule;
    ANALYZE agenda_comments;
END;
$$ LANGUAGE plpgsql;

-- 5. 🎯 検索最適化のためのGINインデックス（全文検索）

-- お知らせの全文検索インデックス
CREATE INDEX IF NOT EXISTS idx_announcements_content_gin 
ON announcements USING gin(to_tsvector('japanese', title || ' ' || content));

-- 議事録の全文検索インデックス  
CREATE INDEX IF NOT EXISTS idx_minutes_content_gin 
ON meeting_minutes USING gin(to_tsvector('japanese', content));

-- 議題の全文検索インデックス
CREATE INDEX IF NOT EXISTS idx_agendas_content_gin 
ON agendas USING gin(to_tsvector('japanese', title || ' ' || COALESCE(description, '')));

-- 6. 💾 パーティション設定（大容量データ対応）

-- 月次パーティション用の議事録アーカイブテーブル
CREATE TABLE IF NOT EXISTS meeting_minutes_archive (
    LIKE meeting_minutes INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 過去データのパーティション作成例
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    -- 過去12ヶ月分のパーティションを作成
    FOR i IN 0..11 LOOP
        start_date := date_trunc('month', CURRENT_DATE - interval '1 month' * i);
        end_date := start_date + interval '1 month';
        partition_name := 'meeting_minutes_archive_' || to_char(start_date, 'YYYY_MM');
        
        -- パーティションが存在しない場合のみ作成
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = partition_name
        ) THEN
            EXECUTE format('CREATE TABLE %I PARTITION OF meeting_minutes_archive 
                           FOR VALUES FROM (%L) TO (%L)', 
                           partition_name, start_date, end_date);
        END IF;
    END LOOP;
END $$;

-- 7. 📈 クエリ実行計画分析用ビュー

CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query_type,
    AVG(query_duration_ms) as avg_duration,
    MAX(query_duration_ms) as max_duration,
    COUNT(*) as execution_count,
    COUNT(*) FILTER (WHERE is_cached = true) as cached_executions,
    ROUND(AVG(cache_hit_rate), 2) as avg_cache_hit_rate
FROM query_performance_stats
WHERE executed_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY query_type
HAVING AVG(query_duration_ms) > 100
ORDER BY avg_duration DESC;

-- 8. 🚀 初期化完了ログ

INSERT INTO query_performance_stats (query_type, query_duration_ms, query_params, is_cached) 
VALUES ('database_optimization_init', 0, 'Initial database optimization setup completed', false);

COMMENT ON TABLE query_performance_stats IS 'データベースクエリのパフォーマンス統計テーブル';
COMMENT ON VIEW v_latest_meetings IS '直近30日間の会議情報ビュー（統計情報含む）';
COMMENT ON VIEW v_user_activity_stats IS 'ユーザーの活動統計ビュー';
COMMENT ON FUNCTION cleanup_old_performance_stats() IS '30日以上古いパフォーマンス統計データを削除';
COMMENT ON FUNCTION update_table_statistics() IS '全テーブルの統計情報を更新してクエリプランナーを最適化';