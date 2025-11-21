-- 添加短 ID 欄位到現有表
-- 為用戶和預訂添加短 ID 欄位，用於 VC 避免 UUID 過長

-- 為 user_profiles 表添加 short_id
ALTER TABLE user_profiles ADD COLUMN short_id TEXT UNIQUE;

-- 為 bookings 表添加 short_id
ALTER TABLE bookings ADD COLUMN short_id TEXT UNIQUE;

-- 生成現有記錄的短 ID
-- 注意：這是示例，實際需要根據您的應用邏輯生成
UPDATE user_profiles SET short_id = UPPER(SUBSTRING(MD5(id::text || created_at::text), 1, 12)) WHERE short_id IS NULL;
UPDATE bookings SET short_id = UPPER(SUBSTRING(MD5(id::text || created_at::text), 1, 12)) WHERE short_id IS NULL;

-- 設置 NOT NULL 約束（在確認所有記錄都有 short_id 後）
-- ALTER TABLE user_profiles ALTER COLUMN short_id SET NOT NULL;
-- ALTER TABLE bookings ALTER COLUMN short_id SET NOT NULL;

-- 創建索引以提升查詢效能
CREATE INDEX idx_user_profiles_short_id ON user_profiles (short_id);
CREATE INDEX idx_bookings_short_id ON bookings (short_id);