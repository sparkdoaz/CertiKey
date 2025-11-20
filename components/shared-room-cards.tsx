"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { UserPlus, Mail, Check, X, Clock, Trash2, RefreshCw, Shield, CheckCircle, XCircle, Ban, User, Users } from "lucide-react"
import type { SharedRoomCard, RoomCardInvitation } from "@/types/booking"
import type { DigitalCertificate } from "@/types/digital-certificate-record"
import QRCode from "qrcode"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/client"

interface GuestWithCertificates {
  userId: string | null
  userName: string
  userEmail: string
  guestType: 'primary' | 'co-guest'
  sharedCardId?: string
  sharedCardStatus?: string
  certificates: DigitalCertificate[]
}

interface SharedRoomCardsProps {
  bookingId: string
  propertyName: string
  checkIn: Date
  checkOut: Date
  userId: string
  userEmail: string
}

export function SharedRoomCards({ bookingId, propertyName, checkIn, checkOut, userId, userEmail }: SharedRoomCardsProps) {
  const [guests, setGuests] = useState<GuestWithCertificates[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [guestEmail, setGuestEmail] = useState("")
  const [guestName, setGuestName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resendingCardId, setResendingCardId] = useState<string | null>(null)
  const [revokingCertId, setRevokingCertId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSharedCards()
  }, [bookingId])

  const loadSharedCards = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const supabase = createClient()

      // 1. 查詢訂單資訊(取得主住者)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          guest_id,
          user_profiles!bookings_guest_id_fkey(name, email)
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError) {
        console.error('Failed to load booking:', bookingError)
        return
      }

      // 2. 查詢所有數位憑證(包含主住者和同住者)
      const { data: certificates, error: certsError } = await supabase
        .from('digital_certificates')
        .select(`
          *,
          user_profiles!digital_certificates_user_id_fkey(name, email),
          shared_room_cards(id, status)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (certsError) {
        console.error('Failed to load certificates:', certsError)
        return
      }

      // 3. 按用戶分組憑證
      const guestsMap = new Map<string, GuestWithCertificates>()

      // 主住者
      const primaryGuestKey = booking.guest_id
      const primaryProfile = booking.user_profiles as unknown as { name: string; email: string }

      guestsMap.set(primaryGuestKey, {
        userId: booking.guest_id,
        userName: primaryProfile?.name || 'Unknown',
        userEmail: primaryProfile?.email || '',
        guestType: 'primary',
        certificates: []
      })

      // 處理所有憑證
      certificates?.forEach((cert: any) => {
        const certUserId = cert.user_id
        const certProfile = cert.user_profiles as { name: string; email: string }
        const sharedCard = Array.isArray(cert.shared_room_cards) && cert.shared_room_cards.length > 0
          ? cert.shared_room_cards[0]
          : null

        if (!guestsMap.has(certUserId)) {
          // 同住者
          guestsMap.set(certUserId, {
            userId: certUserId,
            userName: certProfile?.name || 'Unknown',
            userEmail: certProfile?.email || '',
            guestType: 'co-guest',
            sharedCardId: cert.shared_card_id,
            sharedCardStatus: sharedCard?.status,
            certificates: []
          })
        }

        // 加入憑證
        const guest = guestsMap.get(certUserId)!
        guest.certificates.push(cert)
      })

      // 4. 查詢尚未領取憑證的邀請
      const { data: pendingInvites } = await supabase
        .from('shared_room_cards')
        .select(`
          id,
          invitee_id,
          invitee_email,
          invitee_name,
          status,
          user_profiles!shared_room_cards_invitee_id_fkey(name, email)
        `)
        .eq('booking_id', bookingId)
        .eq('status', 'pending')

      pendingInvites?.forEach((invite: any) => {
        const inviteeId = invite.invitee_id || `pending_${invite.invitee_email}`
        const inviteeProfile = invite.user_profiles as { name: string; email: string }

        if (!guestsMap.has(inviteeId)) {
          guestsMap.set(inviteeId, {
            userId: invite.invitee_id,
            userName: inviteeProfile?.name || invite.invitee_name || invite.invitee_email,
            userEmail: inviteeProfile?.email || invite.invitee_email,
            guestType: 'co-guest',
            sharedCardId: invite.id,
            sharedCardStatus: 'pending',
            certificates: []
          })
        }
      })

      setGuests(Array.from(guestsMap.values()))
    } catch (error) {
      console.error('Error loading shared cards:', error)
      toast({
        title: "載入失敗",
        description: "無法載入房卡資料",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!guestEmail || !userId) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const invitationToken = crypto.randomUUID()
      const invitationLink = `${window.location.origin}/invitations/accept/${invitationToken}`

      // 插入共享房卡記錄
      const { data: sharedCard, error: cardError } = await supabase
        .from('shared_room_cards')
        .insert({
          booking_id: bookingId,
          inviter_id: userId,
          invitee_email: guestEmail,
          invitee_name: guestName || null,
          status: 'pending',
          invitation_token: invitationToken,
        })
        .select()
        .single()

      if (cardError) {
        console.error('Failed to create shared card:', cardError)
        toast({
          title: "邀請失敗",
          description: cardError.message || "無法建立邀請",
          variant: "destructive",
        })
        return
      }

      // 插入邀請記錄
      const { error: inviteError } = await supabase
        .from('room_card_invitations')
        .insert({
          shared_card_id: sharedCard.id,
          booking_id: bookingId,
          property_name: propertyName,
          inviter_email: userEmail,
          inviter_name: guestName || null,
          invitee_email: guestEmail,
          invitee_name: guestName || null,
          check_in_date: checkIn,
          check_out_date: checkOut,
          invitation_link: invitationLink,
          status: 'pending',
        })

      if (inviteError) {
        console.error('Failed to create invitation:', inviteError)
      }

      // 重新載入列表
      await loadSharedCards()

      setGuestEmail("")
      setGuestName("")
      setIsDialogOpen(false)

      toast({
        title: "邀請已發送",
        description: `已發送邀請郵件至 ${guestEmail}`,
      })
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast({
        title: "邀請失敗",
        description: "發送邀請時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevokeCertificate = async (certificateId: string, nonce: string | null) => {
    if (!userId) return

    // 如果沒有 nonce,無法撤銷(舊資料或資料不完整)
    if (!nonce) {
      toast({
        title: "無法撤銷",
        description: "此憑證缺少識別資訊,無法撤銷",
        variant: "destructive",
      })
      return
    }

    try {
      setRevokingCertId(certificateId)
      const supabase = createClient()

      // 獲取 access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: "未授權",
          description: "請重新登入",
          variant: "destructive",
        })
        return
      }

      // 呼叫新的撤銷 API (使用 nonce)
      const response = await fetch('/api/digital-certificate/revoke-by-nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookingId,
          nonce,
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // 重新載入房卡列表
        await loadSharedCards()

        toast({
          title: "已撤銷憑證",
          description: result.warning || "已成功撤銷該房卡",
        })
      } else {
        const error = await response.json()
        toast({
          title: "撤銷失敗",
          description: error.error || "無法撤銷憑證",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Failed to revoke certificate:', error)
      toast({
        title: "撤銷失敗",
        description: "撤銷憑證時發生錯誤",
        variant: "destructive",
      })
    } finally {
      setRevokingCertId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            待接受
          </Badge>
        )
      case "accepted":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <Check className="h-3 w-3" />
            已接受
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            已拒絕
          </Badge>
        )
      default:
        return null
    }
  }

  const getCertificateStatusBadge = (status: string | undefined) => {
    if (!status) return null

    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            待掃描
          </Badge>
        )
      case "claimed":
        return (
          <Badge variant="default" className="gap-1 bg-blue-500">
            <CheckCircle className="h-3 w-3" />
            已領取
          </Badge>
        )
      case "revoked":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            已撤銷
          </Badge>
        )
      case "expired":
        return (
          <Badge variant="secondary" className="gap-1">
            <Ban className="h-3 w-3" />
            已過期
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>共享房卡管理</CardTitle>
            <CardDescription>邀請同住者並管理他們的房卡權限和憑證狀態</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                邀請同住者
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>邀請同住者</DialogTitle>
                <DialogDescription>輸入同住者的電子郵件地址，系統將發送邀請連結</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="guest-email">電子郵件 *</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="example@email.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-name">姓名（選填）</Label>
                  <Input
                    id="guest-name"
                    placeholder="張三"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleInvite} disabled={!guestEmail || isSubmitting}>
                  {isSubmitting ? "發送中..." : "發送邀請"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">載入中...</p>
          </div>
        ) : guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mb-2 font-medium">尚未邀請同住者</p>
            <p className="text-sm text-muted-foreground">點擊上方按鈕邀請同住者獲得房卡權限</p>
          </div>
        ) : (
          <div className="space-y-6">
            {guests.map((guest) => (
              <div key={guest.userId || guest.userEmail} className="space-y-3">
                {/* 人員標題 */}
                <div className="flex items-center gap-3 pb-2 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {guest.guestType === 'primary' ? (
                      <User className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{guest.userName}</h3>
                      {guest.guestType === 'primary' ? (
                        <Badge variant="default">主住者</Badge>
                      ) : (
                        <Badge variant="secondary">同住者</Badge>
                      )}
                      {guest.sharedCardStatus === 'pending' && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          待接受邀請
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{guest.userEmail}</p>
                  </div>
                </div>

                {/* 房卡列表 */}
                {guest.certificates.length === 0 ? (
                  <div className="ml-13 text-sm text-muted-foreground py-2">
                    尚未領取房卡
                  </div>
                ) : (
                  <div className="ml-13 space-y-2">
                    {guest.certificates.map((cert, index) => (
                      <div key={cert.id} className="rounded-lg border p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              房卡 #{index + 1}
                            </span>
                            {getCertificateStatusBadge(cert.status)}
                          </div>

                          {/* 撤銷按鈕 - 只顯示在可撤銷的憑證上 */}
                          {cert.status !== 'revoked' && cert.status !== 'expired' && guest.guestType !== 'primary' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={revokingCertId === cert.id}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {revokingCertId === cert.id ? "撤銷中..." : "撤銷"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>撤銷房卡</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    確定要撤銷 {guest.userName} 的房卡 #{index + 1} 嗎？
                                    撤銷後對方將無法使用此憑證開門。此操作無法復原。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRevokeCertificate(cert.id, cert.nonce)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    確認撤銷
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>

                        {/* 憑證詳細資訊 */}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>建立: {new Date(cert.created_at).toLocaleString('zh-TW')}</p>
                          {cert.claimed_at && (
                            <p>領取: {new Date(cert.claimed_at).toLocaleString('zh-TW')}</p>
                          )}
                          {cert.revoked_at && (
                            <p>撤銷: {new Date(cert.revoked_at).toLocaleString('zh-TW')}</p>
                          )}
                          {cert.expires_at && (
                            <p>到期: {new Date(cert.expires_at).toLocaleString('zh-TW')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
