/**
 * 政府數位憑證 API 服務
 * 統一處理所有與政府 VC API 的交互
 */

const API_BASE_URL = process.env.DIGITAL_CERTIFICATE_API_URL || 'https://issuer-sandbox.wallet.gov.tw/api';
const ACCESS_TOKEN = process.env.DIGITAL_CERTIFICATE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.warn('DIGITAL_CERTIFICATE_ACCESS_TOKEN is not set');
}

export interface CertificateRequest {
  vcUid: string;
  issuanceDate: string;
  expiredDate: string;
  fields: Array<{
    ename: string;
    content: string;
  }>;
}

export interface CertificateResponse {
  transactionId: string;
  qrCode: string;
  deepLink: string;
}

export interface VCStatusResponse {
  credential: string;
  [key: string]: any;
}

export interface VCStatusError {
  error: string;
  code: string;
  message: string;
}

export type VCStatusResult = VCStatusResponse | VCStatusError;

export interface APIError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

/**
 * 創建數位憑證
 */
export async function createCertificate(requestData: CertificateRequest): Promise<CertificateResponse> {
  if (!ACCESS_TOKEN) {
    throw new Error('DIGITAL_CERTIFICATE_ACCESS_TOKEN is not configured');
  }

  const response = await fetch(`${API_BASE_URL}/qrcode/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Certificate creation failed: ${errorData.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * 查詢憑證狀態
 * 注意：對於某些錯誤狀態（如 61010: 憑證尚未被領取），會返回特殊的響應而不是拋出錯誤
 */
export async function getCertificateStatus(transactionId: string): Promise<VCStatusResult> {
  if (!ACCESS_TOKEN) {
    throw new Error('DIGITAL_CERTIFICATE_ACCESS_TOKEN is not configured');
  }

  const statusUrl = `${API_BASE_URL}/credential/nonce/${transactionId}`;
  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    
    // 對於特定的錯誤代碼，返回特殊的響應而不是拋出錯誤
    if (response.status === 400 && errorData.code === '61010') {
      return {
        error: 'CERTIFICATE_NOT_CLAIMED',
        code: '61010',
        message: errorData.message || '憑證尚未被領取'
      };
    }
    
    throw new Error(`Status query failed: ${errorData.message || response.statusText}`);
  }

  return await response.json();
}

/**
 * 撤銷憑證
 */
export async function revokeCertificate(credentialId: string): Promise<void> {
  if (!ACCESS_TOKEN) {
    throw new Error('DIGITAL_CERTIFICATE_ACCESS_TOKEN is not configured');
  }

  const revokeUrl = `${API_BASE_URL}/credential/${credentialId}/revocation`;
  const response = await fetch(revokeUrl, {
    method: 'POST',
    headers: {
      'Access-Token': ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Certificate revocation failed: ${errorData.message || response.statusText}`);
  }
}

/**
 * 處理 API 錯誤響應
 */
export function handleAPIError(response: Response, errorData?: any): APIError {
  const error: APIError = {
    error: 'EXTERNAL_API_ERROR',
    message: '外部 API 調用失敗',
  };

  if (errorData) {
    error.details = errorData;

    // 處理特定的錯誤代碼
    if (errorData.code) {
      error.code = errorData.code;

      switch (errorData.code) {
        case '61010':
          error.error = 'CERTIFICATE_NOT_CLAIMED';
          error.message = '憑證尚未被領取';
          break;
        case '61006':
          error.error = 'INVALID_CREDENTIAL_ID';
          error.message = '無效的憑證識別碼';
          break;
        case '500':
          error.error = 'API_SERVER_ERROR';
          error.message = '政府 API 伺服器錯誤';
          break;
      }
    }
  }

  return error;
}