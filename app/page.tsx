import Link from "next/link";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TreePine, Users, Share2, Image as ImageIcon, FileText, Mic } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const t = await getTranslations();

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">{t("common.appName")}</span>
          </div>
          <nav>
            {session?.user ? (
              <Link href="/dashboard">
                <Button>{t("home.goToDashboard")}</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>{t("auth.signIn")}</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          {t("home.heroTitle")}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("home.heroDescription")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href={session?.user ? "/dashboard" : "/login"}>
            <Button size="lg">{t("home.getStarted")}</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold text-center mb-12">
          {t("home.featuresTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TreePine className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("home.features.visualTree.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.features.visualTree.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("home.features.relationships.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.features.relationships.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("home.features.sharing.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.features.sharing.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("home.features.photos.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.features.photos.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("home.features.documents.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.features.documents.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("home.features.audio.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("home.features.audio.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t("home.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
