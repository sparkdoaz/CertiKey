import { supabase } from './supabase';
import {
  DigitalCertificate,
  CreateDigitalCertificateParams,
  UpdateDigitalCertificateParams,
  ParsedJWTPayload,
} from '@/types/digital-certificate-record';

/**
 * 解析 JWT Token 的 payload 部分
 */
export function parseJWTPayload(jwt: string): ParsedJWTPayload | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * 從 JWT jti 欄位提取 Credential ID (CID)
 * 格式: "https://.../api/credential/a16187e9-755e-48ca-a9c0-622f76fe1360"
 * 回傳: "a16187e9-755e-48ca-a9c0-622f76fe1360"
 */
export function extractCredentialId(jti: string): string | null {
  try {
    const match = jti.match(/\/credential\/([a-f0-9-]+)$/i);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Failed to extract credential ID:', error);
    return null;
  }
}

/**
 * 建立數位憑證記錄
 */
export async function createDigitalCertificate(
  params: CreateDigitalCertificateParams
): Promise<DigitalCertificate | null> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .insert({
        booking_id: params.booking_id,
        user_id: params.user_id,
        transaction_id: params.transaction_id,
        shared_card_id: params.shared_card_id || null,
        guest_type: params.guest_type || 'primary',
        status: 'pending', // 剛建立,等待用戶掃描
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create digital certificate:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating digital certificate:', error);
    return null;
  }
}

/**
 * 更新數位憑證記錄
 */
export async function updateDigitalCertificate(
  id: string,
  params: UpdateDigitalCertificateParams
): Promise<DigitalCertificate | null> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update digital certificate:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating digital certificate:', error);
    return null;
  }
}

/**
 * 根據 transaction_id 查詢憑證記錄
 */
export async function getDigitalCertificateByTransactionId(
  transactionId: string
): Promise<DigitalCertificate | null> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error) {
      console.error('Failed to get digital certificate:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting digital certificate:', error);
    return null;
  }
}

/**
 * 根據 booking_id 查詢憑證記錄
 */
export async function getDigitalCertificatesByBookingId(
  bookingId: string
): Promise<DigitalCertificate[]> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get digital certificates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting digital certificates:', error);
    return [];
  }
}

/**
 * 查詢用戶的所有憑證記錄
 */
export async function getUserDigitalCertificates(
  userId: string
): Promise<DigitalCertificate[]> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user digital certificates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user digital certificates:', error);
    return [];
  }
}

/**
 * 標記憑證為已領取
 */
export async function markCertificateAsClaimed(
  id: string
): Promise<DigitalCertificate | null> {
  return updateDigitalCertificate(id, {
    status: 'claimed',
    claimed_at: new Date().toISOString(),
  });
}

/**
 * 標記憑證為已過期
 */
export async function markCertificateAsExpired(
  id: string
): Promise<DigitalCertificate | null> {
  return updateDigitalCertificate(id, {
    status: 'expired',
  });
}

/**
 * 標記憑證為已撤銷
 */
export async function markCertificateAsRevoked(
  id: string
): Promise<DigitalCertificate | null> {
  return updateDigitalCertificate(id, {
    status: 'revoked',
    revoked_at: new Date().toISOString(),
  });
}

/**
 * 查詢訂單的所有數位憑證(包含主住者和所有同住者)
 */
export async function getBookingCertificates(
  bookingId: string
): Promise<DigitalCertificate[]> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get booking certificates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting booking certificates:', error);
    return [];
  }
}

/**
 * 查詢共享房卡的憑證記錄
 */
export async function getCertificateBySharedCardId(
  sharedCardId: string
): Promise<DigitalCertificate | null> {
  try {
    const { data, error } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('shared_card_id', sharedCardId)
      .single();

    if (error) {
      console.error('Failed to get certificate by shared card:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting certificate by shared card:', error);
    return null;
  }
}

/**
 * 檢查用戶是否為房主
 * @param userId - 用戶 ID
 * @param bookingId - 訂單 ID
 */
export async function isUserHost(
  userId: string,
  bookingId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        property_id,
        properties!inner (
          host_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      console.error('Failed to check if user is host:', error);
      return false;
    }

    const properties = data.properties as unknown as { host_id: string };
    return properties.host_id === userId;
  } catch (error) {
    console.error('Error checking if user is host:', error);
    return false;
  }
}

