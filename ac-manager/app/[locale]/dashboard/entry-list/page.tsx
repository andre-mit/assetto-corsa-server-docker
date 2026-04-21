"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  MapPin,
  Users,
  Car as CarIcon,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AcServerConfig, Track, Car, Brand } from "@/types/ac-server";

interface SelectedCarEntry {
  folderName: string;
  skins: string[];
  allSkins: string[];
  loadingSkins: boolean;
  expanded: boolean;
}

export default function EntryListPage() {
  const t = useTranslations("EntryList");
  const [config, setConfig] = useState<AcServerConfig | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedCars, setSelectedCars] = useState<SelectedCarEntry[]>([]);
  const [maxClients, setMaxClients] = useState(10);

  const [carSearch, setCarSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then((res) => res.json()),
      fetch("/api/content/tracks").then((res) => res.json()),
      fetch("/api/content/cars").then((res) => res.json()),
      fetch("/api/content/brands").then((res) => res.json()),
    ]).then(([configData, tracksData, carsData, brandsData]) => {
      setTracks(tracksData);
      setCars(carsData);
      if (Array.isArray(brandsData)) setBrands(brandsData);

      if (configData.serverCfg) {
        setConfig(configData.serverCfg);
        setMaxClients(
          parseInt(configData.serverCfg.SERVER.MAX_CLIENTS) || 10
        );

        const currentCars = configData.serverCfg.SERVER.CARS.split(";").filter(
          Boolean
        );
        const entries: SelectedCarEntry[] = currentCars.map(
          (folderName: string) => ({
            folderName,
            skins: [],
            allSkins: [],
            loadingSkins: false,
            expanded: false,
          })
        );
        setSelectedCars(entries);

        // Load skins for pre-selected cars
        entries.forEach((entry, idx) => {
          fetchSkinsForCar(entry.folderName).then((skins) => {
            setSelectedCars((prev) => {
              const updated = [...prev];
              if (updated[idx]) {
                updated[idx] = {
                  ...updated[idx],
                  allSkins: skins,
                  skins: skins, // Default: all skins selected
                  loadingSkins: false,
                };
              }
              return updated;
            });
          });
        });

        const currentTrackId = configData.serverCfg.SERVER.TRACK;
        const matchedTrack = (tracksData as Track[]).find(
          (t: Track) => t.folderName === currentTrackId
        );
        if (matchedTrack) setSelectedTrack(matchedTrack);
      }
      setIsLoading(false);
    });
  }, []);

  const fetchSkinsForCar = async (folderName: string): Promise<string[]> => {
    try {
      const res = await fetch(`/api/content/cars/${folderName}/skins`);
      const data = await res.json();
      return data.skins || [];
    } catch {
      return [];
    }
  };

  const addCar = useCallback(
    async (folderName: string) => {
      if (selectedCars.some((c) => c.folderName === folderName)) return;

      const newEntry: SelectedCarEntry = {
        folderName,
        skins: [],
        allSkins: [],
        loadingSkins: true,
        expanded: true,
      };
      setSelectedCars((prev) => [...prev, newEntry]);

      const skins = await fetchSkinsForCar(folderName);
      setSelectedCars((prev) =>
        prev.map((c) =>
          c.folderName === folderName
            ? { ...c, allSkins: skins, skins: skins, loadingSkins: false }
            : c
        )
      );
    },
    [selectedCars]
  );

  const removeCar = useCallback((folderName: string) => {
    setSelectedCars((prev) => prev.filter((c) => c.folderName !== folderName));
  }, []);

  const toggleExpand = useCallback((folderName: string) => {
    setSelectedCars((prev) =>
      prev.map((c) =>
        c.folderName === folderName ? { ...c, expanded: !c.expanded } : c
      )
    );
  }, []);

  const toggleSkin = useCallback((folderName: string, skin: string) => {
    setSelectedCars((prev) =>
      prev.map((c) => {
        if (c.folderName !== folderName) return c;
        const hasSkin = c.skins.includes(skin);
        // Prevent deselecting the last skin
        if (hasSkin && c.skins.length <= 1) return c;
        return {
          ...c,
          skins: hasSkin
            ? c.skins.filter((s) => s !== skin)
            : [...c.skins, skin],
        };
      })
    );
  }, []);

  const toggleAllSkins = useCallback((folderName: string) => {
    setSelectedCars((prev) =>
      prev.map((c) => {
        if (c.folderName !== folderName) return c;
        const allSelected = c.skins.length === c.allSkins.length;
        return {
          ...c,
          skins: allSelected ? [c.allSkins[0]] : [...c.allSkins],
        };
      })
    );
  }, []);

  const filteredCars = useMemo(() => {
    let result = cars;
    if (carSearch) {
      const term = carSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.folderName.toLowerCase().includes(term) ||
          (c.brand && c.brand.toLowerCase().includes(term))
      );
    }
    if (selectedBrands.length > 0) {
      result = result.filter(
        (c) => c.brand && selectedBrands.includes(c.brand)
      );
    }
    return result;
  }, [cars, carSearch, selectedBrands]);

  const selectedFolderNames = useMemo(
    () => new Set(selectedCars.map((c) => c.folderName)),
    [selectedCars]
  );

  const handleSave = async () => {
    if (!selectedTrack) return toast.error(t("selectTrackError"));
    if (selectedCars.length === 0) return toast.error(t("selectCarError"));

    // Validate at least 1 skin per car
    const missingSkinsIndex = selectedCars.findIndex(c => c.skins.length === 0);
    if (missingSkinsIndex >= 0) return toast.error(t("selectSkinError"));

    if (maxClients > selectedTrack.pitboxes)
      return toast.error(
        t("maxClientsError", { max: selectedTrack.pitboxes })
      );

    setIsSaving(true);

    const carFolderNames = selectedCars.map((c) => c.folderName);
    const carSkins: Record<string, string[]> = {};
    selectedCars.forEach((c) => {
      carSkins[c.folderName] = c.skins;
    });

    const updatedConfig = {
      ...config,
      SERVER: {
        ...config?.SERVER,
        TRACK: selectedTrack.folderName,
        CARS: carFolderNames.join(";"),
        MAX_CLIENTS: maxClients,
      },
    };

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverCfg: updatedConfig, carSkins }),
      });

      if (res.ok) toast.success(t("saveSuccess"));
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  const maxPitboxes = selectedTrack ? selectedTrack.pitboxes : 100;

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
          {t("saveGrid")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> {t("circuit")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedTrack?.folderName || ""}
                onValueChange={(val) => {
                  const track =
                    tracks.find((track) => track.folderName === val) || null;
                  setSelectedTrack(track);
                  if (track && maxClients > track.pitboxes)
                    setMaxClients(track.pitboxes);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectTrack")} />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map((track) => (
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
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        {t("noImage")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("maxCapacity")}
                    </span>
                    <Badge variant="secondary">
                      {selectedTrack.pitboxes} Pitboxes
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> {t("gridSize")}
              </CardTitle>
              <CardDescription>{t("gridSizeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{maxClients}</span>
                <span className="text-sm text-muted-foreground">
                  {t("players")}
                </span>
              </div>
              <Slider
                value={[maxClients]}
                onValueChange={([val]) => setMaxClients(val)}
                min={1}
                max={maxPitboxes}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>{maxPitboxes}</span>
              </div>
              {selectedTrack && maxClients > selectedTrack.pitboxes && (
                <p className="text-xs text-red-500">
                  {t("gridSizeLimitError")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Selected Cars sidebar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CarIcon className="h-5 w-5" /> {t("selectedCars")} ({selectedCars.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedCars.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                  {t("noSelectedCars")}
                </p>
              ) : (
                selectedCars.map((entry) => {
                  const carData = cars.find(
                    (c) => c.folderName === entry.folderName
                  );
                  return (
                    <div
                      key={entry.folderName}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpand(entry.folderName)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {entry.expanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {carData?.name || entry.folderName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.skins.length}/{entry.allSkins.length}{" "}
                              {t("skins")}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCar(entry.folderName);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title={t("removeCar")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {entry.expanded && (
                        <div className="border-t px-3 py-2 space-y-1 bg-muted/20">
                          {entry.loadingSkins ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t("loadingSkins")}
                            </div>
                          ) : entry.allSkins.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">
                              {t("noSkins")}
                            </p>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 pb-1 border-b mb-1">
                                <Checkbox
                                  checked={
                                    entry.skins.length ===
                                    entry.allSkins.length
                                  }
                                  onCheckedChange={() =>
                                    toggleAllSkins(entry.folderName)
                                  }
                                  id={`all-${entry.folderName}`}
                                />
                                <label
                                  htmlFor={`all-${entry.folderName}`}
                                  className="text-xs font-medium cursor-pointer"
                                >
                                  {t("allSkins")} ({entry.allSkins.length})
                                </label>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {entry.allSkins.map((skin) => (
                                  <div
                                    key={skin}
                                    className="flex items-center gap-2"
                                  >
                                    <Checkbox
                                      checked={entry.skins.includes(skin)}
                                      onCheckedChange={() =>
                                        toggleSkin(entry.folderName, skin)
                                      }
                                      id={`skin-${entry.folderName}-${skin}`}
                                    />
                                    <label
                                      htmlFor={`skin-${entry.folderName}-${skin}`}
                                      className="text-xs cursor-pointer truncate"
                                    >
                                      {skin}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Available Cars */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CarIcon className="h-5 w-5" /> {t("availableCars")}
              </CardTitle>
              <CardDescription>
                {t("carRosterDesc", { max: maxClients })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchCar")}
                  value={carSearch}
                  onChange={(e) => setCarSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>

              {brands.length > 0 && (
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-2 pb-2">
                    <button
                      onClick={() => setSelectedBrands([])}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${selectedBrands.length === 0
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                        }`}
                    >
                      {t("allBrands")}
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => {
                          setSelectedBrands((prev) =>
                            prev.includes(brand.name)
                              ? prev.filter((b) => b !== brand.name)
                              : [...prev, brand.name]
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${selectedBrands.includes(brand.name)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                          }`}
                      >
                        {brand.s3BadgeUrl && (
                          <Image
                            src={brand.s3BadgeUrl}
                            alt={brand.name}
                            width={16}
                            height={16}
                            className="rounded-sm object-contain"
                          />
                        )}
                        {brand.name}
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCars.map((car) => {
                  const isSelected = selectedFolderNames.has(car.folderName);
                  return (
                    <div
                      key={car.id}
                      className={`relative overflow-hidden rounded-lg border-2 transition-all ${isSelected
                        ? "border-primary/30 opacity-50"
                        : "border-transparent hover:border-border cursor-pointer"
                        }`}
                      onClick={() => !isSelected && addCar(car.folderName)}
                    >
                      {isSelected && (
                        <Badge className="absolute top-2 right-2 z-10 bg-green-600">
                          {t("selected")}
                        </Badge>
                      )}
                      {!isSelected && (
                        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-3 w-3" />
                        </div>
                      )}
                      <div className="aspect-video w-full bg-muted relative">
                        {car.s3ImageUrl ? (
                          <Image
                            src={car.s3ImageUrl}
                            alt={car.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <FileArchive className="w-6 h-6 opacity-20" />
                          </div>
                        )}
                      </div>
                      <div className="bg-card p-3">
                        <p className="text-sm font-medium leading-none truncate">
                          {car.name}
                        </p>
                        {car.brand && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {car.brand}
                          </p>
                        )}
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