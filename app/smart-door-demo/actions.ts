"use server"

import { getVerificationData, getVerificationResult } from "@/lib/verifier-api"
import { createAdminClient } from "@/utils/supabase/server"

const expired_time = 930 // QR Code 有效時間（秒）

export async function getDoorQRCode(propertyId: string, room: string) {
  const transactionId = crypto.randomUUID()
  const response = await getVerificationData(transactionId)
  console.log('[Server Action] 獲取開門 QR Code 的 TxID:', transactionId)
  // 建立此次開門的 QR Code 相關資料
  const supabase = await createAdminClient()
  
  const { error } = await supabase
    .from('door_qr_codes')
    .insert({
      transaction_id: transactionId,
      property_id: propertyId,
      room: room,
      status: 'active',
      expires_at: new Date(Date.now() + expired_time * 1000).toISOString(),
    })

  if (error) {
    console.error('Failed to save QR code data:', error)
    throw new Error('Failed to create QR code record')
  }

  // 回傳 QR Code 圖片給 client 端顯示
  return {
    qrcodeImage: response.qrcodeImage,
    transactionId: transactionId
  }
}

export async function checkVerificationResult(transactionId: string) {
  try {
    const result = await getVerificationResult(transactionId)

    if (!result) {
      return false
    }

    // 如果政府 API 驗證失敗
    if (!result.verifyResult) {
      return false
    }

    // 政府 API 驗證成功，進行房卡驗證
    console.log(`[Server Action] 驗證成功！Claims 內容:`)
    result.data.forEach((item, index) => {
      console.log(`[Server Action] Credential ${index + 1} (${item.credentialType}):`)
      item.claims.forEach(claim => {
        console.log(`[Server Action]   ${claim.ename} (${claim.cname}): ${claim.value}`)
      })
    })

    // 從 claims 中提取必要資訊
    const claims = result.data[0]?.claims || []
    const getClaimValue = (ename: string) => claims.find(c => c.ename === ename)?.value

    const bookingShortId = getClaimValue('booking_id') // 這是 bookings.short_id
    const userShortId = getClaimValue('member_serial') // 這是 user_profiles.short_id
    const userName = getClaimValue('name')
    const roomNum = getClaimValue('room_num')
    const checkinTime = getClaimValue('checkin_time')
    const checkoutTime = getClaimValue('checkout_time')
    const issuedDate = getClaimValue('issued_date')
    const nonce = getClaimValue('nonce')

    if (!bookingShortId || !userShortId || !roomNum) {
      console.error('[Server Action] Claims 資料不完整')
      return false
    }

    const supabase = await createAdminClient()

    // 並行查詢所有必要的資料
    const [qrResult, bookingResult, userResult] = await Promise.all([
      // 1. 從 QR Code 記錄取得預期的 property_id 和 room
      supabase
        .from('door_qr_codes')
        .select('property_id, room')
        .eq('transaction_id', transactionId)
        .single(),
      // 2. 從 booking 記錄取得預期的 property_id 和 room_number，以及時間資訊
      supabase
        .from('bookings')
        .select('id, property_id, room_number, guest_id, check_in_date, check_out_date')
        .eq('short_id', bookingShortId)
        .single(),
      // 3. 從 user 記錄取得用戶資訊
      supabase
        .from('user_profiles')
        .select('id')
        .eq('short_id', userShortId)
        .single()
    ])

    // 檢查查詢結果
    if (qrResult.error || !qrResult.data) {
      console.error('[Server Action] 找不到 QR Code 記錄:', qrResult.error)
      return false
    }

    if (bookingResult.error || !bookingResult.data) {
      console.error('[Server Action] 找不到對應的 booking 記錄:', bookingResult.error)
      return false
    }

    if (userResult.error || !userResult.data) {
      console.error('[Server Action] 找不到對應的 user 記錄:', userResult.error)
      return false
    }

    const qrRecord = qrResult.data
    const bookingData = bookingResult.data
    const userData = userResult.data

    // 4. 驗證房卡有效性
    const now = new Date()
    const checkInDate = new Date(bookingData.check_in_date)
    const checkOutDate = new Date(bookingData.check_out_date)
    
    const isValidCard = 
      qrRecord.property_id === bookingData.property_id && // 房源必須一致
      qrRecord.room === bookingData.room_number && // 房間號碼必須與 Booking 的房間一致
      now >= checkInDate && now <= checkOutDate && // 必須在入住期間內
      bookingData.guest_id === userData.id // 會員必須是預訂的房客

    if (!isValidCard) {
      console.error(`[Server Action] 房卡驗證失敗 - 房源: ${qrRecord.property_id === bookingData.property_id}, 房間: ${qrRecord.room === bookingData.room_number}, 時間範圍: ${now >= checkInDate && now <= checkOutDate}, 會員: ${bookingData.guest_id === userData.id}`)
      
      // 記錄失敗的訪問嘗試
      await supabase
        .from('door_access_logs')
        .insert({
          booking_id: bookingData.id,
          user_id: userData.id,
          access_method: 'qr-code',
          status: 'denied',
          transaction_id: transactionId,
        })

      return false // 房卡無效，拒絕開門
    }

    // 4. 驗證通過，記錄成功訪問
    // 記錄訪問日誌
    const { error: logError } = await supabase
      .from('door_access_logs')
      .insert({
        booking_id: bookingData.id,
        user_id: userData.id,
        access_method: 'qr-code',
        status: 'success',
        transaction_id: transactionId,
      })

    if (logError) {
      console.error('[Server Action] 記錄訪問日誌失敗:', logError)
    } else {
      console.log(`[Server Action] 訪問日誌已記錄`)
    }

    // 更新 QR Code 狀態為已使用
    const { error: updateError } = await supabase
      .from('door_qr_codes')
      .update({
        status: 'used',
        used_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId)

    if (updateError) {
      console.error('[Server Action] 更新 QR Code 狀態失敗:', updateError)
    } else {
      console.log(`[Server Action] QR Code 狀態已更新為 used`)
    }

    // 所有驗證都通過
    return true

  } catch (error) {
    // 減少錯誤日誌輸出，避免過多重複錯誤訊息
    console.log(`[Server Action] 驗證檢查 API 調用失敗，稍後重試`)
    return false // 發生錯誤時回傳 false
  }
}

