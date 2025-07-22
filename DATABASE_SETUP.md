# Database Setup Instructions

PileTrackerPro uses Supabase as its backend. Follow these steps to set up your database:

## Setting Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase
3. Go to SQL Editor in your Supabase dashboard

## Creating Database Schema

Run the following SQL scripts in order:

1. First, run the main database setup script (found in `db_setup.sql`)
2. Then run the pile columns migration script (found in `db_migration_pile_columns.sql`)
3. If needed, run the RLS (Row Level Security) fixes (found in `supabase-rls-fix.sql`)

## Environment Setup

Create a `.env.local` file in the root of your project with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the placeholders with your actual Supabase URL and anonymous key from your Supabase project settings.

## Data Import

To import existing pile data:
1. Navigate to the My Piles page
2. Click "Upload CSV Data"
3. Select a CSV file with the appropriate columns (see sample CSV in the repository)

## Table Structure

The main tables in the database are:
- `projects` - Project information
- `user_projects` - Links users to projects
- `piles` - Pile data
- `pile_activities` - Activity history for piles 