import { requireHost } from "@/lib/auth"
import NewPropertyForm from "./new-property-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewPropertyPage() {
  const { user } = await requireHost()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-secondary/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/host/dashboard">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回管理面板
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">新增房源</CardTitle>
            <p className="text-sm text-muted-foreground">填寫房源資訊以開始出租</p>
          </CardHeader>
          <CardContent>
            <NewPropertyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
