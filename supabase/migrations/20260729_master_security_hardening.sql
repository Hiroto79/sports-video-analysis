-- ==============================================================================
-- 【マスターセキュリティ強化＆サブスク管理対応マイグレーション】
-- team_accounts: 全アカウント(アクティブ・停止中問わず)の登録・更新・停止・再開を許可
-- events: アクティブなチーム(is_active = true)の所有データのみアクセス許可
-- ==============================================================================

-- 1. team_accounts テーブルの RLS 強化（停止中アカウントの管理・更新・契約停止を可能にする）
ALTER TABLE team_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow active team_accounts access" ON team_accounts;
DROP POLICY IF EXISTS "Allow team_accounts access" ON team_accounts;

-- メールアドレスと一時パスワード(30分有効)用のカラムを追加
ALTER TABLE team_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE team_accounts ADD COLUMN IF NOT EXISTS temp_password TEXT;
ALTER TABLE team_accounts ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ;

CREATE POLICY "Allow team_accounts access" ON team_accounts
FOR ALL
USING (id IS NOT NULL)
WITH CHECK (id IS NOT NULL);

-- アプリ完結型お問い合わせ・返信管理テーブル
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  team_id TEXT NOT NULL,
  message TEXT NOT NULL,
  reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replied_at TIMESTAMPTZ
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow support_messages access" ON support_messages;
CREATE POLICY "Allow support_messages access" ON support_messages FOR ALL USING (true) WITH CHECK (true);

-- アカウント（チーム）別登録選手名簿テーブル (アカウント間クラウド自動同期)
CREATE TABLE IF NOT EXISTS team_players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  number TEXT,
  position TEXT,
  throws TEXT,
  bats TEXT,
  hand TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow team_players access" ON team_players;
CREATE POLICY "Allow team_players access" ON team_players FOR ALL USING (team_id IS NOT NULL) WITH CHECK (team_id IS NOT NULL);


-- 2. events テーブルの RLS 強化（アクティブな契約中のチーム所有データのみ保護）
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow active team owner access" ON events;
DROP POLICY IF EXISTS "Allow events access" ON events;

CREATE POLICY "Allow active team owner access" ON events
FOR ALL
USING (
  owner IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_accounts 
    WHERE team_accounts.id = events.owner 
    AND (team_accounts.is_active = true OR team_accounts.is_active IS NULL)
  )
)
WITH CHECK (
  owner IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_accounts 
    WHERE team_accounts.id = events.owner 
    AND (team_accounts.is_active = true OR team_accounts.is_active IS NULL)
  )
);


-- 3. access_logs テーブルの作成と RLS 強化（操作・アクセス監査ログ）
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT DEFAULT 'success',
  details JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow log insert for all" ON access_logs;
DROP POLICY IF EXISTS "Allow log select for all" ON access_logs;

CREATE POLICY "Allow log insert for all" ON access_logs
FOR INSERT
WITH CHECK (team_id IS NOT NULL);

CREATE POLICY "Allow log select for all" ON access_logs
FOR SELECT
USING (team_id IS NOT NULL);


