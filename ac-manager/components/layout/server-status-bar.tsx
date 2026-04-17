"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Play, Square, RotateCw, LogOut, User } from "lucide-react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function ServerStatusBar() {
  const t = useTranslations("Dashboard");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();

  const [status, setStatus] = useState<"running" | "stopped" | "loading">("loading");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/server/status");
      const data = await res.json();
      setStatus(data.Status === "running" ? "running" : "stopped");
    } catch {
      setStatus("stopped");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setUser(d.user))
      .catch(() => { });
  }, []);

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setIsProcessing(true);
    try {
      await fetch("/api/server/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setTimeout(checkStatus, 2000);
    } catch (err) {
      console.error("Error controlling server", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}/login`);
    router.refresh();
  };

  const statusLabel =
    status === "loading"
      ? tCommon("checking")
      : status === "running"
        ? t("serverOnline")
        : t("serverOffline");

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="relative flex h-3 w-3">
          {status === "running" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${status === "running" ? "bg-green-500" : "bg-red-500"
              }`}
          />
        </div>
        <span className="text-sm font-semibold">{statusLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAction("start")}
            disabled={status === "running" || isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-green-600/10 text-green-600 hover:bg-green-600/20 disabled:opacity-50 rounded-md transition-all"
          >
            <Play className="w-4 h-4" />
            {t("start")}
          </button>

          <button
            onClick={() => handleAction("restart")}
            disabled={status === "stopped" || isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 disabled:opacity-50 rounded-md transition-all"
          >
            <RotateCw
              className={`w-4 h-4 ${isProcessing && status === "running" ? "animate-spin" : ""}`}
            />
            {t("restart")}
          </button>

          <button
            onClick={() => handleAction("stop")}
            disabled={status === "stopped" || isProcessing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-red-600/10 text-red-600 hover:bg-red-600/20 disabled:opacity-50 rounded-md transition-all"
          >
            <Square className="w-4 h-4" />
            {t("stop")}
          </button>
        </div>

        <div className="h-6 w-px bg-border" />

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">{user.name}</span>
              <span className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono">
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title={tCommon("logout")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{tCommon("logout")}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}