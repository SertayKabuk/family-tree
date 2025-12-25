# Family Tree Application - Copilot Instructions

## Architecture Overview

This is a **Next.js 16 App Router** application for managing family trees with interactive graph visualization. Key technologies:
- **Auth**: NextAuth v5 (Auth.js) with Google OAuth + Prisma adapter, JWT sessions
- **Database**: PostgreSQL via Prisma ORM with `@prisma/adapter-pg` driver
- **Visualization**: React Flow (`@xyflow/react`) with ELK.js for auto-layout
- **UI**: shadcn/ui (base-vega style) + Tailwind CSS v4 + Lucide icons
- **Validation**: Zod schemas for API input validation

## Project Structure Conventions

### Route Groups & API Pattern
- `app/(protected)/` - Authenticated routes; layout checks session and redirects to `/login`
- `app/api/trees/[treeId]/` - RESTful API following pattern: `GET` (view), `POST` (create), `PATCH` (update), `DELETE`
- API routes use `requirePermission(treeId, "view"|"edit"|"delete"|"manage_members"|"invite")` from [lib/permissions.ts](lib/permissions.ts)

### Component Organization
```
components/
├── ui/           # shadcn primitives (don't modify directly)
├── nodes/        # React Flow node components
├── edges/        # React Flow edge components  
├── tree/         # Tree-specific features (canvas, dialogs, toolbars)
├── members/      # Family member profile components
├── dashboard/    # Dashboard page components
└── layout/       # App shell (header, etc.)
```

### Data Models (see [prisma/schema.prisma](prisma/schema.prisma))
- `FamilyTree` → has many `FamilyMember` → has many `Relationship`, `Photo`, `Document`, `AudioClip`, `Fact`
- Relationships are directional: `fromMember` → `toMember` with `RelationshipType` enum
- Role-based access: `OWNER` > `EDITOR` > `VIEWER` via `TreeMembership`

## Key Patterns

### Permission Checking
```typescript
// In API routes - throws "Unauthorized" or "Forbidden" errors
await requirePermission(treeId, "edit");

// In components - use getTreePermissions() for conditional UI
const { hasAccess, permissions } = await getTreePermissions(treeId);
```

### API Route Handler Structure
All API routes follow this error handling pattern (see [app/api/trees/[treeId]/route.ts](app/api/trees/[treeId]/route.ts)):
```typescript
try {
  const { treeId } = await params; // Next.js 16: params is Promise
  await requirePermission(treeId, "edit");
  const parsed = schema.safeParse(body);
  // ... business logic
} catch (error) {
  if (error instanceof Error) {
    if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
```

### React Flow Integration
- Custom nodes extend `FamilyMemberNode` type with `FamilyMemberNodeData` interface
- Gender-based styling via `GENDER_COLORS` from [lib/tree-colors.ts](lib/tree-colors.ts)
- Layout computed via ELK.js in [lib/tree-layout.ts](lib/tree-layout.ts)

### File Uploads
- Stored locally in `./uploads/{treeId}/{memberId}/{type}/`
- Served via `/api/files/[...path]` route
- Use `uploadFile()` from [lib/storage.ts](lib/storage.ts)

## Developer Workflow

### Setup
```bash
docker compose up -d          # Start PostgreSQL
npx prisma migrate dev        # Run migrations
npm run dev                   # Start dev server
```

### Environment Variables Required
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/familytree
AUTH_GOOGLE_ID=<google-client-id>
AUTH_GOOGLE_SECRET=<google-client-secret>
AUTH_SECRET=<random-secret>
```

### Adding UI Components
```bash
npx shadcn@latest add <component-name>  # Uses base-vega style from components.json
```

## Important Notes

- **Next.js 16**: Route params are async - always `await params` in API routes
- **Prisma**: Uses pg adapter with connection pooling; client is singleton in [lib/prisma.ts](lib/prisma.ts)
- **Dates**: Stored as `DateTime` in Prisma, serialized as ISO strings in API responses
- **Imports**: Use `@/` path alias for all imports from project root

### Base UI Components (NOT Radix)
This project uses **@base-ui/react** components (base-vega style), NOT Radix UI. Key difference:

- ❌ **Do NOT use `asChild` prop** - this is a Radix pattern that doesn't exist in base-ui
- ✅ **Use `render` prop instead** to customize the rendered element

```typescript
// ❌ WRONG - Radix pattern (will cause TypeScript errors)
<AlertDialogTrigger asChild>
  <Button variant="destructive">Delete</Button>
</AlertDialogTrigger>

// ✅ CORRECT - Base UI pattern
<AlertDialogTrigger render={<Button variant="destructive" />}>
  Delete
</AlertDialogTrigger>

// ✅ CORRECT - With dynamic props
<AlertDialogTrigger
  render={
    <Button
      variant="outline"
      className="w-full"
      disabled={loading}
    />
  }
>
  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
  Delete Item
</AlertDialogTrigger>
```

This applies to: `AlertDialogTrigger`, `DialogTrigger`, `DropdownMenuTrigger`, `TooltipTrigger`, etc.
