"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Save, Loader2, FileCode2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Lazy-load Monaco Editor (heavy, client-side only)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-950 rounded-lg border">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  ),
});

const FILES = ["server_cfg.ini", "entry_list.ini", "extra_cfg.yml"] as const;
type ConfigFile = (typeof FILES)[number];

function getLanguage(file: ConfigFile): string {
  if (file.endsWith(".yml") || file.endsWith(".yaml")) return "yaml";
  return "ini";
}

export default function FileEditorComponent() {
  const t = useTranslations("ConfigEditor");

  const [selectedFile, setSelectedFile] = useState<ConfigFile>("server_cfg.ini");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic height: viewport minus status-bar (64px) + page-padding (48px) +
  // page-title (~60px) + toolbar (~48px) + hint (~28px) + gaps (~24px) + footer-padding (24px)
  const EDITOR_HEIGHT = "calc(100vh - 18rem)";

  const loadFile = async (file: ConfigFile) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/config-editor?file=${file}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setContent(data.content ?? "");
    } catch {
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFile(selectedFile);
  }, [selectedFile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/config-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: selectedFile, content }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(t("saveSuccess"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select
            value={selectedFile}
            onValueChange={(v) => setSelectedFile(v as ConfigFile)}
          >
            <SelectTrigger className="w-56">
              <FileCode2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFile(selectedFile)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("reload")}
          </Button>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("save")}
        </Button>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ height: EDITOR_HEIGHT, minHeight: "400px" }}
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center bg-zinc-950"
            style={{ height: EDITOR_HEIGHT, minHeight: "400px" }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language={getLanguage(selectedFile)}
            value={content}
            onChange={(v) => setContent(v ?? "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              padding: { top: 12, bottom: 12 },
            }}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
