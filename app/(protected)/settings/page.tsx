import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { LanguageSelector } from "@/components/settings/language-selector";

export default async function SettingsPage() {
  const session = await auth();
  const t = await getTranslations("userSettings");

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = session.user;
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="container py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <div className="space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("account.title")}</CardTitle>
            <CardDescription>{t("account.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div>
                  <span className="text-sm text-muted-foreground">{t("account.name")}</span>
                  <p className="font-medium">{user.name || "-"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t("account.email")}</span>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("appearance.title")}</CardTitle>
            <CardDescription>{t("appearance.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">{t("appearance.theme")}</p>
                <p className="text-sm text-muted-foreground">{t("appearance.themeDescription")}</p>
              </div>
              <ThemeSelector />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">{t("appearance.language")}</p>
                <p className="text-sm text-muted-foreground">{t("appearance.languageDescription")}</p>
              </div>
              <LanguageSelector />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
