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

**Important Build Configuration**: The build process intentionally ignores TypeScript and ESLint errors for rapid development:
- Environment variables: `NEXT_IGNORE_ESLINT=1` and `NEXT_IGNORE_TYPE_CHECK=1` in `package.json`
- Next.js config: `ignoreDuringBuilds: true` and `ignoreBuildErrors: true` in `next.config.ts`
- This applies to both local builds and production builds
- Use `npm run lint` separately to check for linting issues during development

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

**TypeScript Configuration**: Path alias `@/*` maps to `./src/*` for cleaner imports. Additional aliases configured in `components.json`:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/ui` → `src/components/ui`
- `@/hooks` → `src/hooks`
- `@/utils` → `src/lib/utils`

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Super admin dashboard (requires super_admin privileges)
│   ├── api/admin/         # Admin API routes (protected, server-side)
│   ├── auth/              # Authentication pages (login, signup, forgot-password)
│   ├── blocks/            # Block management
│   ├── dashboard/         # Main dashboard
│   ├── field-entry/       # Mobile-optimized field data entry form
│   ├── my-piles/          # Pile management
│   ├── notes/             # Project notes
│   ├── production/        # Production tracking and reporting
│   ├── project-setup/     # New project creation
│   ├── settings/          # User/project settings
│   ├── sop/               # Standard Operating Procedure guide
│   ├── zones/             # Pile type analysis (formerly zones)
│   ├── icon.tsx           # App favicon (edge runtime)
│   ├── layout.tsx         # Root layout with provider wrapping
│   └── page.tsx           # Landing/home page
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components
│   ├── CollapsibleSidebar.tsx      # Collapsible sidebar with hover expansion
│   ├── CSVUploadModal.tsx          # Pile data CSV import
│   ├── DeleteAllPilesButton.tsx    # Bulk delete functionality
│   ├── EditPileModal.tsx           # Edit existing pile
│   ├── FieldEntryQRCode.tsx        # QR code for mobile field entry
│   ├── ManualPileModal.tsx         # Manual pile entry
│   ├── NavigationProgress.tsx      # Page navigation indicator
│   ├── PileLookupUploadModal.tsx   # Pile plot plan import
│   ├── PreliminaryProductionUploadModal.tsx  # Preliminary production data import
│   ├── ProjectSelector.tsx         # Project switching dropdown
│   └── WeatherWidget.tsx           # Weather display component
├── context/              # React Context providers
│   ├── AuthContext.tsx        # User authentication state
│   ├── ThemeContext.tsx       # Light/dark theme switching
│   └── AccountTypeContext.tsx # User role/permissions
└── lib/                  # Utility libraries
    ├── supabase.ts       # Supabase client
    ├── adminService.ts   # Admin API client
    ├── emailService.ts   # Email service abstraction
    ├── pdfExport.ts      # PDF export utilities
    ├── weatherService.ts # Weather API integration
    └── utils.ts          # Helper utilities
```

### Database Schema
Main tables in Supabase:
- `projects` - Project information with `embedment_tolerance` field
- `user_projects` - User-project relationships with role-based access (Owner, Admin, Rep)
- `piles` - Pile tracking data with embedment/refusal fields, status tracking, `block` field for grouping, `pile_type` field for categorization, `published` flag for data safeguarding, and `is_manual_entry` flag for manual vs CSV entry tracking
- `preliminary_production` - **Isolated** preliminary production data for GPS/PD10 exports (completely separate from piles table, only visible on Production page Preliminary tab)
- `pile_lookup` - Pile plot plan data for tracking expected piles per type
- `pile_activities` - Activity history for pile operations
- `project_invitations` - Invitation tracking with token-based security and 7-day expiration

Key database functions:
- `accept_project_invitation(token, user_id)` - Handles invitation acceptance and auto-adds user to project
- `expire_old_invitations()` - Automatically marks expired invitations
- `update_updated_at()` - Trigger function for automatic timestamp updates

Database setup files (in root directory):
- `db_setup.sql` - Main schema with RLS policies (run first)
- `db_migration_*.sql` - Feature migrations (invitations, weather, super admin, etc.)
- `db_*_ROLLBACK.sql` - Rollback scripts for safe migration reversal
- Run migrations in Supabase SQL Editor in order; check file comments for dependencies

**Important**: All tables use Row Level Security (RLS). Users can only access data for projects they're associated with via `user_projects` table.

**Weather System Tables**:
- `weather_data` - Cached weather data by project and date to minimize API calls
- Projects table includes `location_lat` and `location_lng` for precise weather lookups
- Piles table includes weather reference columns for installation conditions

