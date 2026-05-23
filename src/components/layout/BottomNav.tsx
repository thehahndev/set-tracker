"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dumbbell, History, LayoutTemplate, Home } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/history", label: "History", icon: History },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "stroke-[2.5]")}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
