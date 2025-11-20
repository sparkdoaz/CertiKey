"use server"

import { getVerificationData } from "@/lib/verifier-api"

export async function getDoorQRCode() {
  const transactionId = crypto.randomUUID()
  const response = await getVerificationData(transactionId)
  return response.qrcodeImage
}