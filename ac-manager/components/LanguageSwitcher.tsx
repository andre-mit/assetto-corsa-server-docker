"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALES = [
  { value: "pt", label: "PT", flag: "🇧🇷" },
  { value: "en", label: "EN", flag: "🇺🇸" },
  { value: "es", label: "ES", flag: "🇪🇸" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  const current = LOCALES.find((l) => l.value === locale);

  return (
    <Select value={locale} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className="w-24 h-8 text-xs gap-1 border-border bg-background/50"
        aria-label="Select language"
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span>{current?.flag}</span>
            <span className="font-medium">{current?.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="center" side="top">
        {LOCALES.map((l) => (
          <SelectItem key={l.value} value={l.value} className="text-xs">
            <span className="flex items-center gap-2">
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
