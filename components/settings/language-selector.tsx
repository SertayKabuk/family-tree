"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locales, localeNames, type Locale } from "@/i18n/config";

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/locale=([^;]+)/);
  return (match?.[1] as Locale) || "en";
}

export function LanguageSelector() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentLocale, setCurrentLocale] = useState<Locale>(getLocaleFromCookie);

  const switchLocale = (locale: Locale) => {
    setCurrentLocale(locale);
    startTransition(() => {
      document.cookie = `locale=${locale};path=/;max-age=31536000`;
      router.refresh();
    });
  };

  return (
    <Select 
      value={currentLocale} 
      onValueChange={(value) => switchLocale(value as Locale)}
      disabled={isPending}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
