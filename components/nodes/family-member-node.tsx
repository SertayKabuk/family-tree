"use client";

import { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GENDER_COLORS } from "@/lib/tree-colors";
import { Gender } from "@prisma/client";
import { BookOpen } from "lucide-react";

export interface FamilyMemberNodeData extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName?: string | null;
  nickname?: string | null;
  gender: Gender;
  profilePicturePath?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  occupation?: string | null;
  hasStory?: boolean;
}

export type FamilyMemberNode = Node<FamilyMemberNodeData, "familyMember">;

function FamilyMemberNodeComponent({ data, selected }: NodeProps<FamilyMemberNode>) {
  const colors = GENDER_COLORS[data.gender];
  const initials = `${data.firstName[0]}${data.lastName?.[0] || ""}`.toUpperCase();
  const isDeceased = !!data.deathDate;
  const displayName = data.nickname || data.firstName;
  const verticalHandleClassName =
    "!h-5 !w-5 sm:!h-3 sm:!w-3 !bg-gray-400 !border-[3px] !border-white !shadow-sm";
  const horizontalHandleClassName =
    "!h-5 !w-5 sm:!h-3 sm:!w-3 !bg-amber-400 !border-[3px] !border-white !shadow-sm";

  const formatYear = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).getFullYear();
  };

  const birthYear = formatYear(data.birthDate);
  const deathYear = formatYear(data.deathDate);

  return (
    <>
      {/* Top handle for incoming connections (child of someone) */}
      <Handle
        type="target"
        position={Position.Top}
        className={verticalHandleClassName}
      />

      <div
        className={`
          min-w-[140px] px-4 py-3 rounded-lg shadow-md cursor-pointer
          transition-all duration-200 border-2
          ${selected ? "shadow-lg scale-105" : "hover:shadow-lg"}
          ${isDeceased ? "opacity-75" : ""}
        `}
        style={{
          backgroundColor: colors.background,
          borderColor: selected ? colors.border : "transparent",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <Avatar
            className="h-14 w-14 border-2"
            style={{ borderColor: colors.border }}
          >
            {data.profilePicturePath ? (
              <AvatarImage
                src={`/api/files/${data.profilePicturePath}`}
                alt={displayName}
              />
            ) : null}
            <AvatarFallback
              style={{
                backgroundColor: colors.border,
                color: "white",
              }}
              className="text-lg font-semibold"
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <p
              className="font-semibold text-sm"
              style={{ color: colors.text }}
            >
              {displayName}
              {data.lastName && (
                <span className="font-normal"> {data.lastName}</span>
              )}
            </p>

            {(birthYear || deathYear) && (
              <p
                className="text-xs mt-0.5"
                style={{ color: colors.text, opacity: 0.7 }}
              >
                {birthYear || "?"}
                {isDeceased && ` - ${deathYear || "?"}`}
              </p>
            )}

            {data.occupation && (
              <p
                className="text-xs mt-1 truncate max-w-[120px]"
                style={{ color: colors.text, opacity: 0.6 }}
              >
                {data.occupation}
              </p>
            )}

            {data.hasStory && (
              <div
                className="mt-1 flex items-center gap-1"
                style={{ color: colors.text, opacity: 0.5 }}
              >
                <BookOpen className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom handle for outgoing connections (parent of someone) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={verticalHandleClassName}
      />

      {/* Left handles for spouse/sibling connections (both directions) */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={horizontalHandleClassName}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={horizontalHandleClassName}
      />

      {/* Right handles for spouse/sibling connections (both directions) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={horizontalHandleClassName}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={horizontalHandleClassName}
      />
    </>
  );
}

export const FamilyMemberNode = memo(FamilyMemberNodeComponent);
