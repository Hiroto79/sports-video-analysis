-- events テーブルに owner 列を追加し、アクセス権限（RLS）を設定するマイグレーション

-- 1. events テーブルに owner 列を追加（team_accounts.id を参照）
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS owner TEXT REFERENCES team_accounts(id) ON DELETE SET NULL;

-- インデックスの作成（クエリ高速化のため）
CREATE INDEX IF NOT EXISTS idx_events_owner ON events(owner);

-- 2. RLS（Row Level Security）の有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 既存の同名ポリシーがあれば削除（エラー防止）
DROP POLICY IF EXISTS "Allow active team owner access" ON events;

-- 3. ownerが実在するチームIDであること・アクセス許可ポリシー
-- （※ team_accounts のアクティブ判定は is_active を参照）
CREATE POLICY "Allow active team owner access" ON events
FOR ALL
USING (
  owner IS NULL OR EXISTS (
    SELECT 1 FROM team_accounts 
    WHERE team_accounts.id = events.owner 
    AND (team_accounts.is_active = true OR team_accounts.is_active IS NULL)
  )
)
WITH CHECK (
  owner IS NULL OR EXISTS (
    SELECT 1 FROM team_accounts 
    WHERE team_accounts.id = events.owner 
    AND (team_accounts.is_active = true OR team_accounts.is_active IS NULL)
  )
);
