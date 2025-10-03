# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PileTrackerPro is a construction pile tracking application built with Next.js 15, React 19, TypeScript, and Supabase. It manages pile installation data for construction projects with real-time updates, comprehensive reporting, and a sophisticated invitation system for team collaboration.

## Development Commands

```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production (ignores ESLint & TypeScript errors)
npm run start        # Start production server
npm run lint         # Run ESLint checks
```

Note: The build process intentionally ignores TypeScript and ESLint errors (`NEXT_IGNORE_ESLINT=1 NEXT_IGNORE_TYPE_CHECK=1`) for rapid development.

## Architecture

### Tech Stack
- **Next.js 15.3.3** with App Router and experimental typed routes
- **React 19** with TypeScript 5
- **Supabase** for backend (database, auth, real-time, edge functions)
- **Tailwind CSS 4** with custom theme
- **shadcn/ui** components (New York style)
- **React Hook Form + Zod** for forms and validation
- **Framer Motion** for animations
- **Recharts** for data visualization
- **jsPDF + jsPDF-AutoTable** for PDF export
- **XLSX** for Excel export

**TypeScript Configuration**: Path alias `@/*` maps to `./src/*` for cleaner imports

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages (login, signup, forgot-password)
│   ├── dashboard/         # Main dashboard
│   ├── my-piles/          # Pile management
│   ├── zones/             # Pile type analysis (formerly zones)
│   ├── notes/             # Project notes
│   ├── blocks/            # Block management
│   ├── settings/          # User/project settings
│   ├── project-setup/     # New project creation
│   └── icon.tsx           # App favicon (edge runtime)
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components
│   ├── CSVUploadModal.tsx
│   ├── PileLookupUploadModal.tsx
│   ├── ManualPileModal.tsx
│   ├── EditPileModal.tsx
│   ├── ProjectSelector.tsx
│   ├── DeleteAllPilesButton.tsx
│   └── NavigationProgress.tsx
├── context/              # React Context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── AccountTypeContext.tsx
└── lib/                  # Utility libraries
    ├── supabase.ts       # Supabase client
    ├── emailService.ts   # Email service abstraction
    └── utils.ts          # Helper utilities
```

### Database Schema
Main tables in Supabase:
- `projects` - Project information with `embedment_tolerance` field
- `user_projects` - User-project relationships with role-based access (Owner, Admin, Rep)
- `piles` - Pile tracking data with embedment/refusal fields, status tracking, `block` field for grouping, and `pile_type` field for categorization
- `pile_lookup` - Pile plot plan data for tracking expected piles per type
- `pile_activities` - Activity history for pile operations
- `project_invitations` - Invitation tracking with token-based security and 7-day expiration

Key database functions:
- `accept_project_invitation(token, user_id)` - Handles invitation acceptance and auto-adds user to project
- `expire_old_invitations()` - Automatically marks expired invitations
- `update_updated_at()` - Trigger function for automatic timestamp updates

Database setup files:
1. `db_setup.sql` - Main schema with RLS policies
2. `db_migration_pile_columns.sql` - Column migrations
3. `db_migration_embedment_tolerance.sql` - Tolerance fields
4. `db_migration_invitations.sql` - Invitation system with token security
5. `db_email_trigger.sql` - Email trigger system
6. `supabase-rls-fix.sql` - Row Level Security fixes
7. `db_performance_indexes.sql` - Performance optimization indexes
8. `db_migration_pile_lookup_table.sql` - Pile lookup table migration
9. `db_migration_zone_to_pile_type.sql` - Zone to pile type migration
10. `db_migration_add_pile_location.sql` - Pile location field
11. `db_migration_remove_pile_unique_constraint.sql` - Allow duplicate pile names
12. `db_migration_combined_piles.sql` - Combined pile data migrations
13. `db_create_statistics_function.sql` - Statistics calculation function
14. `db_fix_project_insert_policy.sql` - Project creation RLS fixes

**Important**: All tables use Row Level Security (RLS). Users can only access data for projects they're associated with via `user_projects` table. When querying blocks, use separate count queries per block for accuracy rather than filtering in-memory.

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Service (choose one):
NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=your_key      # Option 1: Web3Forms (no signup required)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id # Option 2: EmailJS
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
RESEND_API_KEY=your_resend_key                 # Option 3: Resend (production)
```

## Key Features & Implementation Details

### Invitation System
- Multi-service email architecture with fallbacks:
  1. Web3Forms (simplest - no signup)
  2. EmailJS (client-side with templates)
  3. Resend via Supabase Edge Functions (production-ready)
- Token-based security with 7-day expiration
- Database function: `accept_project_invitation()`
- Edge function: `supabase/functions/send-invitation-email/`
- Professional HTML email templates with branded styling
- Automatic user onboarding for invited users

### CSV Upload System
- Located in `src/components/CSVUploadModal.tsx`
- Intelligent column mapping with automatic detection
- Row-by-row error handling with detailed feedback
- Supports bulk pile data import with validation
- Allows duplicate piles by design (tracked in pile_activities)
- Additional upload modals:
  - `PileLookupUploadModal.tsx` for pile plot plan data (expected piles per type)
  - `ManualPileModal.tsx`, `EditPileModal.tsx` for manual pile entry/editing

### Authentication Flow
- Supabase Auth with email/password
- Forgot password functionality at `/auth/forgot-password`
- Protected routes using middleware
- Context providers wrap entire app in `src/app/layout.tsx` in this order:
  1. `AuthProvider` - Manages user authentication state and Supabase session
  2. `AccountTypeProvider` - Tracks user account type/role
  3. `ThemeProvider` - Handles light/dark theme switching
