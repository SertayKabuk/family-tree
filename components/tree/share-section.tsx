"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Loader2,
  Trash2,
  UserPlus,
  Crown,
  Edit,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { MemberRole, TreeInvitation, TreeMembership, User } from "@prisma/client";

interface ShareSectionProps {
  treeId: string;
  treeName: string;
  memberships: (TreeMembership & {
    user: Pick<User, "id" | "name" | "email" | "image">;
  })[];
  invitations: TreeInvitation[];
  isOwner: boolean;
}

export function ShareSection({
  treeId,
  treeName,
  memberships,
  invitations,
  isOwner,
}: ShareSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<MemberRole>("VIEWER");
  const [inviteLink, setInviteLink] = useState<{
    url: string;
    whatsappUrl: string;
    emailSubject: string;
    emailBody: string;
  } | null>(null);

  const createInvite = async () => {
    setCreating(true);

    try {
      const response = await fetch(`/api/trees/${treeId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Failed to create invitation");
      }

      const data = await response.json();
      setInviteLink({
        url: data.inviteUrl,
        whatsappUrl: data.whatsappUrl,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
      });

      router.refresh();
    } catch {
      toast.error("Failed to create invitation link");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink.url);
      toast.success("Link copied to clipboard");
    }
  };

  const openWhatsApp = () => {
    if (inviteLink) {
      window.open(inviteLink.whatsappUrl, "_blank");
    }
  };

  const openEmail = () => {
    if (inviteLink) {
      window.location.href = `mailto:?subject=${encodeURIComponent(
        inviteLink.emailSubject
      )}&body=${encodeURIComponent(inviteLink.emailBody)}`;
    }
  };

  const deleteInvitation = async (id: string) => {
    try {
      await fetch(`/api/trees/${treeId}/invitations?id=${id}`, {
        method: "DELETE",
      });
      toast.success("Invitation deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete invitation");
    }
  };

  const roleIcons = {
    OWNER: Crown,
    EDITOR: Edit,
    VIEWER: Eye,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Sharing
        </CardTitle>
        <CardDescription>
          Invite family members to view or edit this tree
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Invite Dialog */}
        {isOwner && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setInviteLink(null);
              setRole("VIEWER");
            }
          }}>
            <DialogTrigger render={<Button />}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Invite Link
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invitation</DialogTitle>
                <DialogDescription>
                  Create a shareable link to invite family members
                </DialogDescription>
              </DialogHeader>

              {!inviteLink ? (
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label>Permission Level</Label>
                    <Select
                      value={role}
                      onValueChange={(v) => v && setRole(v as MemberRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span>Viewer - Can only view the tree</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="EDITOR">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            <span>Editor - Can add and edit members</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label>Share Link</Label>
                    <div className="flex gap-2">
                      <Input value={inviteLink.url} readOnly />
                      <Button variant="outline" size="icon" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={openWhatsApp}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={openEmail}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter>
                {!inviteLink ? (
                  <Button onClick={createInvite} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Generate Link
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Done
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Current Members */}
        {memberships.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Members</h4>
            <div className="space-y-2">
              {memberships.map((membership) => {
                const RoleIcon = roleIcons[membership.role];
                return (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={membership.user.image || undefined} />
                        <AvatarFallback>
                          {membership.user.name?.[0] || membership.user.email?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {membership.user.name || membership.user.email}
                        </p>
                        {membership.user.name && (
                          <p className="text-xs text-muted-foreground">
                            {membership.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {membership.role.charAt(0) + membership.role.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Pending Invitations</h4>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {invitation.email || "Anyone with link"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}
                    </Badge>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
