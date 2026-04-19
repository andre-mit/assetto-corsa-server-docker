"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Track, Car } from "@/types/ac-server";

export default function ContentPage() {
  const t = useTranslations("Content");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJobIds, setActiveJobIds] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`/api/mods/job?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);

        // Auto-track active jobs found in the list
        const activeIds = data
          .filter(j => ["PENDING", "DOWNLOADING", "EXTRACTING", "INGESTING"].includes(j.status))
          .map(j => j.id);

        setActiveJobIds(prev => {
          const combined = Array.from(new Set([...prev, ...activeIds]));
          return combined;
        });
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000); // Background refresh every 10s
    return () => clearInterval(interval);
  }, [fetchJobs]);

  useEffect(() => {
    if (activeJobIds.length === 0) return;

    const interval = setInterval(async () => {
      const updatedJobIds = [...activeJobIds];
      const newJobs: any[] = [];

      for (let i = updatedJobIds.length - 1; i >= 0; i--) {
        const id = updatedJobIds[i];
        try {
          const res = await fetch(`/api/mods/job/${id}`);
          const job = await res.json();
          newJobs.push(job);

          if (job.status === "SUCCESS" || job.status === "FAILED") {
            updatedJobIds.splice(i, 1);
            if (job.status === "SUCCESS") {
              toast.success(t("success"));
              fetchData();
            } else {
              toast.error(`${t("installError")}: ${job.error}`);
            }
          }
        } catch (e) {
          updatedJobIds.splice(i, 1);
        }
      }
      setJobs(newJobs);
      setActiveJobIds(updatedJobIds);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJobIds, t]);

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
      const [tracksRes, carsRes] = await Promise.all([
        fetch("/api/content/tracks"),
        fetch("/api/content/cars"),
      ]);
      setTracks(await tracksRes.json());
      setCars(await carsRes.json());
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setUploadStatus("uploading");
      setUploadMessage(t("transferring"));

      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks to stay well below Next.js 10MB limit
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uniqueUploadId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      let lastResponseData: any = null;

      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const formData = new FormData();
          formData.append('chunk', chunk, file.name);
          formData.append('filename', file.name);
          formData.append('uploadId', uniqueUploadId);
          formData.append('chunkIndex', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());

          const response = await fetch("/api/mods/upload", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Chunk upload failed");
          }
          lastResponseData = data;

          // Visual progress for the chunks specifically
          const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          setUploadMessage(`${t("transferring")} ${progress}%`);
        }

        if (lastResponseData && lastResponseData.jobId) {
          setActiveJobIds(prev => [...prev, lastResponseData.jobId]);
          setUploadStatus("success");
          setUploadMessage(t("success"));
        } else {
          setUploadStatus("error");
          setUploadMessage(t("installError"));
        }
      } catch (err: unknown) {
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

    // Auto-prepend http if user just pastes a domain link
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
        setActiveJobIds(prev => [...prev, data.jobId]);
        setUploadStatus("success");
        setDownloadUrl("");
      } else {
        setUploadStatus("error");
        setUploadMessage(data.error || t("installError"));
      }
    } catch (err: unknown) {
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
    },
    maxFiles: 1,
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

      {jobs.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> {t("activeJobs")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0 space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === "FAILED" ? "destructive" : "outline"}>
                      {t(`jobStatus.${job.status}`)}
                    </Badge>
                    <span className="text-muted-foreground max-w-[200px] truncate">
                      {job.type === "DOWNLOAD" ? job.target : "ZIP Upload"}
                    </span>
                  </div>
                  <span className="font-mono">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="cars" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="cars" className="gap-2">
                <CarIcon className="w-4 h-4" /> {t("cars")} ({cars.length})
              </TabsTrigger>
              <TabsTrigger value="tracks" className="gap-2">
                <MapPin className="w-4 h-4" /> {t("tracks")} ({tracks.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cars" className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cars.map((car) => (
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
                      {car.folderName}
                    </p>
                  </div>
                </Card>
              ))}
              {cars.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center border rounded-lg">
                  {t("noCars")}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tracks.map((track) => (
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
                        {track.folderName}
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
              {tracks.length === 0 && (
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
