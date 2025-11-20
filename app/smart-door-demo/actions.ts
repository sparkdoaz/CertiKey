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
  
  // const { error } = await supabase
  //   .from('door_qr_codes')
  //   .insert({
  //     transaction_id: transactionId,
  //     property_id: propertyId,
  //     room: room,
  //     status: 'active',
  //     expires_at: new Date(Date.now() + expired_time * 1000).toISOString(), // 設定過期時間
  //   })

  // if (error) {
  //   console.error('Failed to save QR code data:', error)
  //   throw new Error('Failed to create QR code record')
  // }

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

    // 如果驗證成功，印出 claims 內容並更新 DB
    if (result.verifyResult) {
      console.log(`[Server Action] 驗證成功！Claims 內容:`)
      result.data.forEach((item, index) => {
        console.log(`[Server Action] Credential ${index + 1} (${item.credentialType}):`)
        item.claims.forEach(claim => {
          console.log(`[Server Action]   ${claim.ename} (${claim.cname}): ${claim.value}`)
        })
      })

      // // 更新 DB 狀態為已驗證
      // const supabase = await createAdminClient()
      // const { error } = await supabase
      //   .from('door_qr_codes')
      //   .update({
      //     status: 'verified',
      //     verified_at: new Date().toISOString()
      //   })
      //   .eq('transaction_id', transactionId)

      // if (error) {
      //   console.error('[Server Action] 更新 DB 狀態失敗:', error)
      // } else {
      //   console.log(`[Server Action] DB 狀態已更新為 verified`)
      // }
    }

    return result.verifyResult
  } catch (error) {
    // 減少錯誤日誌輸出，避免過多重複錯誤訊息
    console.log(`[Server Action] 驗證檢查 API 調用失敗，稍後重試`)
    return false // 發生錯誤時回傳 false
  }
}

