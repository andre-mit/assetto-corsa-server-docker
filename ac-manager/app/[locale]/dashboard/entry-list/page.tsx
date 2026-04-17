"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, MapPin, Users, Car as CarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function EntryListPage() {
  const [config, setConfig] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
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
        const matchedTrack = tracksData.find((t: any) => t.folderName === currentTrackId);
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
    if (!selectedTrack) return alert("Selecione uma pista!");
    if (selectedCars.length === 0) return alert("Selecione pelo menos um carro!");
    if (maxClients > selectedTrack.pitboxes) return alert(`A pista suporta no máximo ${selectedTrack.pitboxes} vagas.`);

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
      
      if (res.ok) alert("Grid atualizado! Os pitboxes foram gerados e distribuídos com sucesso.");
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
          <h2 className="text-2xl font-bold tracking-tight">Setup do Grid</h2>
          <p className="text-muted-foreground">Escolha o local e as máquinas para a próxima sessão.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Grid
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Circuito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={selectedTrack?.folderName || ""} 
                onValueChange={(val) => {
                  const t = tracks.find(track => track.folderName === val);
                  setSelectedTrack(t);
                  if (t && maxClients > t.pitboxes) setMaxClients(t.pitboxes);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a pista" />
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
                  <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted">
                    {selectedTrack.s3ImageUrl ? (
                      <img src={selectedTrack.s3ImageUrl} alt={selectedTrack.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">Sem Imagem</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacidade Máxima:</span>
                    <Badge variant="secondary">{selectedTrack.pitboxes} Pitboxes</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Tamanho do Grid</CardTitle>
              <CardDescription>Quantos pilotos poderão entrar no servidor.</CardDescription>
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
                  <p className="text-xs text-red-500">Valor excede o limite da pista selecionada!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CarIcon className="h-5 w-5" /> Roster de Carros</CardTitle>
              <CardDescription>
                Selecione os veículos permitidos. O sistema distribuirá as {maxClients} vagas entre os carros selecionados de forma igual.
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
                      <div className="aspect-video w-full bg-muted">
                         {car.s3ImageUrl ? (
                          <img src={car.s3ImageUrl} alt={car.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">Sem Imagem</div>
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
                  Nenhum carro cadastrado no banco de dados. Instale mods primeiro!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}