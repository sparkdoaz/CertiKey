/**
 * 政府數位憑證驗證 API 服務
 * 統一處理所有與政府驗證 VC API 的交互
 */

const API_BASE_URL = process.env.VERIFIER_API_URL || 'https://verifier-sandbox.wallet.gov.tw/api';
const ACCESS_TOKEN = process.env.VERIFIER_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.warn('VERIFIER_ACCESS_TOKEN is not set');
}

export interface VerificationResponse {
  transactionId: string;
  qrcodeImage: string;
  authUri: string;
}

export interface APIError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

/**
 * 取得驗證用資料
 */
export async function getVerificationData(transactionId: string): Promise<VerificationResponse> {
  if (!ACCESS_TOKEN) {
    throw new Error('VERIFIER_ACCESS_TOKEN is not configured');
  }

  const url = `${API_BASE_URL}/oidvp/qrcode?ref=00000000_certikey&transactionId=${transactionId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Verification data retrieval failed: ${errorData.message || response.statusText}`);
  }

  return await response.json();
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
        case '500':
          error.error = 'API_SERVER_ERROR';
          error.message = '政府 API 伺服器錯誤';
          break;
        // 添加其他特定錯誤代碼處理
      }
    }
  }

  return error;
}