/**
 * 檢查用戶是否為主住者
 * @param userId - 用戶 ID
 * @param bookingId - 訂單 ID
 */
export async function isUserPrimaryGuest(
  userId: string,
  bookingId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('guest_id')
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      console.error('Failed to check if user is primary guest:', error);
      return false;
    }

    return data.guest_id === userId;
  } catch (error) {
    console.error('Error checking if user is primary guest:', error);
    return false;
  }
}

/**
 * 檢查憑證是否由特定用戶邀請的同住者持有
 * @param certificateId - 憑證 ID
 * @param inviterId - 邀請者 ID (應該是主住者)
 */
export async function isCertificateInvitedByUser(
  certificateId: string,
  inviterId: string
): Promise<boolean> {
  try {
    // 取得憑證資訊
    const { data: certificate, error: certError } = await supabase
      .from('digital_certificates')
      .select('shared_card_id, booking_id, guest_type')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate) {
      console.error('Failed to get certificate:', certError);
      return false;
    }

    // 如果是主住者的憑證,不能由其他人撤銷
    if (certificate.guest_type === 'primary') {
      return false;
    }

    // 如果沒有 shared_card_id,表示不是同住者
    if (!certificate.shared_card_id) {
      return false;
    }

    // 檢查 shared_room_card 的 inviter_user_id
    const { data: sharedCard, error: cardError } = await supabase
      .from('shared_room_cards')
      .select('inviter_user_id')
      .eq('id', certificate.shared_card_id)
      .single();

    if (cardError || !sharedCard) {
      console.error('Failed to get shared card:', cardError);
      return false;
    }

    return sharedCard.inviter_user_id === inviterId;
  } catch (error) {
    console.error('Error checking if certificate invited by user:', error);
    return false;
  }
}

/**
 * 檢查用戶是否有權限撤銷憑證
 * @param userId - 用戶 ID
 * @param certificateId - 憑證 ID
 */
export async function canUserRevokeCertificate(
  userId: string,
  certificateId: string
): Promise<{ canRevoke: boolean; reason?: string }> {
  try {
    // 取得憑證資訊
    const { data: certificate, error } = await supabase
      .from('digital_certificates')
      .select('booking_id, user_id, guest_type, status')
      .eq('id', certificateId)
      .single();

    if (error || !certificate) {
      return { canRevoke: false, reason: '憑證不存在' };
    }

    // 檢查憑證狀態
    if (certificate.status === 'revoked') {
      return { canRevoke: false, reason: '憑證已被撤銷' };
    }

    if (certificate.status === 'expired') {
      return { canRevoke: false, reason: '憑證已過期' };
    }

    // 1. 檢查是否為房主
    const isHost = await isUserHost(userId, certificate.booking_id);
    if (isHost) {
      return { canRevoke: true, reason: '房主權限' };
    }

    // 2. 檢查是否為主住者撤銷自己邀請的同住者
    const isPrimaryGuest = await isUserPrimaryGuest(userId, certificate.booking_id);
    if (isPrimaryGuest) {
      const isInvitedByUser = await isCertificateInvitedByUser(certificateId, userId);
      if (isInvitedByUser) {
        return { canRevoke: true, reason: '主住者撤銷同住者' };
      }
      
      // 主住者不能撤銷自己的憑證
      if (certificate.user_id === userId) {
        return { canRevoke: false, reason: '無法撤銷自己的憑證' };
      }
    }

    // 3. 用戶不能撤銷別人的憑證
    return { canRevoke: false, reason: '無權限撤銷此憑證' };
  } catch (error) {
    console.error('Error checking revoke permission:', error);
    return { canRevoke: false, reason: '檢查權限時發生錯誤' };
  }
}
