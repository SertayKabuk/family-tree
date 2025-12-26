"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreePine, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface InvitationData {
  valid: boolean;
  invitation?: {
    id: string;
    treeId: string;
    treeName: string;
    role: string;
    expiresAt: string;
    isExpired: boolean;
    isUsed: boolean;
  };
  error?: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session, status } = useSession();
  const t = useTranslations("invite");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        const data = await response.json();
        setInvitation(data);
      } catch {
        setInvitation({ valid: false, error: t("errors.loadFailed") });
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchInvitation();
    }
  }, [token, t]);

  const handleAccept = async () => {
    if (!session?.user) {
      // Store token and redirect to login
      signIn("google", { callbackUrl: `/invite/${token}` });
      return;
    }

    setAccepting(true);

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t("success"));
        router.push(`/trees/${data.treeId}`);
      } else {
        toast.error(data.error || t("errors.acceptFailed"));
      }
    } catch {
      toast.error(t("errors.acceptFailed"));
    } finally {
      setAccepting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inv = invitation?.invitation;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <TreePine className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          {inv && (
            <CardDescription>
              {t("invitedTo", { name: inv.treeName })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {!invitation?.valid ? (
            <div className="text-center space-y-4">
              <div className="mx-auto p-3 rounded-full bg-destructive/10 w-fit">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">{t("invalid")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {invitation?.error || t("invalidDescription")}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push("/")}>
                {t("goHome")}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("familyTree")}</span>
                  <span className="font-medium">{inv?.treeName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("yourRole")}</span>
                  <Badge variant="secondary">
                    {inv?.role === "EDITOR" ? t("editor") : t("viewer")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("details.expires")}</span>
                  <span className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(inv?.expiresAt || "").toLocaleDateString(locale)}
                  </span>
                </div>
              </div>

              {session?.user ? (
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    {t("signedInAs", { email: session.user.email || "" })}
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleAccept}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("joining")}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t("accept")}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    {t("signInToAccept")}
                  </p>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => signIn("google", { callbackUrl: `/invite/${token}` })}
                  >
                    <svg
                      className="mr-2 h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t("signInWithGoogle")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
