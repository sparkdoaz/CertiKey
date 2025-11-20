import { requireAuthWithProfile } from "@/lib/auth"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const { profile } = await requireAuthWithProfile()

  return (
    <ProfileForm
      initialData={{
        name: profile.name,
        email: profile.email,
        phone: profile.phone || "",
        nationalId: profile.nationalId || "",
        nationalIdVerified: profile.nationalIdVerified || false,
      }}
    />
  )
}
