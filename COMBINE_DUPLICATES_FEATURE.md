# Combine Duplicates Feature - Implementation Summary

**Date**: October 1, 2025
**Feature**: Combine duplicate piles with value summing and date range tracking

---

## Overview

Added a new feature that allows users to combine duplicate pile records into a single pile with summed values. When duplicates have different dates, the date range is displayed on the piles page.

---

## Database Changes

### Migration: `db_migration_combined_piles.sql`

Added new columns to the `piles` table:

- `is_combined` (BOOLEAN) - Indicates if this pile represents combined duplicate records
- `combined_count` (INTEGER) - Number of duplicate piles combined into this record (default 1)
- `combined_pile_ids` (TEXT[]) - Array of original pile database IDs that were combined
- `date_range_start` (TEXT) - Earliest start date from all combined piles
- `date_range_end` (TEXT) - Latest start date from all combined piles

**Migration Applied**: ✅ Successfully applied via Supabase MCP

---

## Code Changes

### 1. Updated TypeScript Interface

**File**: `src/app/my-piles/page.tsx` (lines 47-78)

Added new optional fields to `PileData` interface:
```typescript
interface PileData {
  // ... existing fields ...
  is_combined?: boolean;
  combined_count?: number;
  combined_pile_ids?: string[];
  date_range_start?: string | null;
  date_range_end?: string | null;
}
```

---

### 2. Added State Management

**File**: `src/app/my-piles/page.tsx` (lines 111-113)

```typescript
const [isCombineDuplicatesDialogOpen, setIsCombineDuplicatesDialogOpen] = useState(false);
const [isCombiningDuplicates, setIsCombiningDuplicates] = useState(false);
const [pileIdToCombine, setPileIdToCombine] = useState<string | null>(null);
```

---

### 3. Implemented Combine Function

**File**: `src/app/my-piles/page.tsx` (lines 1192-1296)

**Key Features**:
- Filters all piles with matching `pile_id`
- Sorts by embedment (highest first) to keep best pile as base
- **Sums values**:
  - Total embedment from all duplicates
  - Total gain/30 seconds from all duplicates
- **Tracks date range**:
  - `date_range_start`: Earliest date from all duplicates
  - `date_range_end`: Latest date from all duplicates
- Collects all database IDs in `combined_pile_ids` array
- Updates base pile with combined data
- Deletes other duplicate piles
- Updates local state and reloads page for consistency

**Code Snippet**:
```typescript
// Calculate summed values
const totalEmbedment = duplicatePiles.reduce((sum, pile) => sum + (pile.embedment || 0), 0);
const totalGainPer30 = duplicatePiles.reduce((sum, pile) => sum + (pile.gain_per_30_seconds || 0), 0);

// Get date range
const dates = duplicatePiles
  .map(pile => pile.start_date)
  .filter(date => date != null)
  .sort();
const dateRangeStart = dates[0] || null;
const dateRangeEnd = dates[dates.length - 1] || null;
```

---

### 4. Enhanced Date Display in Table

**File**: `src/app/my-piles/page.tsx` (lines 2130-2143)

For combined piles with different date ranges, displays:
- **Primary**: `MM/DD/YYYY - MM/DD/YYYY` in blue text
- **Secondary**: `(X combined)` in smaller gray text

For regular/non-combined piles:
- Standard date display: `MM/DD/YYYY`

**Visual Indicator**:
```typescript
{pile.is_combined && pile.date_range_start && pile.date_range_end &&
 pile.date_range_start !== pile.date_range_end ? (
  <div className="flex flex-col">
    <span className="truncate text-xs font-medium text-blue-600">
      {formatDate(pile.date_range_start)} - {formatDate(pile.date_range_end)}
    </span>
    <span className="text-[10px] text-slate-500">
      ({pile.combined_count} combined)
    </span>
  </div>
) : (
  <span>{pile.start_date ? formatDate(pile.start_date) : "N/A"}</span>
)}
```

---

### 5. Added Combine Button to Duplicate Popover

**File**: `src/app/my-piles/page.tsx` (lines 2403-2421)

**Location**: In the duplicate comparison popover footer (appears when clicking "Duplicate Pile ID" badge on pile detail card)

**Button Features**:
- Gradient blue styling for prominence
- Link2 icon
- Only visible to users with `canEdit` permission
- Opens confirmation dialog with pile ID pre-selected

**Code**:
```typescript
<Button
  variant="default"
  size="sm"
  onClick={() => {
    setPileIdToCombine(selectedPile.pile_id);
    setIsCombineDuplicatesDialogOpen(true);
  }}
  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
>
  <Link2 size={14} />
  Combine All Duplicates
</Button>
```

---

### 6. Created Confirmation Dialog

**File**: `src/app/my-piles/page.tsx` (lines 2950-3023)

**Dialog Contents**:

**Title**: "Combine Duplicate Piles" with Link2 icon

**Description**: Shows which pile ID will be combined

**Information Box** (Blue background):
- All embedment values will be summed together
- All gain/30 seconds values will be summed together
- Date range will show earliest to latest date
- The pile with highest embedment will be kept as base
- All other duplicates will be deleted

**Warning Box** (Amber background):
- "This action cannot be undone"

**Action Buttons**:
- **Cancel**: Closes dialog
- **Combine Duplicates**:
  - Shows loading spinner when processing
  - Blue gradient styling
  - Calls `handleCombineDuplicates()` function

