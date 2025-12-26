"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import {
  Calendar,
  Briefcase,
  Camera,
  FileText,
  Mic,
  Info,
  Edit,
  Upload,
  Plus,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import {
  FamilyMember,
  Photo,
  Document,
  AudioClip,
  Fact,
  Relationship,
  Gender,
} from "@prisma/client";
import { GENDER_COLORS } from "@/lib/tree-colors";
import { useRelationshipLabels } from "@/lib/use-relationship-labels";
import { MediaUploadDialog } from "@/components/members/media-upload-dialog";
import { AddFactDialog } from "@/components/members/add-fact-dialog";
import { EditMemberDialog } from "@/components/members/edit-member-dialog";
import { ProfilePhotoUpload } from "@/components/members/profile-photo-upload";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { toast } from "sonner";

type MemberWithDetails = FamilyMember & {
  relationshipsFrom: (Relationship & {
    toMember: { id: string; firstName: string; lastName: string | null; gender: Gender };
  })[];
  relationshipsTo: (Relationship & {
    fromMember: { id: string; firstName: string; lastName: string | null; gender: Gender };
  })[];
  photos: Photo[];
  documents: Document[];
  audioClips: AudioClip[];
  facts: Fact[];
};

interface MemberDetailModalProps {
  member: FamilyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treeId: string;
  canEdit: boolean;
  onMemberSelect?: (memberId: string) => void;
}

