import { requireAuthWithProfile } from "@/lib/auth"
import { createClient } from "@/utils/supabase/server"
import MembershipCardClient from "./membership-card-client"

export default async function MembershipCardPage() {
  const { user, profile } = await requireAuthWithProfile()
  const supabase = await createClient()

  // 查詢用戶的會員卡
  const { data: membershipCard } = await supabase
    .from('membership_cards')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <MembershipCardClient
      user={{
        id: user.id,
        name: profile.name || '',
        email: profile.email || user.email || '',
        phone: profile.phone || '',
        nationalId: profile.nationalId || '',
      }}
      initialMembershipCard={membershipCard}
    />
  )
}