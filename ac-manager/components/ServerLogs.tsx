"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Terminal } from "lucide-react";

export default function ServerLogs() {
  const t = useTranslations("Dashboard");
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/server/logs");

    eventSource.onmessage = (event) => {
      setLogs((prev) => {
        const newLogs = [...prev, event.data];
        return newLogs.slice(-150);
      });
    };

    eventSource.onerror = () => {
      setLogs((prev) => [...prev, `--- ${t("connectionLost")} ---`]);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [t]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-[400px] w-full rounded-lg border border-zinc-800 bg-black shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-zinc-400">
        <Terminal className="h-4 w-4" />
        <span className="text-xs font-bold tracking-wider uppercase">
          AC Server Console
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-green-400/90 space-y-1">
        {logs.length === 0 ? (
          <p className="text-zinc-600 animate-pulse">{t("waitingLogs")}</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="break-words">
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}