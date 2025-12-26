# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family tree application with interactive graph visualization. Built with Next.js 16 App Router, React 19, PostgreSQL, and React Flow.

## Commands

```bash
pnpm dev                  # Start dev server
pnpm build                # Production build
pnpm lint                 # ESLint
pnpm prisma migrate dev   # Run migrations
pnpm prisma studio        # Database GUI
docker compose up -d      # Start PostgreSQL
pnpm dlx shadcn@latest add <component>  # Add UI component (uses base-vega style)
```

## Architecture

### Tech Stack
- **Next.js 16** with App Router (route params are async - always `await params`)
- **React 19** with React Compiler
- **Prisma 7** with `@prisma/adapter-pg` driver adapter
- **NextAuth v5** (Auth.js) with Google OAuth, JWT sessions
- **React Flow** (`@xyflow/react`) with ELK.js auto-layout
- **shadcn/ui** with **@base-ui/react** (base-vega style) + Tailwind CSS v4

### Route Structure
- `app/(protected)/` - Authenticated routes (layout redirects to `/login` if no session)
- `app/api/trees/[treeId]/` - RESTful API with permission checks

### Permission System
```typescript
// API routes - throws "Unauthorized" or "Forbidden"
await requirePermission(treeId, "view" | "edit" | "delete" | "manage_members" | "invite");

// Components - for conditional UI
const { hasAccess, permissions, role } = await getTreePermissions(treeId);
```

Roles: `OWNER` > `EDITOR` > `VIEWER` (see `lib/permissions.ts`)

### Data Models (prisma/schema.prisma)
- `FamilyTree` → `FamilyMember` → `Relationship`, `Photo`, `Document`, `AudioClip`, `Fact`
- Relationships are directional: `fromMember` → `toMember` with `RelationshipType` enum
- Access control via `TreeMembership` with `MemberRole`

### File Uploads
- Stored in `./uploads/{treeId}/{memberId}/{type}/`
- Served via `/api/files/[...path]` route
- Use `uploadFile()` from `lib/storage.ts`

## Base UI Components (NOT Radix)

This project uses **@base-ui/react**, NOT Radix UI. Key difference:

```typescript
// ❌ WRONG - Radix pattern (causes TypeScript errors)
<AlertDialogTrigger asChild>
  <Button>Delete</Button>
</AlertDialogTrigger>

// ✅ CORRECT - Base UI render prop pattern
<AlertDialogTrigger render={<Button variant="destructive" />}>
  Delete
</AlertDialogTrigger>

// ✅ For Link + Button, wrap Link around Button
<Link href="/dashboard">
  <Button>Go to Dashboard</Button>
</Link>
```

This applies to: `AlertDialogTrigger`, `DialogTrigger`, `DropdownMenuTrigger`, `TooltipTrigger`, etc.

## API Route Pattern

```typescript
export async function PATCH(request: Request, { params }: { params: Promise<{ treeId: string }> }) {
  try {
    const { treeId } = await params;  // Next.js 16: params is Promise
    await requirePermission(treeId, "edit");
    const body = await request.json();
    const parsed = schema.safeParse(body);
    // ... business logic
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## Environment Variables

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/familytree
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
AUTH_SECRET=<random-secret>
```