- Authentication state is available throughout the app via `useAuth()` hook
- All authenticated routes check for valid session before rendering

### Project Management
- Multi-project support with role-based access (Owner, Rep, Admin)
- Project switching via `ProjectSelector.tsx`
- Real-time data synchronization across users
- Invitation-based team management

### Data Operations
- Bulk delete functionality in `DeleteAllPilesButton.tsx`
- Delete lower duplicates feature for data cleanup
- Export capabilities for reporting:
  - XLSX format using `xlsx` library
  - PDF export using `jspdf` and `jspdf-autotable`
- Data visualization with Recharts and `react-circular-progressbar`
- Navigation progress indicators via `NavigationProgress.tsx` using `nprogress`

### Block Management System
- Page at `src/app/blocks/page.tsx` for analyzing piles grouped by block
- Tracks refusal, tolerance, and slow drive time metrics per block
- Uses circular progress indicators to visualize block performance
- Key metric: embedment tolerance (configurable per project, defaults to 1 ft)
- Status classification:
  - **Accepted**: Embedment ≥ design embedment
  - **Tolerance**: Design embedment - tolerance ≤ embedment < design embedment
  - **Refusal**: Embedment < design embedment - tolerance
  - **Pending**: Missing embedment data
- Block counting requires separate database count queries for accuracy (not in-memory filtering)

### Pile Type Analysis System
- Page at `src/app/zones/page.tsx` for analyzing piles grouped by pile type (previously called "zones")
- Similar to block management but groups by `pile_type` field instead of `block`
- Compares installed piles against expected totals from `pile_lookup` table (pile plot plan)
- Tracks same metrics as block system: refusal, tolerance, slow drive time
- Supports "Uncategorized" type for piles without a pile_type assigned
- Uses separate database count queries per pile type for RLS accuracy

## Development Guidelines

### Working with Supabase Edge Functions
```bash
# Located in supabase/functions/
# Uses Deno runtime
# Deploy via Supabase CLI or dashboard
```

### Email Service Implementation
- Primary service: `src/lib/emailService.ts`
- Fallback chain: Web3Forms → EmailJS → Resend
- Test invitation system: `test-invitation.js`
- HTML template: `public/test-invitation.html`

### Component Creation
- Use existing shadcn/ui components from `src/components/ui/`
- Follow the New York style configuration in `components.json`
- Maintain consistent naming patterns (PascalCase for components)

### State Management
- Use React Context for global state (auth, theme, account type)
- React Hook Form for form state
- Supabase real-time subscriptions for data sync

### Database Operations
- All database calls through `src/lib/supabase.ts`
- Row Level Security (RLS) enabled on all tables
- Use typed responses from Supabase
- Database functions for complex operations

## Testing Approach
No test framework is currently configured. Manual testing through the development server is the primary approach. Test files available:
- `test-invitation.js` - Invitation system testing
- `test-invitation-system.md` - Testing documentation

## Common Tasks

### Adding a New Page
1. Create directory in `src/app/`
2. Add `page.tsx` with proper authentication checks (check existing pages for patterns)
3. Use existing layout patterns from other pages
4. Ensure the page respects project context if needed

### Setting Up Email Service
1. Choose a service (Web3Forms recommended for quick start)
2. Add environment variables to `.env.local`
3. Test with `node test-invitation.js`
4. See `EMAIL_SETUP.md` and `INVITATION_SETUP.md` for detailed setup

### Modifying Database Schema
1. Create or update SQL files in root directory
2. Run migrations in Supabase SQL Editor
3. Update TypeScript types if needed
4. Verify RLS policies are properly configured
5. Test with sample data to ensure policies work correctly

### Adding New Components
1. Check if shadcn/ui has the component: `npx shadcn@latest add [component]`
2. If creating custom component, place in `src/components/` following existing patterns
3. Use Tailwind classes and maintain dark mode support via theme variables
4. Components should be client-side (`"use client"`) if they use hooks or interactivity

### Working with Invitations
1. Admin/Owner users can invite via Settings → Team Management
2. Invitations expire after 7 days
3. Accepted invitations automatically assign user to project via `accept_project_invitation()` function
4. Email service must be configured for automatic sending (otherwise link is copied to clipboard)

### Deploying Supabase Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set required secrets
supabase secrets set RESEND_API_KEY=your_key

# Deploy specific function
supabase functions deploy send-invitation-email

# View logs
supabase functions logs send-invitation-email
```

## Important Development Reminders

### File Operations
- **ALWAYS prefer editing existing files** over creating new ones
- **NEVER proactively create documentation files** (*.md) or README files unless explicitly requested
- Only create new files when absolutely necessary for the task at hand

### Code Practices
- Client components must use `"use client"` directive when using hooks or browser APIs
- All pages that require authentication should check for valid session (see existing pages for patterns)
- When working with RLS-protected tables, remember users can only see data for projects in their `user_projects` associations
- Use `useSearchParams()` within a Suspense boundary to avoid production build issues
- Import paths use `@/*` alias for `src/*` (e.g., `import { supabase } from '@/lib/supabase'`)

### Build Configuration
- Next.js config (`next.config.ts`) intentionally ignores ESLint and TypeScript errors during builds
- Both `npm run build` and the Next.js config have error ignoring enabled for rapid development
- Typed routes are experimental and enabled in Next.js config