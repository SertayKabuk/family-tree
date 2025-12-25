# Family Tree

A modern family tree application with interactive graph visualization, built with Next.js 16 and React Flow.

## Features

- 🌳 **Interactive Family Trees** - Create and visualize family relationships with drag-and-drop nodes
- 👥 **Family Member Profiles** - Store detailed information including photos, documents, audio clips, and facts
- 🔗 **Relationship Mapping** - Define various relationship types (parent-child, spouse, siblings, etc.)
- 👤 **Google OAuth Authentication** - Secure sign-in with NextAuth v5
- 🤝 **Collaboration** - Invite others to view or edit your family trees with role-based permissions
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Authentication**: [NextAuth v5](https://authjs.dev) (Auth.js) with Google OAuth
- **Database**: PostgreSQL with [Prisma ORM](https://prisma.io)
- **Visualization**: [React Flow](https://reactflow.dev) with [ELK.js](https://github.com/kieler/elkjs) auto-layout
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) (base-ui) + [Tailwind CSS v4](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Validation**: [Zod](https://zod.dev)

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- Google OAuth credentials

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd family-tree
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/familytree
   AUTH_GOOGLE_ID=<your-google-client-id>
   AUTH_GOOGLE_SECRET=<your-google-client-secret>
   AUTH_SECRET=<random-secret-string>
   ```

4. **Start the database**
   ```bash
   docker compose up -d
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── (protected)/          # Authenticated routes
│   ├── dashboard/        # User dashboard
│   └── trees/[treeId]/   # Family tree views
├── api/                  # API routes
│   └── trees/            # Tree CRUD operations
├── login/                # Authentication page
└── invite/               # Invitation handling

components/
├── ui/                   # shadcn/ui primitives
├── nodes/                # React Flow node components
├── edges/                # React Flow edge components
├── tree/                 # Tree-specific features
├── members/              # Family member components
├── dashboard/            # Dashboard components
└── layout/               # App shell components

lib/                      # Utilities and helpers
prisma/                   # Database schema and migrations
```

## Data Models

- **FamilyTree** - A collection of family members and their relationships
- **FamilyMember** - Individual person with profile info, dates, and media
- **Relationship** - Directional connections between members (parent-child, spouse, sibling, etc.)
- **TreeMembership** - Role-based access control (Owner, Editor, Viewer)

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Adding UI Components

This project uses shadcn/ui with the base-vega style:

```bash
npx shadcn@latest add <component-name>
```

## License

MIT
