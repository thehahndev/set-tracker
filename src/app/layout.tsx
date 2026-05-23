import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Set Tracker",
  description: "Simple workout tracking for the gym",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
