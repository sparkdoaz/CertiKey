-- 建立數位憑證記錄表
-- 用於儲存每次領取數位房卡時的 transactionId 和相關資訊

CREATE TABLE IF NOT EXISTS digital_certificates (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關聯欄位
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE, -- 修正: 參考 user_profiles 而非 auth.users
  shared_card_id UUID REFERENCES shared_room_cards(id) ON DELETE SET NULL, -- 如果是同住者的房卡,關聯到共享房卡記錄
  guest_type TEXT NOT NULL DEFAULT 'primary' CHECK (guest_type IN ('primary', 'co-guest')), -- 主住者或同住者
  
  -- API 回應資訊
  transaction_id TEXT NOT NULL UNIQUE, -- 從 API 回應獲取的 transactionId,用於查詢 VC 狀態
  credential_id TEXT, -- 從 JWT jti 解析出的 CID (格式: a16187e9-755e-48ca-a9c0-622f76fe1360),用於撤銷 API
  
  -- 註: qr_code, deep_link, credential_jwt 都不需要儲存
  -- qr_code 和 deep_link 是一次性的,掃描後即失效
  -- credential_jwt 只需解析一次取得 credential_id 和 expires_at 即可
  
  -- 憑證狀態
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'revoked', 'expired')),
  -- pending: QR Code 已產生但尚未被掃描 (查詢 API 回傳 61010)
  -- claimed: QR Code 已被掃描,憑證已建立 (查詢 API 回傳完整 JWT)
  -- revoked: 憑證已被撤銷 (呼叫撤銷 API)
  -- expired: 憑證已過期 (根據 JWT exp 判斷)
  
  -- 時間戳記
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ, -- 憑證被掃描/領取的時間 (從查詢 API 得知)
  revoked_at TIMESTAMPTZ, -- 憑證被撤銷的時間
  expires_at TIMESTAMPTZ, -- 憑證到期時間 (從 JWT exp 解析)
  
  -- 索引用於查詢效能
  CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 建立索引
CREATE INDEX idx_digital_certificates_booking_id ON digital_certificates(booking_id);
CREATE INDEX idx_digital_certificates_user_id ON digital_certificates(user_id);
CREATE INDEX idx_digital_certificates_shared_card_id ON digital_certificates(shared_card_id);
CREATE INDEX idx_digital_certificates_transaction_id ON digital_certificates(transaction_id);
CREATE INDEX idx_digital_certificates_credential_id ON digital_certificates(credential_id);
CREATE INDEX idx_digital_certificates_status ON digital_certificates(status);
CREATE INDEX idx_digital_certificates_guest_type ON digital_certificates(guest_type);
CREATE INDEX idx_digital_certificates_created_at ON digital_certificates(created_at DESC);

-- 建立更新時間的觸發器
CREATE OR REPLACE FUNCTION update_digital_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_digital_certificates_updated_at
  BEFORE UPDATE ON digital_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_digital_certificates_updated_at();

-- 加上註解說明
COMMENT ON TABLE digital_certificates IS '數位憑證記錄表 - 儲存每次領取數位房卡的 transactionId 和憑證資訊,支援主住者和同住者各自擁有獨立憑證';
COMMENT ON COLUMN digital_certificates.shared_card_id IS '關聯到共享房卡記錄,如果是同住者的憑證則有值';
COMMENT ON COLUMN digital_certificates.guest_type IS '訪客類型: primary(主住者/訂房者), co-guest(同住者/受邀者)';
COMMENT ON COLUMN digital_certificates.transaction_id IS 'API 回應的 transactionId,用於查詢 VC 狀態';
COMMENT ON COLUMN digital_certificates.credential_id IS '從 JWT jti 解析的 CID (credential ID),用於呼叫撤銷 API';
COMMENT ON COLUMN digital_certificates.status IS '憑證狀態: pending(QR Code 未掃描,API 回傳 61010), claimed(已掃描已領取,API 回傳 JWT), expired(已過期)';
COMMENT ON COLUMN digital_certificates.claimed_at IS '憑證被掃描的時間,當 API 回傳完整資料時更新';

-- 啟用 Row Level Security (RLS)
ALTER TABLE digital_certificates ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能查看自己的憑證記錄
CREATE POLICY "Users can view their own certificates"
  ON digital_certificates
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 政策：用戶只能更新自己的憑證記錄
CREATE POLICY "Users can update their own certificates"
  ON digital_certificates
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS 政策：系統可以插入憑證記錄 (透過 service_role)
CREATE POLICY "Service role can insert certificates"
  ON digital_certificates
  FOR INSERT
  WITH CHECK (true);

-- RLS 政策：房東可以查看其房源的所有憑證記錄
CREATE POLICY "Hosts can view certificates for their properties"
  ON digital_certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.id = digital_certificates.booking_id
        AND p.host_id = auth.uid()
    )
  );