export function MemberDetailModal({
  member,
  open,
  onOpenChange,
  treeId,
  canEdit,
  onMemberSelect,
}: MemberDetailModalProps) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const { getRelationshipLabel } = useRelationshipLabels();
  const [memberDetails, setMemberDetails] = useState<MemberWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<string | null>(null);

  const [uploadType, setUploadType] = useState<"photos" | "documents" | "audio" | null>(null);
  const [addFactOpen, setAddFactOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [profilePhotoOpen, setProfilePhotoOpen] = useState(false);

  const fetchMemberDetails = useCallback(async () => {
    if (!member?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/trees/${treeId}/members/${member.id}`);
      if (response.ok) {
        const data = await response.json();
        setMemberDetails(data);
      }
    } catch (error) {
      console.error("Failed to fetch member details:", error);
    } finally {
      setLoading(false);
    }
  }, [member?.id, treeId]);

  useEffect(() => {
    if (open && member) {
      fetchMemberDetails();
    }
  }, [open, member, fetchMemberDetails]);

  const handleDelete = async () => {
    if (!member) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/trees/${treeId}/members/${member.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      toast.success(t("memberModal.memberDeleted"));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t("memberModal.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const deleteMedia = async (type: "photo" | "document" | "audio", id: string) => {
    if (!member) return;
    setDeletingMedia(id);
    try {
      const response = await fetch(`/api/trees/${treeId}/members/${member.id}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast.success(t("profile.media.deleteSuccess"));
      fetchMemberDetails();
      router.refresh();
    } catch {
      toast.error(t("profile.media.deleteError"));
    } finally {
      setDeletingMedia(null);
    }
  };

  if (!member) return null;

  const colors = GENDER_COLORS[member.gender];
  const initials = `${member.firstName[0]}${member.lastName?.[0] || ""}`.toUpperCase();
  const fullName = `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const genderLabel = {
    MALE: t("gender.male"),
    FEMALE: t("gender.female"),
    OTHER: t("gender.other"),
    UNKNOWN: t("gender.unknown"),
  }[member.gender];

  const allRelationships = memberDetails
    ? [
        ...memberDetails.relationshipsFrom.map((r) => ({
          type: r.type,
          person: r.toMember,
          label: getRelationshipLabel(r.type, memberDetails.gender, r.toMember.gender),
        })),
        ...memberDetails.relationshipsTo.map((r) => ({
          type: r.type,
          person: r.fromMember,
          label: getRelationshipLabel(r.type, r.fromMember.gender, memberDetails.gender),
        })),
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0"
        showCloseButton={false}
      >
        {/* Header with Avatar and Basic Info */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="relative group shrink-0">
                <Avatar
                  className={`h-20 w-20 border-4 ${canEdit ? "cursor-pointer" : ""}`}
                  style={{ borderColor: colors.border }}
                  onClick={() => canEdit && setProfilePhotoOpen(true)}
                >
                  {member.profilePicturePath ? (
                    <AvatarImage
                      src={`/api/files/${member.profilePicturePath}`}
                      alt={fullName}
                    />
                  ) : null}
                  <AvatarFallback
                    className="text-2xl font-bold"
                    style={{ backgroundColor: colors.border, color: "white" }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {canEdit && (
                  <div
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setProfilePhotoOpen(true)}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{fullName}</DialogTitle>
                    {member.nickname && (
                      <DialogDescription>&ldquo;{member.nickname}&rdquo;</DialogDescription>
                    )}
                    <Badge
                      variant="secondary"
                      className="mt-2"
                      style={{ backgroundColor: colors.background, color: colors.text }}
                    >
                      {genderLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMemberOpen(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t("common.edit")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenChange(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {member.birthDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {member.birthPlace
                          ? t("profile.bornIn", { date: formatDate(member.birthDate), place: member.birthPlace })
                          : t("profile.born", { date: formatDate(member.birthDate) })}
                      </span>
                    </div>
                  )}
                  {member.deathDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {member.deathPlace
                          ? t("profile.diedIn", { date: formatDate(member.deathDate), place: member.deathPlace })
                          : t("profile.died", { date: formatDate(member.deathDate) })}
                      </span>
                    </div>
                  )}
                  {member.occupation && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{member.occupation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Biography */}
              {member.bio && (
                <div>
                  <h3 className="font-semibold mb-2">{t("profile.biography")}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{member.bio}</p>
                </div>
              )}

              {/* Relationships */}
              {allRelationships.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">{t("profile.relationships")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {allRelationships.map((rel, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => {
                          if (onMemberSelect) {
                            onMemberSelect(rel.person.id);
                          }
                        }}
                      >
                        {rel.label}: {rel.person.firstName} {rel.person.lastName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Media Tabs */}
              <Tabs defaultValue="photos">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="photos" className="gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("profile.tabs.photos")}</span>
                    <Badge variant="secondary" className="ml-1">
                      {memberDetails?.photos.length ?? 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("profile.tabs.documents")}</span>
                    <Badge variant="secondary" className="ml-1">
                      {memberDetails?.documents.length ?? 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="gap-2">
                    <Mic className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("profile.tabs.audio")}</span>
                    <Badge variant="secondary" className="ml-1">
                      {memberDetails?.audioClips.length ?? 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="facts" className="gap-2">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("profile.tabs.facts")}</span>
                    <Badge variant="secondary" className="ml-1">
                      {memberDetails?.facts.length ?? 0}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">{t("profile.photos.title")}</CardTitle>
                      {canEdit && (
                        <Button size="sm" onClick={() => setUploadType("photos")}>
                          <Upload className="h-4 w-4 mr-2" />
                          {t("common.upload")}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <PhotoGallery
                        photos={(memberDetails?.photos ?? []).map((photo) => ({
                          id: photo.id,
                          src: `/api/files/${photo.filePath}`,
                          title: photo.title,
                        }))}
                        canEdit={canEdit}
                        onDelete={(id) => deleteMedia("photo", id)}
                        deletingId={deletingMedia}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">{t("profile.documents.title")}</CardTitle>
                      {canEdit && (
                        <Button size="sm" onClick={() => setUploadType("documents")}>
                          <Upload className="h-4 w-4 mr-2" />
                          {t("common.upload")}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {!memberDetails?.documents.length ? (
                        <p className="text-center text-muted-foreground py-8">
                          {t("profile.documents.empty")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {memberDetails.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                            >
                              <a
                                href={`/api/files/${doc.filePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 flex-1 min-w-0"
                              >
                                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{doc.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(doc.fileSize / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </a>
                              {canEdit && (
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    render={
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive shrink-0"
                                        disabled={deletingMedia === doc.id}
                                      />
                                    }
                                  >
                                    {deletingMedia === doc.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t("profile.documents.deleteTitle")}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t("profile.documents.deleteDescription", { title: doc.title })}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMedia("document", doc.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {t("common.delete")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="audio" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">{t("profile.audio.title")}</CardTitle>
                      {canEdit && (
                        <Button size="sm" onClick={() => setUploadType("audio")}>
                          <Upload className="h-4 w-4 mr-2" />
                          {t("common.upload")}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {!memberDetails?.audioClips.length ? (
                        <p className="text-center text-muted-foreground py-8">
                          {t("profile.audio.empty")}
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {memberDetails.audioClips.map((clip) => (
                            <div key={clip.id} className="p-4 rounded-lg border">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-medium">{clip.title}</p>
                                {canEdit && (
                                  <AlertDialog>
                                    <AlertDialogTrigger
                                      render={
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="text-destructive hover:text-destructive shrink-0 h-8 w-8"
                                          disabled={deletingMedia === clip.id}
                                        />
                                      }
                                    >
                                      {deletingMedia === clip.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t("profile.audio.deleteTitle")}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t("profile.audio.deleteDescription", { title: clip.title })}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMedia("audio", clip.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          {t("common.delete")}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                              <audio controls className="w-full">
                                <source src={`/api/files/${clip.filePath}`} />
                                {t("profile.audio.notSupported")}
                              </audio>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="facts" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <CardTitle className="text-base">{t("profile.facts.title")}</CardTitle>
                      {canEdit && (
                        <Button size="sm" onClick={() => setAddFactOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("profile.facts.addFact")}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {!memberDetails?.facts.length ? (
                        <p className="text-center text-muted-foreground py-8">
                          {t("profile.facts.empty")}
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {memberDetails.facts.map((fact) => (
                            <div key={fact.id} className="p-4 rounded-lg border">
                              <h4 className="font-semibold">{fact.title}</h4>
                              {fact.date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(fact.date)}
                                </p>
                              )}
                              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                                {fact.content}
                              </p>
                              {fact.source && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {t("common.source")}: {fact.source}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Delete Member */}
              {canEdit && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={deleting}
                          />
                        }
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        {t("memberModal.deleteMember")}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("memberModal.deleteDialogTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("memberModal.deleteDialogDescription", { name: fullName })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dialogs */}
        <MediaUploadDialog
          treeId={treeId}
          memberId={member.id}
          type={uploadType}
          open={!!uploadType}
          onOpenChange={(open) => {
            if (!open) {
              setUploadType(null);
              fetchMemberDetails();
            }
          }}
        />

        <AddFactDialog
          treeId={treeId}
          memberId={member.id}
          open={addFactOpen}
          onOpenChange={(open) => {
            setAddFactOpen(open);
            if (!open) {
              fetchMemberDetails();
            }
          }}
        />

        <EditMemberDialog
          member={memberDetails ?? member}
          treeId={treeId}
          open={editMemberOpen}
          onOpenChange={(open) => {
            setEditMemberOpen(open);
            if (!open) {
              fetchMemberDetails();
              router.refresh();
            }
          }}
        />

        <ProfilePhotoUpload
          treeId={treeId}
          memberId={member.id}
          memberName={fullName}
          currentPhotoPath={member.profilePicturePath}
          gender={member.gender}
          open={profilePhotoOpen}
          onOpenChange={(open) => {
            setProfilePhotoOpen(open);
            if (!open) {
              router.refresh();
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
