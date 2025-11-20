"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Shield, User, Users, XCircle, CheckCircle, Clock, Ban } from "lucide-react"
import type { DigitalCertificate } from "@/types/digital-certificate-record"

interface CertificateWithUser extends DigitalCertificate {
  user?: {
    id: string
    name: string
    email: string
  }
  shared_card?: {
    id: string
    status: string
    inviter_id: string
    invitee_id: string
  }
}

interface CertificatesListProps {
  bookingId: string
  userId: string
}

export function CertificatesList({ bookingId, userId }: CertificatesListProps) {
  const [certificates, setCertificates] = useState<CertificateWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'host' | 'primary_guest' | 'co_guest'>('co_guest')
  const [permissions, setPermissions] = useState({
    canRevokeAll: false,
    canRevokeCo: false,
    canRevokeOwn: false,
  })
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchCertificates()
    }
  }, [bookingId, userId])

  const fetchCertificates = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const supabase = createClient()

      // 獲取 access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setLoading(false)
        return
      }

      const response = await fetch(`/api/digital-certificate/booking/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCertificates(data.certificates || [])
        setUserRole(data.userRole)
        setPermissions(data.permissions)
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (certificateId: string) => {
    if (!userId) return

    try {
      setRevoking(certificateId)
      const supabase = createClient()

      // 獲取 access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setRevoking(null)
        return
      }

      const response = await fetch(`/api/digital-certificate/revoke/${certificateId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        // 重新載入憑證列表
        await fetchCertificates()
      } else {
        const error = await response.json()
        alert(`撤銷失敗: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to revoke certificate:', error)
      alert('撤銷憑證時發生錯誤')
    } finally {
      setRevoking(null)
    }
  }

  const canRevokeCertificate = (cert: CertificateWithUser): boolean => {
    // 房主可以撤銷所有憑證
    if (permissions.canRevokeAll) return true

    // 主住者可以撤銷同住者的憑證(但不能撤銷自己的)
    // 注意: guest_type 的值是 'co-guest' 不是 'co_guest'
    if (permissions.canRevokeCo && cert.guest_type === 'co-guest') {
      return true
    }

    return false
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            待掃描
          </Badge>
        )
      case 'claimed':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            已領取
          </Badge>
        )
      case 'revoked':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            已撤銷
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="secondary" className="gap-1">
            <Ban className="h-3 w-3" />
            已過期
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getGuestTypeBadge = (guestType: string) => {
    if (guestType === 'primary') {
      return (
        <Badge variant="default" className="gap-1">
          <User className="h-3 w-3" />
          主住者
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Users className="h-3 w-3" />
        同住者
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">載入中...</p>
      </Card>
    )
  }

  if (certificates.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">尚無數位憑證</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 用戶角色說明 */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">
              {userRole === 'host' && '您是房主,可以撤銷所有憑證'}
              {userRole === 'primary_guest' && '您是主住者,可以撤銷同住者的憑證'}
              {userRole === 'co_guest' && '您是同住者,僅能查看憑證'}
            </p>
          </div>
        </div>
      </Card>

      {/* 憑證列表 */}
      {certificates.map((cert) => (
        <Card key={cert.id} className="p-4">
          <div className="space-y-3">
            {/* 頭部: 用戶資訊和狀態 */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getGuestTypeBadge(cert.guest_type)}
                  {getStatusBadge(cert.status)}
                </div>
                {cert.user && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">{cert.user.name}</p>
                    <p>{cert.user.email}</p>
                  </div>
                )}
              </div>

              {/* 撤銷按鈕 */}
              {canRevokeCertificate(cert) && cert.status !== 'revoked' && cert.status !== 'expired' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={revoking === cert.id}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      {revoking === cert.id ? '撤銷中...' : '撤銷'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>確認撤銷憑證?</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作將撤銷 {cert.user?.name || '該用戶'} 的數位房卡。
                        撤銷後,該用戶將無法使用此憑證開門。
                        <br />
                        <br />
                        此操作無法復原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevoke(cert.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        確認撤銷
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* 詳細資訊 */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>建立時間: {new Date(cert.created_at).toLocaleString('zh-TW')}</p>
              {cert.claimed_at && (
                <p>領取時間: {new Date(cert.claimed_at).toLocaleString('zh-TW')}</p>
              )}
              {cert.revoked_at && (
                <p>撤銷時間: {new Date(cert.revoked_at).toLocaleString('zh-TW')}</p>
              )}
              {cert.expires_at && (
                <p>到期時間: {new Date(cert.expires_at).toLocaleString('zh-TW')}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
