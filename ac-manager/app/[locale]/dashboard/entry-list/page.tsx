"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Save, Loader2, MapPin, Users, Car as CarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AcServerConfig, Track, Car } from "@/types/ac-server";

export default function EntryListPage() {
  const t = useTranslations("EntryList");
  const [config, setConfig] = useState<AcServerConfig | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [maxClients, setMaxClients] = useState(10);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(res => res.json()),
      fetch('/api/content/tracks').then(res => res.json()),
      fetch('/api/content/cars').then(res => res.json())
    ]).then(([configData, tracksData, carsData]) => {
      setTracks(tracksData);
      setCars(carsData);
      
      if (configData.serverCfg) {
        setConfig(configData.serverCfg);
        setMaxClients(parseInt(configData.serverCfg.SERVER.MAX_CLIENTS) || 10);
        
        const currentCars = configData.serverCfg.SERVER.CARS.split(';').filter(Boolean);
        setSelectedCars(currentCars);

        const currentTrackId = configData.serverCfg.SERVER.TRACK;
        const matchedTrack = (tracksData as Track[]).find((t: Track) => t.folderName === currentTrackId);
        if (matchedTrack) setSelectedTrack(matchedTrack);
      }
      setIsLoading(false);
    });
  }, []);

  const toggleCarSelection = (folderName: string) => {
    setSelectedCars(prev => 
      prev.includes(folderName) 
        ? prev.filter(c => c !== folderName) 
        : [...prev, folderName]
    );
  };

  const handleSave = async () => {
    if (!selectedTrack) return toast.error(t("selectTrackError"));
    if (selectedCars.length === 0) return toast.error(t("selectCarError"));
    if (maxClients > selectedTrack.pitboxes) return toast.error(t("maxClientsError", { max: selectedTrack.pitboxes }));

    setIsSaving(true);
    
    const updatedConfig = {
      ...config,
      SERVER: {
        ...config.SERVER,
        TRACK: selectedTrack.folderName,
        CARS: selectedCars.join(';'),
        MAX_CLIENTS: maxClients
      }
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverCfg: updatedConfig }),
      });
      
      if (res.ok) toast.success(t("saveSuccess"));
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("saveGrid")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> {t("circuit")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={selectedTrack?.folderName || ""} 
                onValueChange={(val) => {
                  const t = tracks.find(track => track.folderName === val) || null;
                  setSelectedTrack(t);
                  if (t && maxClients > t.pitboxes) setMaxClients(t.pitboxes);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectTrack")} />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map(track => (
                    <SelectItem key={track.id} value={track.folderName}>
                      {track.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTrack && (
                <div className="mt-4 space-y-3">
                  <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted relative">
                    {selectedTrack.s3ImageUrl ? (
                      <Image 
                        src={selectedTrack.s3ImageUrl} 
                        alt={selectedTrack.name} 
                        fill 
                        className="object-cover" 
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">{t("noImage")}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("maxCapacity")}</span>
                    <Badge variant="secondary">{selectedTrack.pitboxes} Pitboxes</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t("gridSize")}</CardTitle>
              <CardDescription>{t("gridSizeDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input 
                  type="number" 
                  min={1} 
                  max={selectedTrack ? selectedTrack.pitboxes : 100}
                  value={maxClients}
                  onChange={(e) => setMaxClients(parseInt(e.target.value) || 1)}
                />
                {selectedTrack && maxClients > selectedTrack.pitboxes && (
                  <p className="text-xs text-red-500">{t("gridSizeLimitError")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CarIcon className="h-5 w-5" /> {t("carRoster")}</CardTitle>
              <CardDescription>
                {t("carRosterDesc", { max: maxClients })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {cars.map((car) => {
                  const isSelected = selectedCars.includes(car.folderName);
                  return (
                    <div 
                      key={car.id} 
                      onClick={() => toggleCarSelection(car.folderName)}
                      className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                        isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"
                      }`}
                    >
                      <div className="aspect-video w-full bg-muted relative">
                         {car.s3ImageUrl ? (
                          <Image 
                            src={car.s3ImageUrl} 
                            alt={car.name} 
                            fill 
                            className="object-cover" 
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">{t("noImage")}</div>
                        )}
                      </div>
                      <div className="bg-card p-3 flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium leading-none truncate">{car.name}</p>
                          {car.brand && <p className="text-xs text-muted-foreground mt-1">{car.brand}</p>}
                        </div>
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {cars.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  {t("noCars")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}