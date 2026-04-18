"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Home,
  Settings,
  Users,
  Package,
  CloudSun,
  FileCode2,
  ShieldCheck,
} from "lucide-react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const ROLE_COLORS: Record<string, string> = {
  MASTER: "text-yellow-500",
  ADMIN: "text-blue-500",
  VIEWER: "text-zinc-500",
};

export function Sidebar() {
  const t = useTranslations("Navigation");
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { key: "dashboard", href: `/${locale}/dashboard`, icon: Home },
    { key: "settings", href: `/${locale}/dashboard/settings`, icon: Settings },
    { key: "entryList", href: `/${locale}/dashboard/entry-list`, icon: Users },
    { key: "content", href: `/${locale}/dashboard/content`, icon: Package },
    { key: "csp", href: `/${locale}/dashboard/csp`, icon: CloudSun },
    { key: "configEditor", href: `/${locale}/dashboard/config-editor`, icon: FileCode2 },
    { key: "users", href: `/${locale}/dashboard/users`, icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 border-r bg-background/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="font-bold text-lg tracking-tight">AC Server Manager</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t bg-accent/5">
          <div className="flex flex-col px-2">
            <span className="text-sm font-semibold truncate">{user.name}</span>
            <span className={cn("text-[10px] font-bold tracking-widest uppercase", ROLE_COLORS[user.role.toUpperCase()] || "text-muted-foreground")}>
              {user.role}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 border-t flex items-center justify-center gap-3">
        <LanguageSwitcher />
        <div className="h-5 w-px bg-border" />
        <ThemeSwitcher />
      </div>
    </aside>
  );
}
