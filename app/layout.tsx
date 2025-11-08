import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { Navbar } from "@/components/navbar"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CertiKey - 房屋租賃平台",
  description: "尋找您的理想住宿",
  generator: "v0.app",
  icons: {
    icon: "/certikey-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
