"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, LayoutGrid, ZoomIn, ZoomOut } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

interface TreeToolbarProps {
  onAddMember: () => void;
  onAutoLayout: () => void;
}

export function TreeToolbar({ onAddMember, onAutoLayout }: TreeToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <TooltipProvider>
      <Card className="absolute left-4 top-4 z-10 flex flex-col gap-1 p-1.5 bg-background/95 backdrop-blur-sm shadow-lg">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-9 w-9" onClick={onAddMember} />}
          >
            <UserPlus className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Add Family Member</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-9 w-9" onClick={onAutoLayout} />}
          >
            <LayoutGrid className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Auto-arrange Layout</TooltipContent>
        </Tooltip>

        <div className="h-px bg-border my-1" />

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => zoomIn()} />}
          >
            <ZoomIn className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => zoomOut()} />}
          >
            <ZoomOut className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Zoom Out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => fitView({ padding: 0.2 })} />}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </TooltipTrigger>
          <TooltipContent side="right">Fit to View</TooltipContent>
        </Tooltip>
      </Card>
    </TooltipProvider>
  );
}
