"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FamilyTree } from "@prisma/client";

interface TreeSettingsFormProps {
  tree: FamilyTree;
}

export function TreeSettingsForm({ tree }: TreeSettingsFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(tree.name);
  const [description, setDescription] = useState(tree.description || "");
  const [isPublic, setIsPublic] = useState(tree.isPublic);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t("settings.errors.nameRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/trees/${tree.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tree");
      }

      toast.success(t("settings.success"));
      router.refresh();
    } catch {
      toast.error(t("settings.errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.general.title")}</CardTitle>
        <CardDescription>{t("settings.general.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("settings.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t("settings.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="public">{t("settings.publicTree")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.publicTreeDescription")}
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("settings.saveChanges")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
