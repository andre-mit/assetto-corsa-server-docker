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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

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

      const formData = new FormData();
      formData.append("modFile", file);

      try {
        setUploadStatus("processing");
        setUploadMessage(t("extracting"));

        const response = await fetch("/api/mods/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          setUploadStatus("success");
          setUploadMessage(data.message || t("success"));
          fetchData();
        } else {
          setUploadStatus("error");
          setUploadMessage(data.error || t("installError"));
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error("[api/mods/upload] Error:", error.message || error);
        setUploadStatus("error");
        setUploadMessage(t("connError"));
      } finally {
        setIsUploading(false);
        setTimeout(() => {
          if (uploadStatus !== "error") {
            setUploadStatus("idle");
            setUploadMessage("");
          }
        }, 5000);
      }
    },
    [uploadStatus],
  );
  
  const handleDownloadFromUrl = async () => {
    if (!downloadUrl || !downloadUrl.startsWith("http")) {
      toast.error(t("urlPlaceholder")); // Using placeholder as example, or better add a generic validation msg
      return;
    }

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadMessage(t("transferring"));
    
    try {
      setUploadStatus("processing");
      const response = await fetch("/api/mods/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus("success");
        setUploadMessage(data.message || t("success"));
        setDownloadUrl("");
        fetchData();
      } else {
        setUploadStatus("error");
        setUploadMessage(data.error || t("installError"));
      }
    } catch (err: unknown) {
      console.error("[api/mods/download] Error:", err);
      setUploadStatus("error");
      setUploadMessage(t("connError"));
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadStatus("idle");
        setUploadMessage("");
      }, 5000);
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
              className={`flex flex-col items-center justify-center py-12 px-4 text-center cursor-pointer transition-colors duration-200 ${
                isDragActive
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

              {(uploadStatus === "uploading" ||
                uploadStatus === "processing") && (
                <div className="flex flex-col items-center max-w-sm w-full">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                  <h3 className="text-md font-semibold">
                    {uploadStatus === "uploading"
                      ? t("uploading")
                      : t("processing")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 text-center truncate w-full px-4">
                    {uploadMessage}
                  </p>
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
                {isUploading && uploadStatus !== "idle" ? (
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
