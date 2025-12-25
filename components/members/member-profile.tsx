"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
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
import { getRelationshipLabel } from "@/lib/tree-colors";
import { MediaUploadDialog } from "@/components/members/media-upload-dialog";
import { AddFactDialog } from "@/components/members/add-fact-dialog";
import { EditMemberDialog } from "@/components/members/edit-member-dialog";
import { ProfilePhotoUpload } from "@/components/members/profile-photo-upload";
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
import { toast } from "sonner";

interface MemberProfileProps {
  member: FamilyMember & {
    tree: { id: string; name: string };
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
  treeId: string;
  treeName: string;
  canEdit: boolean;
}

export function MemberProfile({ member, treeId, treeName, canEdit }: MemberProfileProps) {
  const router = useRouter();
  const colors = GENDER_COLORS[member.gender];
  const initials = `${member.firstName[0]}${member.lastName?.[0] || ""}`.toUpperCase();
  const fullName = `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`;

  const [uploadType, setUploadType] = useState<"photos" | "documents" | "audio" | null>(null);
  const [addFactOpen, setAddFactOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [profilePhotoOpen, setProfilePhotoOpen] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<string | null>(null);

  const deleteMedia = async (type: "photo" | "document" | "audio", id: string) => {
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

      toast.success("Deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingMedia(null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const genderLabel = {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    UNKNOWN: "Unknown",
  }[member.gender];

  // Combine relationships for display
  const allRelationships = [
    ...member.relationshipsFrom.map((r) => ({
      type: r.type,
      person: r.toMember,
      label: getRelationshipLabel(r.type, member.gender, r.toMember.gender),
      direction: "to" as const,
    })),
    ...member.relationshipsTo.map((r) => ({
      type: r.type,
      person: r.fromMember,
      label: getRelationshipLabel(r.type, r.fromMember.gender, member.gender),
      direction: "from" as const,
    })),
  ];

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/trees/${treeId}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {treeName}
          </Button>
        </Link>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative group mx-auto sm:mx-0">
              <Avatar
                className={`h-24 w-24 border-4 ${canEdit ? 'cursor-pointer' : ''}`}
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

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{fullName}</h1>
                  {member.nickname && (
                    <p className="text-muted-foreground">&ldquo;{member.nickname}&rdquo;</p>
                  )}
                  <Badge
                    variant="secondary"
                    className="mt-2"
                    style={{ backgroundColor: colors.background, color: colors.text }}
                  >
                    {genderLabel}
                  </Badge>
                </div>

                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setEditMemberOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {member.birthDate && (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Born {formatDate(member.birthDate)}
                      {member.birthPlace && ` in ${member.birthPlace}`}
                    </span>
                  </div>
                )}
                {member.deathDate && (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Died {formatDate(member.deathDate)}
                      {member.deathPlace && ` in ${member.deathPlace}`}
                    </span>
                  </div>
                )}
                {member.occupation && (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{member.occupation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {member.bio && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-semibold mb-2">Biography</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{member.bio}</p>
              </div>
            </>
          )}

          {/* Relationships */}
          {allRelationships.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-semibold mb-3">Relationships</h3>
                <div className="flex flex-wrap gap-2">
                  {allRelationships.map((rel, i) => (
                    <Link
                      key={i}
                      href={`/trees/${treeId}/members/${rel.person.id}`}
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        {rel.label}: {rel.person.firstName} {rel.person.lastName}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Media Tabs */}
      <Tabs defaultValue="photos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="photos" className="gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
            <Badge variant="secondary" className="ml-1">{member.photos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
            <Badge variant="secondary" className="ml-1">{member.documents.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-2">
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Audio</span>
            <Badge variant="secondary" className="ml-1">{member.audioClips.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="facts" className="gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Facts</span>
            <Badge variant="secondary" className="ml-1">{member.facts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Photos</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setUploadType("photos")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {member.photos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No photos yet
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {member.photos.map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${photo.filePath}`}
                        alt={photo.title || "Photo"}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {canEdit && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  disabled={deletingMedia === photo.id}
                                />
                              }
                            >
                              {deletingMedia === photo.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this photo? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMedia("photo", photo.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setUploadType("documents")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {member.documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No documents yet
                </p>
              ) : (
                <div className="space-y-2">
                  {member.documents.map((doc) => (
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
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMedia("document", doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
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

        <TabsContent value="audio">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Audio Clips</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setUploadType("audio")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {member.audioClips.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No audio clips yet
                </p>
              ) : (
                <div className="space-y-4">
                  {member.audioClips.map((clip) => (
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
                                <AlertDialogTitle>Delete Audio Clip</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{clip.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMedia("audio", clip.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      <audio controls className="w-full">
                        <source src={`/api/files/${clip.filePath}`} />
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Facts & Stories</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setAddFactOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fact
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {member.facts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No facts recorded yet
                </p>
              ) : (
                <div className="space-y-4">
                  {member.facts.map((fact) => (
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
                          Source: {fact.source}
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

      {/* Dialogs */}
      <MediaUploadDialog
        treeId={treeId}
        memberId={member.id}
        type={uploadType}
        open={!!uploadType}
        onOpenChange={(open) => !open && setUploadType(null)}
      />

      <AddFactDialog
        treeId={treeId}
        memberId={member.id}
        open={addFactOpen}
        onOpenChange={setAddFactOpen}
      />

      <EditMemberDialog
        member={member}
        treeId={treeId}
        open={editMemberOpen}
        onOpenChange={setEditMemberOpen}
      />

      <ProfilePhotoUpload
        treeId={treeId}
        memberId={member.id}
        memberName={fullName}
        currentPhotoPath={member.profilePicturePath}
        gender={member.gender}
        open={profilePhotoOpen}
        onOpenChange={setProfilePhotoOpen}
      />
    </div>
  );
}
