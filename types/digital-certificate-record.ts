// 數位憑證記錄相關型別

export interface DigitalCertificate {
  id: string;
  booking_id: string;
  user_id: string;
  shared_card_id: string | null; // 關聯到共享房卡
  guest_type: 'primary' | 'co-guest'; // 主住者或同住者
  transaction_id: string;
  credential_id: string | null;
  nonce: string | null; // SHA-256 hash 的後 4 碼,用於區分同一用戶的多張憑證
  status: 'pending' | 'claimed' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
  claimed_at: string | null; // 被掃描/領取的時間
  revoked_at: string | null; // 被撤銷的時間
  expires_at: string | null;
}

export interface CreateDigitalCertificateParams {
  booking_id: string;
  user_id: string;
  transaction_id: string;
  shared_card_id?: string | null; // 如果是同住者的憑證,需要傳入 shared_card_id
  guest_type?: 'primary' | 'co-guest'; // 預設為 primary
  // qr_code 和 deep_link 是一次性的,不需要儲存
}

export interface UpdateDigitalCertificateParams {
  credential_id?: string;
  credential_jwt?: string;
  status?: 'pending' | 'claimed' | 'revoked' | 'expired';
  claimed_at?: string;
  revoked_at?: string;
  expires_at?: string;
}

// VC 狀態查詢 API 回應
export interface VCStatusResponse {
  credential: string; // JWT Token
  // 可能還有其他欄位,依實際 API 回應調整
}

// VC 狀態查詢 API 錯誤回應
export interface VCStatusErrorResponse {
  code: string; // 例如: "61010"
  message: string; // 例如: "指定VC不存在，QR Code尚未被掃描"
}

// 從 JWT 解析的資訊
export interface ParsedJWTPayload {
  sub?: string;
  nbf?: number;
  iss?: string;
  exp?: number;
  jti?: string; // 完整的 URL,需要解析出 CID
  nonce?: string;
  vc?: {
    '@context'?: string[];
    type?: string[];
    credentialStatus?: any;
    credentialSchema?: any;
    credentialSubject?: any;
  };
  [key: string]: any;
}
