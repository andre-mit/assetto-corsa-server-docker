"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  UploadCloud,
  FileArchive,
  Loader2,
  CheckCircle,
  AlertCircle,
  Car as CarIcon,
  MapPin,
  Link,
  Search,
  X,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Track, Car, Job, Brand } from "@/types/ac-server";
import { useEventSource } from "@/hooks/useEventSource";
import { UploadResponse } from "@/app/api/mods/upload/route";
import { getCountryFlag } from "@/lib/countryFlag";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function ContentPage() {
  const t = useTranslations("Content");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [showLimitedJobs, setShowLimitedJobs] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [carSearch, setCarSearch] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [trackSearch, setTrackSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/mods/job`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch { }
  }, []);

  const handleClearCompleted = async () => {
    try {
      const res = await fetch(`/api/mods/job/manage`, { method: "DELETE" });
      if (res.ok) fetchJobs();
    } catch { }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/mods/job/${id}`, { method: "DELETE" });
      if (res.ok) fetchJobs();
    } catch { }
  };

  const handleCancelJob = async (id: string) => {
    try {
      const res = await fetch(`/api/mods/job/${id}`, { method: "PATCH" });
      if (res.ok) fetchJobs();
    } catch { }
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEventSource({
    onJobUpdate: (updatedJob) => {
      setJobs((prevJobs) => {
        const jobIndex = prevJobs.findIndex((j) => j.id === updatedJob.id);
        const newJobs = [...prevJobs];

        if (jobIndex > -1) {
          newJobs[jobIndex] = { ...newJobs[jobIndex], ...updatedJob };
        } else {
          newJobs.unshift(updatedJob);
        }

        if (updatedJob.status === "SUCCESS") {
          toast.success(t("success"));

          // To prevent aggressive database hits on multi-drop (50 files), 
          // we ONLY fetch cars and tracks if no other job is pending.
          const activeJobsRemaining = newJobs.filter(j => ['PENDING', 'DOWNLOADING', 'EXTRACTING', 'INGESTING'].includes(j.status)).length;

          if (activeJobsRemaining === 0 && !isUploading) {
            fetchData();
          }
        } else if (updatedJob.status === "FAILED") {
          toast.error(`${t("installError")}: ${updatedJob.error}`);
        }

        return newJobs;
      });
    },
  });

  const handleSyncBaseContent = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/content/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("syncSuccess"));
        fetchData();
      } else {
        toast.error(`${t("connError")} ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(t("connError"));
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchData = async () => {
    try {
      const [tracksRes, carsRes, brandsRes] = await Promise.all([
        fetch("/api/content/tracks"),
        fetch("/api/content/cars"),
        fetch("/api/content/brands"),
      ]);
      setTracks(await tracksRes.json());
      setCars(await carsRes.json());
      const brandsData = await brandsRes.json();
      if (Array.isArray(brandsData)) setBrands(brandsData);
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCars = useMemo(() => {
    let result = cars;
    if (carSearch) {
      const term = carSearch.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(term) || c.folderName.toLowerCase().includes(term) || (c.brand && c.brand.toLowerCase().includes(term))
      );
    }
    if (selectedBrands.length > 0) {
      result = result.filter((c) => c.brand && selectedBrands.includes(c.brand));
    }
    return result;
  }, [cars, carSearch, selectedBrands]);

  const uniqueCountries = useMemo(() => {
    const countrySet = new Set<string>();
    let hasNull = false;
    for (const track of tracks) {
      if (track.country) {
        countrySet.add(track.country);
      } else {
        hasNull = true;
      }
    }
    const sorted = Array.from(countrySet).sort();
    if (hasNull) sorted.push("__others");
    return sorted;
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    let result = tracks;
    if (trackSearch) {
      const term = trackSearch.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(term) || t.folderName.toLowerCase().includes(term)
      );
    }
    if (selectedCountries.length > 0) {
      result = result.filter((t) => {
        if (selectedCountries.includes("__others") && !t.country) return true;
        return t.country && selectedCountries.includes(t.country);
      });
    }
    return result;
  }, [tracks, trackSearch, selectedCountries]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles || acceptedFiles.length === 0) return;

      setIsUploading(true);

      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks to stay well below Next.js 10MB limit

      try {
        let currentFileIndex = 0;
        const successfulJobs: string[] = [];

        for (const file of acceptedFiles) {
          currentFileIndex++;
          setUploadStatus("uploading");
          setUploadMessage(`${t("transferring")} (${currentFileIndex}/${acceptedFiles.length})`);

          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          const uniqueUploadId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

          let lastResponseData: UploadResponse | null = null;

          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
              try {
                const response = await fetch("/api/mods/upload", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/octet-stream",
                    "x-upload-id": uniqueUploadId,
                    "x-chunk-index": chunkIndex.toString(),
                    "x-total-chunks": totalChunks.toString(),
                    "x-file-name": encodeURIComponent(file.name),
                  },
                  body: chunk,
                });

                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || "Chunk upload failed");
                }
                lastResponseData = data;
                success = true;
              } catch (err) {
                retries--;
                if (retries === 0) {
                  throw err;
                }
                // Wait 2 seconds before retrying this chunk to allow the server's I/O to breathe
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }

            // Visual progress for the chunks specifically
            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            setUploadMessage(`[${currentFileIndex}/${acceptedFiles.length}] ${file.name} - ${progress}%`);
          }

          if (lastResponseData && lastResponseData.jobId) {
            successfulJobs.push(lastResponseData.jobId);
          } else {
            toast.error(`${t("installError")}: ${file.name}`);
          }
        }

        // All files finished their chunk loops
        if (successfulJobs.length > 0) {
          // If the page still tracked them visually, it's done via SSE so we just reset UI.
          setUploadStatus("success");
          setUploadMessage(t("success"));
        } else {
          setUploadStatus("error");
          setUploadMessage(t("installError"));
        }

      } catch {
        setUploadStatus("error");
        setUploadMessage(t("connError"));
      } finally {
        setIsUploading(false);
        setTimeout(() => {
          setUploadStatus("idle");
          setUploadMessage("");
        }, 3000);
      }
    },
    [t],
  );

  const handleDownloadFromUrl = async () => {
    let cleanUrl = downloadUrl.trim();
    if (!cleanUrl) {
      toast.error(t("urlPlaceholder"));
      return;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    setIsUploading(true);
    setUploadStatus("processing");

    try {
      const response = await fetch("/api/mods/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json();

      if (response.ok && data.jobId) {
        setUploadStatus("success");
        setDownloadUrl("");
      } else {
        setUploadStatus("error");
        setUploadMessage(data.error || t("installError"));
      }
    } catch {
      setUploadStatus("error");
      setUploadMessage(t("connError"));
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadStatus("idle");
        setUploadMessage("");
      }, 3000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
      "application/vnd.rar": [".rar"],
      "application/x-rar-compressed": [".rar"],
      "application/x-7z-compressed": [".7z"],
    },
    disabled: isUploading,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <Button
        onClick={handleSyncBaseContent}
        disabled={isSyncing}
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
        {t("syncBase")}
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-dashed bg-muted/30">
          <CardContent className="p-0">
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center py-12 px-4 text-center cursor-pointer transition-colors duration-200 ${isDragActive
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted/50"
                } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...getInputProps()} />

              {uploadStatus === "idle" && (
                <>
                  <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="text-md font-semibold">
                    {t("installZip")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("installZipDetail")}
                  </p>
                </>
              )}

              {uploadStatus === "uploading" && (
                <div className="flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                  <h3 className="text-md font-semibold">{t("uploading")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{uploadMessage}</p>
                </div>
              )}

              {uploadStatus === "processing" && (
                <div className="flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in">
                  <CheckCircle className="w-10 h-10 text-primary mb-3" />
                  <h3 className="text-md font-semibold">{t("success")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t("transferring")}</p>
                </div>
              )}

              {uploadStatus === "success" && (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                  <h3 className="text-md font-semibold text-green-600">
                    {t("success")}
                  </h3>
                </>
              )}

              {uploadStatus === "error" && (
                <>
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <h3 className="text-md font-semibold text-red-600 text-center">
                    {t("installError")}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadStatus("idle");
                    }}
                    className="mt-2 text-xs underline text-muted-foreground"
                  >
                    {t("tryAgain")}
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10 h-full flex flex-col justify-center border-2 border-transparent">
          <CardHeader className="pb-4">
            <CardTitle className="text-md flex items-center gap-2">
              <Link className="w-4 h-4" /> {t("installUrl")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("installUrlDetail")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={t("urlPlaceholder")}
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                disabled={isUploading}
                className="bg-background"
              />
              <Button
                onClick={handleDownloadFromUrl}
                disabled={isUploading || !downloadUrl}
                className="shrink-0"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("download")
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Apenas links diretos de download. Sites como Mediafire podem falhar.
            </p>
          </CardContent>
        </Card>
      </div>

      {jobs.length > 0 && (() => {
        const displayedJobs = showLimitedJobs ? jobs.slice(0, 3) : jobs;
        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="py-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> {t("activeJobs")}
                </CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={showLimitedJobs}
                      onCheckedChange={setShowLimitedJobs}
                      id="limit-jobs"
                    />
                    <Label htmlFor="limit-jobs" className="cursor-pointer text-muted-foreground">Exibir apenas 3 recentes</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearCompleted} className="h-7 text-xs">
                    <Trash2 className="w-3 h-3 mr-2" />
                    Limpar Concluídos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4 pt-0 space-y-4">
              {displayedJobs.map((job) => (
                <div key={job.id} className="space-y-2 group">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={job.status === "FAILED" ? "destructive" : (job.status === "SUCCESS" ? "default" : "outline")}>
                        {t(`jobStatus.${job.status}`)}
                      </Badge>
                      <span className="text-muted-foreground max-w-[200px] truncate">
                        {job.type === "DOWNLOAD" ? job.target : "ZIP Upload"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{job.progress}%</span>
                      {['SUCCESS', 'FAILED', 'CANCELLED'].includes(job.status) ? (
                        <button onClick={() => handleDeleteJob(job.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Apagar Registro">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleCancelJob(job.id)} className="text-muted-foreground hover:text-warning opacity-0 group-hover:opacity-100 transition-opacity" title="Cancelar Job">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress value={job.progress} className="h-1" />
                </div>
              ))}
              {showLimitedJobs && jobs.length > 3 && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                  + {jobs.length - 3} itens ocultos
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="cars" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="cars" className="gap-2">
                <CarIcon className="w-4 h-4" /> {t("cars")} ({filteredCars.length})
              </TabsTrigger>
              <TabsTrigger value="tracks" className="gap-2">
                <MapPin className="w-4 h-4" /> {t("tracks")} ({filteredTracks.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cars" className="mt-0 space-y-4">
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

            {selectedBrands.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <span className="text-xs text-muted-foreground font-medium">{t("activeFilters")}</span>
                {selectedBrands.map((brandName) => {
                  const brand = brands.find((b) => b.name === brandName);
                  return (
                    <Badge key={brandName} variant="secondary" className="gap-1 pr-1">
                      {brand?.s3BadgeUrl && (
                        <Image src={brand.s3BadgeUrl} alt={brandName} width={12} height={12} className="rounded-sm object-contain" />
                      )}
                      {brandName}
                      <button onClick={() => setSelectedBrands((prev) => prev.filter((b) => b !== brandName))} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
                <button onClick={() => setSelectedBrands([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t("clearAll")}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredCars.map((car) => (
                <Card key={car.id} className="overflow-hidden relative group">
                  {car.isMod && (
                    <Badge className="absolute top-2 right-2 z-10 bg-blue-600">
                      {t("mod")}
                    </Badge>
                  )}
                  <div className="aspect-video bg-muted relative">
                    {car.s3ImageUrl ? (
                      <Image
                        src={car.s3ImageUrl}
                        alt={car.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <FileArchive className="w-8 h-8 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{car.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {car.brand || car.folderName}
                    </p>
                  </div>
                </Card>
              ))}
              {filteredCars.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center border rounded-lg">
                  {t("noCars")}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="mt-0 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("searchTrack")}
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            {uniqueCountries.length > 0 && (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-2">
                  <button
                    onClick={() => setSelectedCountries([])}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${selectedCountries.length === 0
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                      }`}
                  >
                    {t("allCountries")}
                  </button>
                  {uniqueCountries.map((country) => (
                    <button
                      key={country}
                      onClick={() => {
                        setSelectedCountries((prev) =>
                          prev.includes(country)
                            ? prev.filter((c) => c !== country)
                            : [...prev, country]
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${selectedCountries.includes(country)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                        }`}
                    >
                      {getCountryFlag(country === "__others" ? null : country)} {country === "__others" ? t("others") : country}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTracks.map((track) => (
                <Card key={track.id} className="overflow-hidden relative group">
                  {track.isMod && (
                    <Badge className="absolute top-2 right-2 z-10 bg-blue-600">
                      {t("mod")}
                    </Badge>
                  )}
                  <div className="aspect-video bg-muted relative">
                    {track.s3ImageUrl ? (
                      <Image
                        src={track.s3ImageUrl}
                        alt={track.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <MapPin className="w-8 h-8 opacity-20" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex justify-between items-start">
                    <div className="overflow-hidden">
                      <p className="font-semibold text-sm truncate">
                        {track.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.country ? `${getCountryFlag(track.country)} ${track.country}` : track.folderName}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="whitespace-nowrap ml-2"
                    >
                      {track.pitboxes} {t("pits")}
                    </Badge>
                  </div>
                </Card>
              ))}
              {filteredTracks.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center border rounded-lg">
                  {t("noTracks")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
