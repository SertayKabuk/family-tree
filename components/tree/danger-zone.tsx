"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DangerZoneProps {
  treeId: string;
  treeName: string;
}

export function DangerZone({ treeId, treeName }: DangerZoneProps) {
  const router = useRouter();
  const t = useTranslations();
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== treeName) {
      toast.error(t("dangerZone.errors.confirmMismatch"));
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/trees/${treeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tree");
      }

      toast.success(t("dangerZone.success"));
      router.push("/dashboard");
    } catch {
      toast.error(t("dangerZone.errors.failed"));
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {t("dangerZone.title")}
        </CardTitle>
        <CardDescription>
          {t("dangerZone.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div>
            <p className="font-medium">{t("dangerZone.deleteTree")}</p>
            <p className="text-sm text-muted-foreground">
              {t("dangerZone.deleteTreeDescription")}
            </p>
          </div>

          <AlertDialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setConfirmName("");
          }}>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("dangerZone.deleteButton")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("dangerZone.deleteDialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    {t("dangerZone.deleteDialogDescription", { name: treeName })}
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>{t("dangerZone.deleteList.members")}</li>
                    <li>{t("dangerZone.deleteList.media")}</li>
                    <li>{t("dangerZone.deleteList.relationships")}</li>
                    <li>{t("dangerZone.deleteList.sharing")}</li>
                  </ul>
                  <p>
                    {t("dangerZone.confirmPrompt", { name: treeName })}
                  </p>
                  <Input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={treeName}
                    disabled={deleting}
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmName !== treeName || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("dangerZone.deleting")}
                    </>
                  ) : (
                    t("dangerZone.deleteForever")
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
