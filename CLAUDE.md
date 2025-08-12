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
- **Next.js 15.3.3** with App Router
- **React 19** with TypeScript 5
- **Supabase** for backend (database, auth, real-time, edge functions)
- **Tailwind CSS 4** with custom theme
- **shadcn/ui** components (New York style)
- **React Hook Form + Zod** for forms and validation
- **Framer Motion** for animations
- **Recharts** for data visualization

### Database Schema
Main tables in Supabase:
- `projects` - Project information
- `user_projects` - User-project relationships (role-based access)
- `piles` - Pile tracking data with embedment/refusal fields
- `pile_activities` - Activity history
- `project_invitations` - Invitation tracking with token-based security

Database setup files:
1. `db_setup.sql` - Main schema
2. `db_migration_pile_columns.sql` - Column migrations
3. `db_migration_embedment_tolerance.sql` - Tolerance fields
4. `db_migration_invitations.sql` - Invitation system
5. `db_email_trigger.sql` - Email trigger system
6. `supabase-rls-fix.sql` - Row Level Security fixes

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

### Authentication Flow
- Supabase Auth with email/password
- Protected routes using middleware
- Context providers wrap entire app in `src/app/layout.tsx`:
  1. AuthProvider
  2. AccountTypeProvider
  3. ThemeProvider

### Project Management
- Multi-project support with role-based access (Owner, Rep, Admin)
- Project switching via `ProjectSelector.tsx`
- Real-time data synchronization across users
- Invitation-based team management

### Data Operations
- Bulk delete functionality in `DeleteAllPilesButton.tsx`
- Delete lower duplicates feature for data cleanup
- Export capabilities for reporting
- Data visualization with Recharts

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
2. Add `page.tsx` with proper authentication checks
3. Use existing layout patterns from other pages

### Setting Up Email Service
1. Choose a service (Web3Forms recommended for quick start)
2. Add environment variables to `.env.local`
3. Test with `node test-invitation.js`
4. See `EMAIL_SETUP.md` and `INVITATION_SETUP.md` for details

### Modifying Database Schema
1. Update relevant SQL files in root directory
2. Run migrations in Supabase SQL Editor
3. Update TypeScript types if needed
4. Verify RLS policies are properly configured

### Adding New Components
1. Check if shadcn/ui has the component: `npx shadcn@latest add [component]`
2. Otherwise, create in `src/components/` following existing patterns
3. Use Tailwind classes and maintain dark mode support

### Working with Invitations
1. Admin/Owner users can invite via the UI
2. Invitations expire after 7 days
3. Accepted invitations automatically assign user to project
4. Email service must be configured for invitations to send