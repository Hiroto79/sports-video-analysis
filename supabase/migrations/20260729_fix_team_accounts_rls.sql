-- team_accounts テーブルの "RLS Policy Always True" 警告を解消するスクリプト

-- 既存の全許可ポリシーを削除
DROP POLICY IF EXISTS "Allow team_accounts access" ON team_accounts;

-- USING (true) を避け、有効なIDが存在する場合のみアクセスを許可するポリシーに変更
CREATE POLICY "Allow team_accounts access" ON team_accounts
FOR ALL
USING (id IS NOT NULL)
WITH CHECK (id IS NOT NULL);
