-- 更新門禁相關表的結構
-- 簡化 door_access_logs 和 door_qr_codes 表，移除不必要的欄位
-- 刪除現有的表
DROP TABLE IF EXISTS door_access_logs CASCADE;

DROP TABLE IF EXISTS door_qr_codes CASCADE;

-- 重新創建簡化版本的 door_qr_codes 表
CREATE TABLE
  door_qr_codes (
    -- 主鍵
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    -- 關聯欄位
    property_id UUID NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
    -- API 資訊
    transaction_id TEXT NOT NULL UNIQUE, -- 從驗證 API 獲取的 transactionId
    -- 房間資訊
    room TEXT NOT NULL, -- 房間號碼，如 R001
    -- 狀態
    status TEXT DEFAULT 'active' CHECK (
      status IN ('active', 'used', 'expired', 'cancelled')
    ),
    -- 時間戳記
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    expires_at TIMESTAMPTZ NOT NULL, -- QR Code 到期時間
    used_at TIMESTAMPTZ, -- QR Code 被使用的時間
    -- 索引用於查詢效能
    CONSTRAINT fk_door_qr_property FOREIGN KEY (property_id) REFERENCES properties (id)
  );

-- 重新創建簡化版本的 door_access_logs 表
CREATE TABLE
  door_access_logs (
    -- 主鍵
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    -- 關聯欄位
    booking_id UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
    -- 訪問資訊
    access_time TIMESTAMPTZ NOT NULL DEFAULT NOW (), -- 訪問時間
    access_method TEXT DEFAULT 'qr-code' CHECK (
      access_method IN ('qr-code', 'digital-key', 'physical-key')
    ), -- 訪問方式
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'denied')), -- 狀態
    -- QR Code 關聯
    transaction_id TEXT REFERENCES door_qr_codes (transaction_id) ON DELETE SET NULL,
    -- 時間戳記
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_door_qr_codes_property_id ON door_qr_codes (property_id);

CREATE INDEX IF NOT EXISTS idx_door_qr_codes_transaction_id ON door_qr_codes (transaction_id);

CREATE INDEX IF NOT EXISTS idx_door_qr_codes_status ON door_qr_codes (status);

CREATE INDEX IF NOT EXISTS idx_door_qr_codes_expires_at ON door_qr_codes (expires_at);

CREATE INDEX IF NOT EXISTS idx_door_access_logs_booking_id ON door_access_logs (booking_id);

CREATE INDEX IF NOT EXISTS idx_door_access_logs_user_id ON door_access_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_door_access_logs_access_time ON door_access_logs (access_time);

CREATE INDEX IF NOT EXISTS idx_door_access_logs_transaction_id ON door_access_logs (transaction_id);