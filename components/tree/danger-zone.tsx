"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== treeName) {
      toast.error("Please type the tree name correctly to confirm");
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

      toast.success("Family tree deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete family tree");
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Irreversible actions that permanently affect your family tree
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div>
            <p className="font-medium">Delete this family tree</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete all members, photos, documents, and data
            </p>
          </div>

          <AlertDialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setConfirmName("");
          }}>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Tree
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Family Tree</AlertDialogTitle>
                <AlertDialogDescription className="space-y-4">
                  <p>
                    This action cannot be undone. This will permanently delete the
                    family tree <strong>&ldquo;{treeName}&rdquo;</strong> and all associated
                    data including:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>All family members and their profiles</li>
                    <li>All photos, documents, and audio files</li>
                    <li>All relationships and facts</li>
                    <li>All sharing settings and invitations</li>
                  </ul>
                  <p>
                    Please type <strong>{treeName}</strong> to confirm.
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
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={confirmName !== treeName || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Forever"
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
