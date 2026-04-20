"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CloudRain, Sun, Moon, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcCspConfig } from "@/types/ac-server";

export default function CSPPage() {
  const [config, setConfig] = useState<AcCspConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/csp')
      .then((res) => res.json())
      .then((data) => {
        if (data.cspCfg) setConfig(data.cspCfg);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const error = err as Error;
        console.error("[api/csp] Erro ao carregar CSP:", error.message || error);
        setIsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/csp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cspCfg: config }),
      });

      if (res.ok) {
        alert("Configurações do CSP guardadas! Reinicie o servidor para aplicar a chuva/clima.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[api/csp] Erro ao guardar CSP:", error.message || error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSectionValue = <T extends keyof AcCspConfig, K extends keyof AcCspConfig[T]>(
    section: T,
    key: K,
    value: AcCspConfig[T][K]
  ) => {
    setConfig((prev: AcCspConfig | null) => {
      if (!prev) return null;
      return {
        ...prev,
        [section]: { ...prev[section], [key]: value }
      };
    });
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!config) return <p>Erro ao ler configurações do CSP.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Custom Shaders Patch (CSP)</h2>
          <p className="text-muted-foreground">Controle o clima dinâmico, chuva e regras avançadas do servidor.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar CSP
        </Button>
      </div>

      <Tabs defaultValue="weather" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="weather" className="gap-2"><CloudRain className="w-4 h-4" /> Clima e Chuva</TabsTrigger>
          <TabsTrigger value="time" className="gap-2"><Sun className="w-4 h-4" /> Passagem de Tempo</TabsTrigger>
          <TabsTrigger value="rules" className="gap-2"><Settings2 className="w-4 h-4" /> Regras de Pista</TabsTrigger>
        </TabsList>

        <TabsContent value="weather">
          <Card>
            <CardHeader>
              <CardTitle>RainFX e WeatherFX</CardTitle>
              <CardDescription>Para a chuva funcionar, os jogadores precisam de ter a versão paga do CSP (Patreon).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Ativar Chuva no Servidor</Label>
                  <p className="text-sm text-muted-foreground">Permite que o servidor controle o nível de água na pista.</p>
                </div>
                <Switch
                  checked={config.RAIN?.ENABLE === true}
                  onCheckedChange={(checked) => updateSectionValue('RAIN', 'ENABLE', checked)}
                />
              </div>

              {config.RAIN?.ENABLE && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-4">
                    <Label className="flex justify-between">
                      <span>Intensidade da Chuva</span>
                      <span className="text-muted-foreground">{Math.round((config.RAIN?.INTENSITY || 0) * 100)}%</span>
                    </Label>
                    <Slider
                      value={[config.RAIN?.INTENSITY || 0]}
                      max={1}
                      step={0.05}
                      onValueChange={(val) => updateSectionValue('RAIN', 'INTENSITY', val[0])}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="flex justify-between">
                      <span>Nível de Água na Pista (Poças)</span>
                      <span className="text-muted-foreground">{Math.round((config.RAIN?.WETNESS || 0) * 100)}%</span>
                    </Label>
                    <Slider
                      value={[config.RAIN?.WETNESS || 0]}
                      max={1}
                      step={0.05}
                      onValueChange={(val) => updateSectionValue('RAIN', 'WETNESS', val[0])}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4">
                <Label>Script de Clima</Label>
                <Select
                  value={config.WEATHER?.SCRIPT || 'sol'}
                  onValueChange={(val) => updateSectionValue('WEATHER', 'SCRIPT', val)}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecione o script" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sol">Sol (Recomendado)</SelectItem>
                    <SelectItem value="pure">Pure</SelectItem>
                    <SelectItem value="default">Padrão Kunos (Sem Clima Dinâmico)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">O Sol é o mais utilizado e compatível com a maioria dos jogadores.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle>Multiplicador de Tempo</CardTitle>
              <CardDescription>Faça corridas de 24 horas passarem em apenas alguns minutos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="flex justify-between text-base">
                  <span>Velocidade da passagem do tempo</span>
                  <span className="font-bold text-primary">{config.TIME?.MULTIPLIER || 1}x</span>
                </Label>
                <Slider
                  value={[config.TIME?.MULTIPLIER || 1]}
                  min={1}
                  max={60}
                  step={1}
                  onValueChange={(val) => updateSectionValue('TIME', 'MULTIPLIER', val[0])}
                  className="py-4"
                />
                <p className="text-sm text-muted-foreground">
                  Se definir para 60x, 1 minuto no mundo real equivale a 1 hora no jogo. Excelente para simular o ciclo de dia e noite em corridas curtas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Comportamento nas Boxes</CardTitle>
              <CardDescription>Regras adicionais injetadas diretamente pelo Custom Shaders Patch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Teleportar para as Boxes se for em contramão</Label>
                  <p className="text-sm text-muted-foreground">Evita jogadores intencionalmente a arruinar corridas (Trolls).</p>
                </div>
                <Switch
                  checked={config.PITS?.TELEPORT_TO_PITS_ON_WRONG_WAY === true}
                  onCheckedChange={(checked) => updateSectionValue('PITS', 'TELEPORT_TO_PITS_ON_WRONG_WAY', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Permitir conduzir na contramão nas boxes</Label>
                  <p className="text-sm text-muted-foreground">Útil em pistas de Track Day onde os jogadores gostam de manobrar nas boxes.</p>
                </div>
                <Switch
                  checked={config.PITS?.ALLOW_TO_DRIVE_BACK === true}
                  onCheckedChange={(checked) => updateSectionValue('PITS', 'ALLOW_TO_DRIVE_BACK', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}