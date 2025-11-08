import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Home, Shield, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-8 flex justify-center">
            <Image
              src="/certikey-logo.png"
              alt="CertiKey"
              width={120}
              height={120}
              className="h-24 w-24 sm:h-30 sm:w-30"
            />
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">尋找您的理想住宿</h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            探索全球各地的獨特房源，享受賓至如歸的住宿體驗
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/properties">
              <Button size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                開始探索
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                成為房東
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-balance text-center text-3xl font-bold">為什麼選擇 CertiKey</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">輕鬆搜尋</h3>
                <p className="text-pretty leading-relaxed text-muted-foreground">
                  快速找到符合您需求的完美住宿，簡單又方便
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold">安全保障</h3>
                <p className="text-pretty leading-relaxed text-muted-foreground">
                  完善的支付系統和數位房卡，確保您的住宿安全
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">優質體驗</h3>
                <p className="text-pretty leading-relaxed text-muted-foreground">
                  精選房源和貼心服務，讓每次旅程都充滿驚喜
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Home className="mx-auto h-12 w-12" />
          <h2 className="mt-6 text-balance text-3xl font-bold">準備好開始您的旅程了嗎？</h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-relaxed text-primary-foreground/90">
            立即註冊，探索數千個精選房源，或成為房東分享您的空間
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="secondary">
                立即註冊
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
