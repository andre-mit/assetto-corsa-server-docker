import { useTranslations } from "next-intl";
import FileEditorComponent from "@/components/config-editor/FileEditor";

export default function ConfigEditorPage() {
  const t = useTranslations("ConfigEditor");

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t("description")}</p>
      </div>
      <FileEditorComponent />
    </div>
  );
}
