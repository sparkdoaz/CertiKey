-- 新增 nonce 欄位到 digital_certificates 表
-- nonce 用於區分同一用戶的多張憑證,作為撤銷時的識別依據
ALTER TABLE digital_certificates
ADD COLUMN nonce TEXT;

-- 為 nonce 建立索引以加速查詢
CREATE INDEX idx_digital_certificates_nonce ON digital_certificates (nonce);

-- 新增複合索引用於撤銷查詢 (user_id + booking_id + nonce)
CREATE INDEX idx_digital_certificates_revoke_lookup ON digital_certificates (user_id, booking_id, nonce);

-- 加上註解說明
COMMENT ON COLUMN digital_certificates.nonce IS 'SHA-256 hash 的後 4 碼,用於區分同一用戶的多張憑證,作為撤銷時的識別依據';