**Performance Note**: The blocks and zones pages load all pile data in parallel (pages of 1000), then process statistics in-memory. This avoids making separate database queries for each block/zone, which was causing significant performance issues. All filtering for Owner's Rep accounts (`published = true`) is applied during the initial data load.

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

### MCP Integration
The project includes Supabase MCP (Model Context Protocol) server configuration in `.mcp.json` for enhanced AI-assisted development workflows.

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
- Advanced pattern extraction features:
  - Character position extraction (substring by start/end index)
  - Regex pattern matching for complex string extraction
  - Available for Pile ID and Block fields
  - Live preview of extracted results
- Row-by-row error handling with detailed feedback
- Supports bulk pile data import with validation
- Allows duplicate piles by design (tracked in pile_activities)
- Additional upload modals:
  - `PileLookupUploadModal.tsx` for pile plot plan data (accessed via Settings page)
  - `ManualPileModal.tsx`, `EditPileModal.tsx` for manual pile entry/editing

### Authentication Flow
- Supabase Auth with email/password
- Forgot password functionality at `/auth/forgot-password`
- Protected routes using middleware
- Context providers wrap entire app in `src/app/layout.tsx` in this order:
  1. `AuthProvider` - Manages user authentication state and Supabase session
  2. `AccountTypeProvider` - Tracks user account type/role
  3. `ThemeProvider` - Handles light/dark theme switching
- Global UI components in layout: `LoadingIndicator` (page loading state), `NavigationEvents` (route change handling), `Toaster` (toast notifications via Sonner)
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

