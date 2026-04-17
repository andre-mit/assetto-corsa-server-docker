"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  FileArchive,
  Loader2,
  CheckCircle,
  AlertCircle,
  Car,
  MapPin,
} from "lucide-react";
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

export default function ContentPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const handleSyncBaseContent = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/content/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert("Erro na sincronização: " + data.error);
      }
    } catch (error) {
      console.error(error);
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
      console.error("Erro ao carregar conteúdo:", error);
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
      setUploadMessage("A transferir o ficheiro ZIP para o servidor...");

      const formData = new FormData();
      formData.append("modFile", file);

      try {
        setUploadStatus("processing");
        setUploadMessage(
          "A extrair, analisar ficheiros UI e a sincronizar com o S3/Base de Dados. Isto pode demorar alguns minutos para pistas pesadas...",
        );

        const response = await fetch("/api/mods/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          setUploadStatus("success");
          setUploadMessage(data.message || "Mod instalado com sucesso!");
          fetchData();
        } else {
          setUploadStatus("error");
          setUploadMessage(data.error || "Erro ao processar o mod.");
        }
      } catch (error: any) {
        setUploadStatus("error");
        setUploadMessage("Falha na ligação com o servidor.");
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
          Gestor de Conteúdo
        </h2>
        <p className="text-muted-foreground">
          Instale novos mods (Carros ou Pistas) ou visualize o conteúdo
          existente.
        </p>
      </div>
      <Button
        onClick={handleSyncBaseContent}
        disabled={isSyncing}
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
        Sincronizar Conteúdo Base
      </Button>
      <Card className="border-2 border-dashed bg-muted/30">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center py-16 px-4 text-center cursor-pointer transition-colors duration-200 ${
              isDragActive
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted/50"
            } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input {...getInputProps()} />

            {uploadStatus === "idle" && (
              <>
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Arraste um ficheiro .ZIP para aqui
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ou clique para procurar. O sistema deteta automaticamente se é
                  um carro ou uma pista.
                </p>
              </>
            )}

            {(uploadStatus === "uploading" ||
              uploadStatus === "processing") && (
              <div className="flex flex-col items-center max-w-md w-full">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-semibold">
                  {uploadStatus === "uploading"
                    ? "A enviar ficheiro..."
                    : "A processar Mod..."}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {uploadMessage}
                </p>
                {uploadStatus === "processing" && (
                  <Progress
                    value={null}
                    className="w-full mt-4 h-2 animate-pulse"
                  />
                )}
              </div>
            )}

            {uploadStatus === "success" && (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-600">
                  Sucesso!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {uploadMessage}
                </p>
              </>
            )}

            {uploadStatus === "error" && (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-600">
                  Erro na Instalação
                </h3>
                <p className="text-sm text-red-500/80 mt-1">{uploadMessage}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadStatus("idle");
                  }}
                  className="mt-4 text-sm underline text-muted-foreground"
                >
                  Tentar novamente
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="cars" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="cars" className="gap-2">
                <Car className="w-4 h-4" /> Carros ({cars.length})
              </TabsTrigger>
              <TabsTrigger value="tracks" className="gap-2">
                <MapPin className="w-4 h-4" /> Pistas ({tracks.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cars" className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cars.map((car) => (
                <Card key={car.id} className="overflow-hidden relative group">
                  {car.isMod && (
                    <Badge className="absolute top-2 right-2 z-10 bg-blue-600">
                      Mod
                    </Badge>
                  )}
                  <div className="aspect-video bg-muted relative">
                    {car.s3ImageUrl ? (
                      <img
                        src={car.s3ImageUrl}
                        alt={car.name}
                        className="w-full h-full object-cover"
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
                  Nenhum carro encontrado.
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
                      Mod
                    </Badge>
                  )}
                  <div className="aspect-video bg-muted relative">
                    {track.s3ImageUrl ? (
                      <img
                        src={track.s3ImageUrl}
                        alt={track.name}
                        className="w-full h-full object-cover"
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
                      {track.pitboxes} Pits
                    </Badge>
                  </div>
                </Card>
              ))}
              {tracks.length === 0 && (
                <p className="text-muted-foreground col-span-full py-8 text-center border rounded-lg">
                  Nenhuma pista encontrada.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
