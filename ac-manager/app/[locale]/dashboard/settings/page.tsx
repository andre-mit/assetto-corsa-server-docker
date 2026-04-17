"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tCommon = useTranslations("Common");

  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.serverCfg) setConfig(data.serverCfg);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error(t("loadError"));
        setIsLoading(false);
      });
  }, [t]);

  const updateServerValue = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      SERVER: { ...prev.SERVER, [key]: value },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverCfg: config }),
      });
      if (res.ok) {
        toast.success(t("saveSuccess"));
      } else {
        toast.error(tCommon("error"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) return <p>{t("loadError")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("saveChanges")}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-150">
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="network">{t("tabs.network")}</TabsTrigger>
          <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("tabs.sessions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t("general.title")}</CardTitle>
              <CardDescription>{t("general.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>{t("general.serverName")}</Label>
                  <Input
                    value={config.SERVER?.NAME || ""}
                    onChange={(e) => updateServerValue("NAME", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("general.password")}</Label>
                  <Input
                    type="password"
                    value={config.SERVER?.PASSWORD || ""}
                    onChange={(e) => updateServerValue("PASSWORD", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("general.adminPassword")}</Label>
                  <Input
                    type="password"
                    value={config.SERVER?.ADMIN_PASSWORD || ""}
                    onChange={(e) =>
                      updateServerValue("ADMIN_PASSWORD", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("general.maxPlayers")}</Label>
                  <Input
                    type="number"
                    value={config.SERVER?.MAX_CLIENTS || 10}
                    onChange={(e) =>
                      updateServerValue("MAX_CLIENTS", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>{t("network.title")}</CardTitle>
              <CardDescription>{t("network.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("network.udpPort")}</Label>
                  <Input
                    type="number"
                    value={config.SERVER?.UDP_PORT || 9600}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("network.tcpPort")}</Label>
                  <Input
                    type="number"
                    value={config.SERVER?.TCP_PORT || 9600}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("network.httpPort")}</Label>
                  <Input
                    type="number"
                    value={config.SERVER?.HTTP_PORT || 8081}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>{t("rules.title")}</CardTitle>
              <CardDescription>{t("rules.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t("rules.abs")}</Label>
                  <p className="text-sm text-muted-foreground">{t("rules.absDesc")}</p>
                </div>
                <Switch
                  checked={config.SERVER?.ABS_ALLOWED == 1}
                  onCheckedChange={(checked) =>
                    updateServerValue("ABS_ALLOWED", checked ? 1 : 0)
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t("rules.tc")}</Label>
                  <p className="text-sm text-muted-foreground">{t("rules.tcDesc")}</p>
                </div>
                <Switch
                  checked={config.SERVER?.TC_ALLOWED == 1}
                  onCheckedChange={(checked) =>
                    updateServerValue("TC_ALLOWED", checked ? 1 : 0)
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t("rules.tyreBlankets")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("rules.tyreBranketsDesc")}
                  </p>
                </div>
                <Switch
                  checked={config.SERVER?.TYRE_BLANKETS_ALLOWED == 1}
                  onCheckedChange={(checked) =>
                    updateServerValue("TYRE_BLANKETS_ALLOWED", checked ? 1 : 0)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>{t("sessions.title")}</CardTitle>
              <CardDescription>{t("sessions.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4 border p-4 rounded-lg">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    {t("sessions.practice")}
                    <Switch
                      checked={config.PRACTICE?.IS_OPEN == 1}
                      onCheckedChange={(checked) =>
                        setConfig((p: any) => ({
                          ...p,
                          PRACTICE: { ...p.PRACTICE, IS_OPEN: checked ? 1 : 0 },
                        }))
                      }
                    />
                  </h3>
                  <div className="space-y-2">
                    <Label>{t("sessions.timeMinutes")}</Label>
                    <Input
                      type="number"
                      value={config.PRACTICE?.TIME || 0}
                      onChange={(e) =>
                        setConfig((p: any) => ({
                          ...p,
                          PRACTICE: { ...p.PRACTICE, TIME: parseInt(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    {t("sessions.qualifying")}
                    <Switch
                      checked={config.QUALIFY?.IS_OPEN == 1}
                      onCheckedChange={(checked) =>
                        setConfig((p: any) => ({
                          ...p,
                          QUALIFY: { ...p.QUALIFY, IS_OPEN: checked ? 1 : 0 },
                        }))
                      }
                    />
                  </h3>
                  <div className="space-y-2">
                    <Label>{t("sessions.timeMinutes")}</Label>
                    <Input
                      type="number"
                      value={config.QUALIFY?.TIME || 0}
                      onChange={(e) =>
                        setConfig((p: any) => ({
                          ...p,
                          QUALIFY: { ...p.QUALIFY, TIME: parseInt(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg border-primary">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    {t("sessions.race")}
                    <Switch
                      checked={config.RACE?.IS_OPEN == 1}
                      onCheckedChange={(checked) =>
                        setConfig((p: any) => ({
                          ...p,
                          RACE: { ...p.RACE, IS_OPEN: checked ? 1 : 0 },
                        }))
                      }
                    />
                  </h3>
                  <div className="space-y-2">
                    <Label>{t("sessions.totalLaps")}</Label>
                    <Input
                      type="number"
                      value={config.RACE?.LAPS || 0}
                      onChange={(e) =>
                        setConfig((p: any) => ({
                          ...p,
                          RACE: { ...p.RACE, LAPS: parseInt(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("sessions.waitTime")}</Label>
                    <Input
                      type="number"
                      value={config.RACE?.WAIT_TIME || 60}
                      onChange={(e) =>
                        setConfig((p: any) => ({
                          ...p,
                          RACE: { ...p.RACE, WAIT_TIME: parseInt(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