### Field Entry System
- Page at `src/app/field-entry/page.tsx` for mobile-optimized data entry
- Designed for field inspectors to quickly enter pile data on mobile devices
- QR code generation via `FieldEntryQRCode.tsx` component for easy mobile access
- Accessed via URL parameter: `/field-entry?project={projectId}`
- Supports all pile fields including inspector name, times, embedment, and notes
- Form auto-populates with sensible defaults (today's date, pending status)
- Real-time form validation with immediate feedback

### Production Tracking System
- Page at `src/app/production/page.tsx` for machine-level production analytics
- **Dual-tab system** with URL persistence (`?tab=actual` or `?tab=preliminary`):
  - **Actual Production Tab**: Uses data from main `piles` table - shows Overview, All Machines, and Performance Issues sub-tabs
  - **Preliminary Data Tab**: Uses data from isolated `preliminary_production` table - for early productivity tracking before complete engineer data is available
- Groups piles by machine/rig to track individual machine performance
- Features:
  - Overview tab with aggregate statistics and charts
  - Per-machine metrics: piles installed, refusal/tolerance rates, average drive time
  - Date range filtering for production periods
  - Daily/weekly production trend charts using Recharts
  - Export to Excel (XLSX) for reporting
  - Preliminary production data upload via `PreliminaryProductionUploadModal.tsx` (uploads to separate table)
  - Individual and bulk delete for preliminary records
- Tracks: total piles per machine, piles per block, piles per date, average embedment
- Uses same status classification as blocks (Accepted/Tolerance/Refusal/Pending)
- **Preliminary data is completely isolated** - does NOT appear in Dashboard, My Piles, Blocks, or Zones

### Standard Operating Procedure (SOP)
- Page at `src/app/sop/page.tsx` provides a comprehensive user guide
- Step-by-step workflow documentation for new users
- Detailed explanations of each page and feature
- Best practices for data management and project setup
- Visual guide with color-coded sections and navigation
- Content is restricted for Owner's Rep accounts - they see a message directing them to contact their EPC for the SOP

### Publication Workflow
- **Purpose**: Data safeguarding system allowing EPC users to review pile data before making it visible to Owner's Rep accounts
- **Database field**: `published` boolean column in `piles` table (defaults to false)
- **EPC users** (canEdit = true):
  - See all piles (published and unpublished)
  - New piles start as unpublished (manual entry or CSV import)
  - "Publish Data" button appears in My Piles page when unpublished piles exist
  - Publishing makes all unpublished piles visible to Owner's Reps at once
- **Owner's Rep accounts** (canEdit = false):
  - Only see published piles across all pages
  - Unpublished data is completely hidden
  - Real-time unpublished pile count shown in dashboard for EPC users
- **Implementation**: Filters applied in My Piles, Dashboard, Blocks, and Zones pages
- **No unpublish feature**: Once published, piles remain published (one-way operation)

### Super Admin System
- **Purpose**: System-wide administrative capabilities beyond project-level permissions
- **Database table**: `super_admins` table tracks users with elevated privileges
- **Admin page**: `src/app/admin/page.tsx` - Dashboard for super admin operations
- **Admin service**: `src/lib/adminService.ts` - Client-side API wrapper
- **API routes**: Protected server-side routes at `src/app/api/admin/`:
  - `check-super-admin/` - Verify super admin status
  - `list-users/` - List all users with pagination
  - `list-projects/` - List all projects
  - `create-user/` - Create new user accounts
  - `create-project/` - Create new projects
  - `assign-user-to-project/` - Add user to project with role
  - `remove-user-from-project/` - Remove user from project
  - `grant-super-admin/` - Grant super admin privileges
  - `revoke-super-admin/` - Revoke super admin privileges
- **Migration approach**: Multi-step migration process with rollback capability
  - Step 1: Creates `super_admins` table with RLS policies
  - Step 2: Modifies project RLS policies to grant super admins access
  - Step 3: Updates user_projects policies for super admin privileges
- **Safe deployment**: Each step includes rollback SQL for safe migration reversal

### Weather Tracking System
- **Purpose**: Automatically track weather conditions for pile installation dates
- **API**: Open-Meteo (free, no API key required, historical data available)
- **Database components**:
  - `weather_data` table caches weather by project/date to minimize API calls
  - Projects table: `location_lat`, `location_lng` fields for weather lookups
  - Piles table: weather reference columns for installation conditions
- **Features**:
  - Geocoding support via Nominatim (OpenStreetMap) - converts addresses to coordinates
  - Current weather widget for dashboard
  - Historical weather lookup for any date
  - Automatic weather association with pile installations
  - Weather data includes: temperature, conditions, precipitation, wind, humidity
- **Configuration**: Settings page → Project Info → Weather Location Configuration
- **Service**: `src/lib/weatherService.ts` handles all weather API interactions
- **Component**: `src/components/WeatherWidget.tsx` for displaying weather data

## Development Guidelines

### Excel Template Generation
The `generate-pile-tracker-excel.js` script generates professionally formatted Excel templates for pile tracking data:
- Uses ExcelJS library for advanced formatting
- Creates multi-sheet workbooks with Configuration and Pile Data sheets
- Run with: `node generate-pile-tracker-excel.js`
- Output: `PileTrackerPro_Template.xlsx`

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
- Install shadcn components: `npx shadcn@latest add [component]`
- Icon library: Lucide React (configured in `components.json`)

### State Management
- Use React Context for global state (auth, theme, account type)
- React Hook Form for form state
- Supabase real-time subscriptions for data sync

### Database Operations
- All database calls through `src/lib/supabase.ts`
- Row Level Security (RLS) enabled on all tables
- Use typed responses from Supabase
- Database functions for complex operations

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

### Uploading Pile Data
1. **Pile Plot Plan (Lookup)**: Settings page → Pile Plot Plan Upload section → Upload Pile Lookup button
2. **Pile Installation Data**: My Piles page → CSV Upload button
3. Both uploads support intelligent column mapping with auto-detection
4. Pile data CSV upload includes advanced pattern extraction:
   - Character position extraction for fixed-position substrings
   - Regex pattern matching for complex string patterns
   - Available for Pile ID and Block columns
   - Live preview shows extracted result before upload

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

### Code Practices
- Client components must use `"use client"` directive when using hooks or browser APIs
- All pages that require authentication should check for valid session (see existing pages for patterns)
- When working with RLS-protected tables, remember users can only see data for projects in their `user_projects` associations
- **Data filtering for Owner's Rep accounts**: When querying piles, always filter by `published = true` for users with `canEdit = false`. This applies to all pile queries in Dashboard, My Piles, Blocks, and Zones pages.
- Use `useSearchParams()` within a Suspense boundary to avoid production build issues
- Import paths use `@/*` alias for `src/*` (e.g., `import { supabase } from '@/lib/supabase'`)

### Build Configuration
- Next.js config (`next.config.ts`) intentionally ignores ESLint and TypeScript errors during builds
- Both `npm run build` and the Next.js config have error ignoring enabled for rapid development
- Typed routes are experimental and enabled in Next.js config

### Icon and Favicon
- App icon defined in `src/app/icon.tsx` using edge runtime
- Exports a single ImageResponse component for favicon generation
- Edge runtime required for Next.js 15 icon generation

### Navigation and UI Layout
- Collapsible sidebar navigation with hover expansion to maximize viewport space
- Sidebar component at `src/components/CollapsibleSidebar.tsx`
- Consistent UI sizing and spacing standards across all pages
- Mobile-responsive design with optimized layouts for field data entry
