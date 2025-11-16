# Publication Workflow Feature

## Overview
This feature adds a data publication safeguard system that allows EPC users to review pile data before it becomes visible to Owner's Rep accounts.

## How It Works

### For EPC Users (canEdit = true):
- All piles are visible (both published and unpublished)
- New piles added manually or via CSV start as **unpublished**
- A "Publish Data" button appears when there are unpublished piles
- Clicking the button publishes all unpublished piles at once
- Published data becomes visible to Owner's Reps

### For Owner's Rep Accounts (canEdit = false):
- Only **published** piles are visible
- They cannot see or access unpublished data
- This gives EPC users time to review and verify data quality before sharing

## Database Migration Required

**IMPORTANT**: You must run the database migration to add the `published` field to the piles table.

### Steps to Apply Migration:

1. Log into your Supabase Dashboard
2. Navigate to the SQL Editor
3. Open the file: `db_migration_add_published_field.sql`
4. Copy and paste the SQL into the editor
5. Click "Run" to execute the migration

### What the Migration Does:
- Adds a `published` boolean column to the `piles` table (defaults to false)
- Sets all existing piles to `published = true` (so current data remains visible)
- Creates an index on the `published` column for performance
- Adds documentation comment to the column

## User Interface

### Publish Button Location:
- **Page**: My Piles
- **Position**: Next to the "Upload CSV Data" button
- **Visibility**: Only shown to EPC users when there are unpublished piles
- **Label**: "Publish Data ({count})" - shows number of unpublished piles

### Confirmation Dialog:
- Shows count of piles to be published
- Reminds user to review data for accuracy
- Provides Cancel and Publish options
- Shows loading state during publishing

## Files Modified

### Database:
- `db_migration_add_published_field.sql` - Database migration file

### Pages:
- `src/app/my-piles/page.tsx` - Main pile list page with publish functionality

### Components:
- `src/components/ManualPileModal.tsx` - Sets `published: false` for manually added piles
- `src/components/CSVUploadModal.tsx` - Sets `published: false` for CSV imported piles

## Testing the Feature

1. **Run the migration** in Supabase SQL Editor
2. Add some new piles (manually or via CSV)
3. As an EPC user, you should see:
   - All piles in the list
   - A "Publish Data (X)" button with the count
4. Click the publish button and confirm
5. The unpublished count should go to zero
6. Log in as an Owner's Rep to verify they can now see the data

## Notes

- Existing piles are automatically set to published during migration
- All future piles start as unpublished by default
- The publish action affects ALL unpublished piles at once
- There is currently no "unpublish" feature - once published, piles remain published
- Editing an existing pile does not change its published status
