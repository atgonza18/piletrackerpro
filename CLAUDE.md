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

**Build Configuration**: The build intentionally ignores TypeScript and ESLint errors (`ignoreDuringBuilds: true` in `next.config.ts`). Use `npm run lint` separately during development.

## Architecture

### Tech Stack
- **Next.js 15** with App Router and typed routes
- **React 19** with TypeScript 5
- **Supabase** for backend (database, auth, real-time, edge functions)
- **Tailwind CSS 4** with custom theme
- **shadcn/ui** components (New York style, Lucide icons)
- **React Hook Form + Zod** for forms and validation
- **Mapbox GL + deck.gl** for heatmap visualization
- **Recharts** for data visualization
- **jsPDF + ExcelJS/XLSX** for PDF and Excel export

**TypeScript Configuration**: Path alias `@/*` maps to `./src/*` (e.g., `import { supabase } from '@/lib/supabase'`).

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Super admin dashboard
│   ├── api/admin/         # Admin API routes (protected, server-side)
│   ├── auth/              # Authentication pages
│   ├── blocks/            # Block management
│   ├── dashboard/         # Main dashboard
│   ├── field-entry/       # Mobile-optimized field data entry
│   ├── heatmap/           # Pile heatmap visualization
│   ├── my-piles/          # Pile management
│   ├── production/        # Production tracking (actual & preliminary tabs)
│   ├── settings/          # User/project settings
│   ├── zones/             # Pile type analysis
│   └── layout.tsx         # Root layout with provider wrapping
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components (CSV upload, modals, etc.)
├── context/              # React Context providers
│   ├── AuthContext.tsx        # User authentication state
│   ├── ThemeContext.tsx       # Light/dark theme
│   └── AccountTypeContext.tsx # User role/permissions
└── lib/                  # Utility libraries
    ├── supabase.ts            # Supabase client
    ├── coordinateService.ts   # Coordinate system transformations
    └── ...                    # Services (admin, email, weather, PDF export)
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

Database setup files are in the root directory (`db_*.sql`). Key files:
- `db_setup.sql` - Main schema with RLS policies
- `db_migration_super_admin_step*.sql` - Super admin system (3 steps + rollback files)
- `db_migration_weather_system.sql` - Weather tracking with location coordinates
- `db_migration_preliminary_production.sql` - Isolated preliminary production table
- `db_migration_daily_pile_goal.sql` - Daily production goal setting

**Important**: All tables use Row Level Security (RLS). Users can only access data for projects they're associated with via `user_projects` table.

**Performance Note**: The blocks and zones pages load all pile data in parallel (pages of 1000), then process statistics in-memory. All filtering for Owner's Rep accounts (`published = true`) is applied during the initial data load.

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Email Service (choose one): Web3Forms, EmailJS, or Resend - see EMAIL_SETUP.md
```

## Key Features & Implementation Details

### Authentication & Authorization
- Supabase Auth with email/password; forgot password at `/auth/forgot-password`
- Use `useAuth()` hook for authentication state throughout the app
- **Roles**: Owner, Admin, Rep (Owner's Rep) - controlled via `user_projects` table

### Publication Workflow (Data Safeguarding)
- **Purpose**: EPC users review pile data before making visible to Owner's Rep accounts
- `published` boolean in `piles` table (defaults to false)
- **EPC users** (`canEdit = true`): See all piles, can publish via "Publish Data" button in My Piles
- **Owner's Rep** (`canEdit = false`): Only see published piles across all pages
- **Critical**: Always filter by `published = true` for Owner's Rep users in all pile queries

### Pile Status Classification
Used across Blocks, Zones, and Production pages:
- **Accepted**: Embedment ≥ design embedment
- **Tolerance**: Design embedment - tolerance ≤ embedment < design embedment
- **Refusal**: Embedment < design embedment - tolerance
- **Pending**: Missing embedment data

### CSV Upload System
- `src/components/CSVUploadModal.tsx` - Intelligent column mapping with pattern extraction (regex, substring)
- `PileLookupUploadModal.tsx` - Pile plot plan data (Settings page)
- `PreliminaryProductionUploadModal.tsx` - Preliminary production data (separate table)
- Allows duplicate piles by design (tracked in `pile_activities`)

### Production Tracking
- Page at `src/app/production/page.tsx` with dual-tab system (`?tab=actual` or `?tab=preliminary`)
- **Actual Tab**: Uses main `piles` table
- **Preliminary Tab**: Uses isolated `preliminary_production` table (NOT visible elsewhere)
- Daily goal tracking, completion forecast, week-over-week analysis

### Super Admin System
- `super_admins` table for system-wide privileges
- Admin page: `src/app/admin/page.tsx`
- API routes at `src/app/api/admin/` (protected server-side routes)
- Service: `src/lib/adminService.ts`

### Weather Tracking
- API: Open-Meteo (free, no key required)
- Geocoding: Nominatim (OpenStreetMap)
- Service: `src/lib/weatherService.ts`
- Configure in Settings → Project Info → Weather Location

### Field Entry
- Mobile-optimized at `/field-entry?project={projectId}`
- QR code generation via `FieldEntryQRCode.tsx`

## Development Guidelines

### Adding shadcn/ui Components
```bash
npx shadcn@latest add [component]
```
Components use New York style (see `components.json`). Icon library: Lucide React.

### Database Migrations
1. Create SQL file in root directory (e.g., `db_migration_*.sql`)
2. Run in Supabase SQL Editor
3. Include rollback file for complex migrations (e.g., `*_ROLLBACK.sql`)

### Supabase Edge Functions
```bash
supabase functions deploy send-invitation-email
supabase functions logs send-invitation-email
```
Located in `supabase/functions/`, uses Deno runtime.

## Important Patterns

- Client components must use `"use client"` directive when using hooks or browser APIs
- Use `useSearchParams()` within a Suspense boundary for production builds
- Context providers wrap app in `layout.tsx`: `AuthProvider` → `AccountTypeProvider` → `ThemeProvider`