---

## User Flow

1. **View Duplicates**: User clicks on a pile with duplicate pile ID
2. **Badge Appears**: "Duplicate Pile ID" badge shows in top-right of pile detail card
3. **Open Comparison**: User clicks badge to see duplicate comparison table
4. **See All Duplicates**: Table shows all piles with matching pile ID
5. **Click Combine**: User clicks "Combine All Duplicates" button in footer
6. **Review Dialog**: Confirmation dialog explains what will happen
7. **Confirm**: User clicks "Combine Duplicates" button
8. **Processing**:
   - Calculates summed embedment and gain values
   - Determines date range
   - Updates base pile (highest embedment)
   - Deletes other duplicates
9. **Success**: Toast shows success message with total combined embedment
10. **Reload**: Page automatically reloads to show updated data
11. **Result**: Single pile displayed with:
    - Combined embedment total
    - Combined gain/30 total
    - Date range display if dates differ
    - "(X combined)" indicator

---

## Example Scenarios

### Scenario 1: Combining 3 Duplicate Piles

**Before**:
- Pile A1.005.03 (Date: 09/20/2025, Embedment: 25 ft)
- Pile A1.005.03 (Date: 09/22/2025, Embedment: 30 ft)
- Pile A1.005.03 (Date: 09/24/2025, Embedment: 28 ft)

**After Combining**:
- Pile A1.005.03 (Dates: 09/20/2025 - 09/24/2025, Embedment: 83 ft, Combined: 3)
- Date column shows: "09/20/2025 - 09/24/2025" with "(3 combined)" below

### Scenario 2: Combining Piles with Same Date

**Before**:
- Pile B2.010.01 (Date: 09/25/2025, Embedment: 20 ft)
- Pile B2.010.01 (Date: 09/25/2025, Embedment: 22 ft)

**After Combining**:
- Pile B2.010.01 (Date: 09/25/2025, Embedment: 42 ft, Combined: 2)
- Date column shows: "09/25/2025" (no range since dates are identical)

---

## Technical Details

### Value Summing Logic

All numeric values are summed using `reduce()`:
```typescript
const totalEmbedment = duplicatePiles.reduce(
  (sum, pile) => sum + (pile.embedment || 0),
  0
);
```

### Base Pile Selection

The pile with the **highest embedment value** is kept as the base:
```typescript
const sortedPiles = [...duplicatePiles].sort(
  (a, b) => (b.embedment || 0) - (a.embedment || 0)
);
const basePile = sortedPiles[0];
```

### Date Range Calculation

Dates are sorted to find earliest and latest:
```typescript
const dates = duplicatePiles
  .map(pile => pile.start_date)
  .filter(date => date != null)
  .sort();
const dateRangeStart = dates[0] || null;
const dateRangeEnd = dates[dates.length - 1] || null;
```

---

## Permissions

The "Combine All Duplicates" button only appears for users with **edit permissions**:
- ✅ Owner
- ✅ Admin
- ❌ Rep (view-only)

This is enforced using the `canEdit` variable from `useAccountType()` hook.

---

## Error Handling

- **Minimum requirement**: At least 2 piles needed to combine
- **Database errors**: Caught and displayed as toast notifications
- **State consistency**: Page reloads after successful combine to ensure data accuracy
- **Loading state**: Button shows spinner during processing to prevent double-clicks

---

## Files Created

1. `db_migration_combined_piles.sql` - Database schema migration

---

## Files Modified

1. `src/app/my-piles/page.tsx` - Main implementation file
   - Updated `PileData` interface (5 new fields)
   - Added state management (3 new state variables)
   - Implemented `handleCombineDuplicates()` function (104 lines)
   - Enhanced date column display with date range logic
   - Added "Combine All Duplicates" button to popover
   - Created confirmation dialog with detailed information

---

## Testing Recommendations

1. **Test with 2 duplicates**: Verify summing works correctly
2. **Test with multiple duplicates**: Verify all piles are combined
3. **Test with same dates**: Verify no date range shown
4. **Test with different dates**: Verify date range displays correctly
5. **Test with missing embedment**: Verify null values handled gracefully
6. **Test permissions**: Verify button only shows for edit users
7. **Test edge cases**: Single pile, no duplicates, etc.

---

## Future Enhancements (Optional)

- [ ] Add option to combine only selected duplicates (not all)
- [ ] Show preview of combined values before confirming
- [ ] Add undo functionality to restore combined piles
- [ ] Export combined pile history to CSV
- [ ] Add audit log for combined pile operations
- [ ] Show combined pile indicator badge in main table

---

## Build Status

✅ **Successful** - App compiles without errors
✅ **Database Migration** - Applied successfully
✅ **Type Safety** - All TypeScript types updated correctly

---

## Summary

Successfully implemented a comprehensive "Combine Duplicates" feature that:

1. ✅ Sums embedment and gain values from duplicate piles
2. ✅ Tracks date ranges when duplicates span multiple dates
3. ✅ Displays date ranges prominently in the table
4. ✅ Provides clear UI with confirmation dialog
5. ✅ Maintains data integrity with proper database updates
6. ✅ Respects user permissions (edit-only)
7. ✅ Handles edge cases and errors gracefully

The feature is ready for testing and user acceptance.
