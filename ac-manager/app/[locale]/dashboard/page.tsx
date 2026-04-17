import ServerLogs from "@/components/ServerLogs";
import { useTranslations } from "next-intl";

export default function Dashboard() {
  const t = useTranslations("Dashboard");
  return (
    <>
      <h1>{t("title")}</h1>
      <ServerLogs />
      <p>
        {t("status")}: {t("online")}
      </p>
    </>
  );
}
