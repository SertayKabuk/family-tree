"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  const getThemeLabel = (value: string | undefined) => {
    switch (value) {
      case "light":
        return t("light");
      case "dark":
        return t("dark");
      case "system":
        return t("system");
      default:
        return t("toggle");
    }
  };

  return (
    <Select value={theme} onValueChange={(value) => value && setTheme(value)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>{getThemeLabel(theme)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">{t("light")}</SelectItem>
        <SelectItem value="dark">{t("dark")}</SelectItem>
        <SelectItem value="system">{t("system")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
