import { FieldValidationRules, CertificateField } from '../types/digital-certificate';

// 台灣身分證字號驗證 (只檢查基本格式，不進行檢核碼驗證)
function validateTaiwanId(id: string): boolean {
  const pattern = /^[A-Z][12]\d{8}$/;
  return pattern.test(id);
}// 電子郵件格式驗證
function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// 姓名格式驗證 (允許中文、英文、數字和底線)
function validateNameFormat(name: string): boolean {
  const pattern = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
  return pattern.test(name);
}

// 標題格式驗證 (只允許英文、數字和底線，政府 API 不支援中文)
function validateTitleFormat(title: string): boolean {
  const pattern = /^[a-zA-Z0-9_]+$/;
  return pattern.test(title);
}

// 大小寫字母和數字驗證
function validateAlphanumeric(value: string): boolean {
  const pattern = /^[a-zA-Z0-9]+$/;
  return pattern.test(value);
}

// 訂單編號驗證 (允許 UUID 格式，包含連字符號)
function validateBookingId(value: string): boolean {
  const pattern = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
  return pattern.test(value);
}

// 訂單編號轉換 (將 UUID 格式轉換為英數字格式)
function normalizeBookingId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
}
function validateDateTime(dateTime: string): boolean {
  const pattern = /^\d{8}T\d{4}$/;
  if (!pattern.test(dateTime)) return false;
  
  // 進一步驗證日期是否有效
  const year = parseInt(dateTime.substring(0, 4));
  const month = parseInt(dateTime.substring(4, 6));
  const day = parseInt(dateTime.substring(6, 8));
  const hour = parseInt(dateTime.substring(9, 11));
  const minute = parseInt(dateTime.substring(11, 13));
  
  const date = new Date(year, month - 1, day, hour, minute);
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day &&
         date.getHours() === hour &&
         date.getMinutes() === minute;
}

// 定義欄位驗證規則(依照新版規格)
export const fieldValidationRules: FieldValidationRules = {
  // 基本欄位 - 必填
  id_number: {
    required: true,
    validator: validateTaiwanId
  },
  name: {
    required: true,
    validator: validateNameFormat,
    maxLength: 50
  },
  // 自定義欄位 - 必填
  member_serial: {
    required: true,
    validator: validateAlphanumeric,
    maxLength: 20
  },
  checkin_time: {
    required: true,
    validator: validateDateTime
  },
  checkout_time: {
    required: true,
    validator: validateDateTime
  },
  booking_id: {
    required: true,
    validator: validateBookingId,
    maxLength: 36
  },
  room_num: {
    required: true,
    validator: validateAlphanumeric,
    maxLength: 10
  },
  nonce: {
    required: true,
    validator: validateAlphanumeric,
    maxLength: 32
  },
  // 自定義欄位 - 非必填
  email: {
    required: false, // 改為非必填
    validator: validateEmail,
    maxLength: 100
  },
  booking_title: {
    required: false,
    validator: validateTitleFormat,
    maxLength: 50
  },
  issued_date: {
    required: false,
    validator: validateAlphanumeric,
    maxLength: 20
  }
};

// 驗證單一欄位
export function validateField(fieldName: string, content: string): { isValid: boolean; error?: string } {
  const rule = fieldValidationRules[fieldName as keyof FieldValidationRules];

  if (!rule) {
    return { isValid: false, error: `未知的欄位: ${fieldName}` };
  }

  // 檢查必填
  if (rule.required && (!content || content.trim().length === 0)) {
    return { isValid: false, error: `${fieldName} 為必填欄位` };
  }

  // 檢查長度限制
  if (rule.maxLength && content.length > rule.maxLength) {
    return { isValid: false, error: `${fieldName} 長度不能超過 ${rule.maxLength} 字元` };
  }

  if (rule.minLength && content.length < rule.minLength) {
    return { isValid: false, error: `${fieldName} 長度不能少於 ${rule.minLength} 字元` };
  }

  // 檢查正規表達式
  if (rule.pattern && !rule.pattern.test(content)) {
    return { isValid: false, error: `${fieldName} 格式不正確` };
  }

  // 檢查自定義驗證器
  if (rule.validator && !rule.validator(content)) {
    return { isValid: false, error: getFieldErrorMessage(fieldName) };
  }

  return { isValid: true };
}

// 獲取欄位特定的錯誤訊息
function getFieldErrorMessage(fieldName: string): string {
  const messages: { [key: string]: string } = {
    id_number: '身分證字號格式不正確',
    name: '姓名只能包含中文、英文、數字和底線',
    member_serial: '會員編號只能包含英文字母和數字',
    checkin_time: '進房時間格式不正確 (格式: YYYYMMDDTHHMM)',
    checkout_time: '退房時間格式不正確 (格式: YYYYMMDDTHHMM)',
    booking_id: '訂單編號格式不正確 (應為 UUID 格式)',
    room_num: '房門號只能包含英文字母和數字',
    nonce: 'Nonce 只能包含英文字母和數字',
    email: '電子郵件格式不正確',
    booking_title: '訂單標題只能包含英文、數字和底線',
    issued_date: '發行日期格式不正確'
  };
  
  return messages[fieldName] || `${fieldName} 格式不正確`;
}

// 驗證所有欄位並進行數據標準化
export function validateFields(fields: CertificateField[]): { isValid: boolean; errors: string[]; normalizedFields: CertificateField[] } {
  const errors: string[] = [];
  const normalizedFields: CertificateField[] = [];
  const providedFields = fields.map(f => f.ename);

  // 檢查是否所有必填欄位都有提供
  for (const [fieldName, rule] of Object.entries(fieldValidationRules)) {
    if (rule.required && !providedFields.includes(fieldName)) {
      errors.push(`缺少必填欄位: ${fieldName}`);
    }
  }

  // 驗證每個提供的欄位並進行標準化
  for (const field of fields) {
    const rule = fieldValidationRules[field.ename as keyof FieldValidationRules];
    if (!rule) {
      errors.push(`未知的欄位: ${field.ename}`);
      continue;
    }
    
    // 處理空的非必填欄位
    if (!rule.required && (!field.content || field.content.trim().length === 0)) {
      normalizedFields.push({ ...field }); // 保持原樣
      continue;
    }
    
    // 驗證欄位
    const validation = validateField(field.ename, field.content);
    if (!validation.isValid) {
      errors.push(validation.error!);
      normalizedFields.push({ ...field }); // 即使驗證失敗也保留原值
      continue;
    }
    
    // 驗證通過，進行數據標準化
    let normalizedContent = field.content;
    if (field.ename === 'booking_id') {
      normalizedContent = normalizeBookingId(field.content);
    }
    
    normalizedFields.push({
      ...field,
      content: normalizedContent
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedFields
  };
}