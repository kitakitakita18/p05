-- Update agendas table to add new columns
-- 議題管理テーブルの拡張

-- 1. 種別カラムを追加
ALTER TABLE agendas ADD COLUMN category VARCHAR(50) DEFAULT '通常';

-- 2. ステータスを新しい値に変更（既存データを保持しつつ）
-- まず新しい制約を追加
ALTER TABLE agendas DROP CONSTRAINT IF EXISTS agendas_status_check;
ALTER TABLE agendas ADD CONSTRAINT agendas_status_check CHECK (status IN ('pending', 'discussed', 'approved', 'rejected', 'not_started', 'in_progress', 'completed', 'on_hold', 'finished'));

-- 3. 採否区分を追加
ALTER TABLE agendas ADD COLUMN approval_status VARCHAR(20) DEFAULT NULL CHECK (approval_status IN ('approved', 'rejected') OR approval_status IS NULL);

-- 4. 優先順位区分を追加
ALTER TABLE agendas ADD COLUMN priority VARCHAR(1) DEFAULT 'C' CHECK (priority IN ('S', 'A', 'B', 'C'));

-- 5. 開始日を追加
ALTER TABLE agendas ADD COLUMN start_date DATE DEFAULT NULL;

-- 6. 期限日を追加
ALTER TABLE agendas ADD COLUMN due_date DATE DEFAULT NULL;

-- 7. 既存のdiscussion_result列を追加（存在しない場合）
ALTER TABLE agendas ADD COLUMN IF NOT EXISTS discussion_result TEXT;

-- 既存データの移行
-- 古いステータス値を新しい値にマッピング
UPDATE agendas SET status = 'not_started' WHERE status = 'pending';
UPDATE agendas SET status = 'in_progress' WHERE status = 'discussed';
UPDATE agendas SET status = 'completed' WHERE status = 'approved';
UPDATE agendas SET status = 'completed' WHERE status = 'rejected';

-- 採否区分の設定（必要に応じて）
UPDATE agendas SET approval_status = 'approved' WHERE status = 'completed' AND discussion_result LIKE '%承認%';
UPDATE agendas SET approval_status = 'rejected' WHERE status = 'completed' AND discussion_result LIKE '%否決%';