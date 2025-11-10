// 數位憑證 API 相關型別定義

export interface CertificateField {
  ename: string;
  content: string;
}

export interface CertificateRequest {
  vcUid: string;
  issuanceDate: string;
  expiredDate: string;
  fields: CertificateField[];
}

export interface CertificateResponse {
  transactionId: string;
  qrCode: string;
  deepLink: string;
}

export interface CertificateApiError {
  error: string;
  message: string;
  details?: any;
}

// 欄位驗證規則
export interface FieldValidationRule {
  required: boolean;
  pattern?: RegExp;
  maxLength?: number;
  minLength?: number;
  validator?: (value: string) => boolean;
}

export type FieldValidationRules = {
  // 基本欄位 - 必填
  id_number: FieldValidationRule;
  name: FieldValidationRule;
  // 自定義欄位 - 必填
  member_serial: FieldValidationRule;
  checkin_time: FieldValidationRule;
  checkout_time: FieldValidationRule;
  booking_id: FieldValidationRule;
  room_num: FieldValidationRule;
  nonce: FieldValidationRule;
  // 自定義欄位 - 非必填
  email: FieldValidationRule;
  booking_title: FieldValidationRule;
  issued_date: FieldValidationRule;
};