# Work Session: Dynamic Column Mapping Implementation
**Date:** September 30, 2025
**Feature:** Dynamic CSV Column Mapping for Pile Tracker Pro

## Problem Statement

The application was using hardcoded column name patterns for CSV imports, which caused issues when different projects used different naming conventions or column structures. Users couldn't upload their GPS pile data or pile plot plans if their CSV files didn't match the expected column names exactly.

### Key Issues:
1. **Inflexible CSV Parsing** - Required specific column names (case-insensitive matching only)
2. **No User Control** - Users couldn't tell the app which column represented which field
3. **Project Variability** - Different construction projects use different CSV formats and headers
4. **Poor UX** - Users had to manually rename columns in Excel before uploading

## Solution Implemented

Implemented a **2-step interactive column mapping interface** for both CSV upload modals:
1. **Pile Plot Plan Upload** (`PileLookupUploadModal.tsx`)
2. **GPS Pile Data Upload** (`CSVUploadModal.tsx`)

### Architecture

#### Step 1: File Selection & Parsing
- User selects/drops CSV or XLSX file
- App parses file and extracts all column headers
- Filters out empty or duplicate headers
- Proceeds to Step 2: Column Mapping

#### Step 2: Interactive Column Mapping
- Displays dropdown selects for each required/optional field
- **Smart Auto-Detection**: Suggests best column matches based on common naming patterns
- User can review and adjust any mappings
- Clear distinction between required fields (marked with *) and optional fields
- Upload button validates all required fields are selected before proceeding

### Technical Implementation

#### Key Changes Made:

**1. Added Column Mapping State:**
```typescript
const [showColumnMapping, setShowColumnMapping] = useState(false);
const [headers, setHeaders] = useState<string[]>([]);
const [fileData, setFileData] = useState<string[][]>([]);
const [columnMapping, setColumnMapping] = useState({
  // Field mappings
});
```

**2. Smart Column Detection:**
```typescript
const suggestColumnMapping = (patterns: string[]) => {
  return detectedHeaders.findIndex(col =>
    patterns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
  );
};
```

**3. Two-Step Upload Flow:**
- `handleProceedToMapping()` - Parses file and shows mapping screen
- `handleUpload()` - Processes data with user-selected mappings

**4. Empty Header Filtering:**
```typescript
const detectedHeaders = parsedData[0].filter((header, index, self) =>
  header && header.trim() !== '' && self.indexOf(header) === index
);
```

**5. User Mapping Conversion:**
```typescript
const columnMapping = {
  pile_id: isSelected(userMapping.pileNumber) ? header.indexOf(userMapping.pileNumber) : -1,
  // ... other fields
};
```

## Pile Plot Plan Upload Fields

### Required:
- **Pile TAG/ID** * - Pile identifier (e.g., "A1.005.03")

### Optional:
- **Pile Type** - Pile type classification
- **Design Embedment** - Target embedment depth
- **Block** - Block/zone identifier
- **Northing** - GPS northing coordinate
- **Easting** - GPS easting coordinate
- **Pile Size** - Physical dimensions

### Auto-Detection Patterns:
- TAG: 'tag', 'name', 'pile name', 'pile id', 'pile_id'
- Type: 'type', 'pile type', 'zone type', 'zone', 'pile_type'
- Embedment: 'embedment', 'design embedment', 'design_embedment'
- Block: 'block'
- Northing: 'northing', 'north'
- Easting: 'easting', 'east'
- Size: 'pile size', 'size', 'pile_size'

## GPS Pile Data Upload Fields

### Philosophy:
**Only map RAW data from GPS file. Exclude calculated and lookup fields.**

### Required Fields (8 total):
1. **Pile Number / ID** * - Pile identifier
2. **Machine / Equipment** * - Machine used for installation
3. **Start Date** * - Installation start date
4. **Start Time** * - Start time of installation
5. **Stop / End Time** * - End time of installation
6. **Duration / Drive Time** * - Total drive time
7. **Start Z / Elevation** * - Starting elevation (feet)
8. **End Z / Elevation** * - Ending elevation (feet)

### Optional Fields:
- **End / Completion Date** - If different from start date
- **Block (Direct Column)** - If file has dedicated block column

### Auto-Calculated Fields (NOT mapped):
✨ These are computed by the app, not mapped from CSV:
- **Actual Embedment** = Start Z - End Z
- **Pile Type** = Looked up from uploaded Pile Plot data
- **Design Embedment** = Looked up from uploaded Pile Plot data
- **Block** = Auto-extracted from Pile Number (e.g., "A1" from "A1.005.03") if no direct column
- **Embedment Difference** = Actual - Design
- **Tolerance Checks** = Based on project settings
- **Other Metrics** = Various calculated fields

### Auto-Detection Patterns:
- Pile Number: 'pile number', 'pile_number', 'pilenumber', 'pile no', 'pile #', 'number', 'tag', 'name', 'pile id', 'pile_id'
- Machine: 'machine', 'equipment', 'rig', 'machine id', 'machine_id'
- Start Date: 'start date', 'start_date', 'startdate', 'date', 'install date'
- Start Time: 'start time', 'start_time', 'starttime', 'begin time'
- Stop Time: 'stop time', 'stop_time', 'stoptime', 'end time', 'end_time', 'endtime', 'finish time'
- Duration: 'duration', 'drive time', 'drivetime', 'time'
- Start Z: 'start z', 'start_z', 'startz', 'start elevation', 'start z(feet)', 'start z (feet)'
- End Z: 'end z', 'end_z', 'endz', 'end elevation', 'end z(feet)', 'end z (feet)'
- Block: 'block', 'pile block'

## UI/UX Enhancements

### Visual Design:
1. **Info Banner** - Explains what the mapping screen does
2. **Required Field Indicators** - Red asterisk (*) for required fields
3. **Field Descriptions** - Helper text for complex fields
4. **Collapsible Optional Section** - Keeps interface clean
5. **Auto-Calculated Info Box** - Amber-highlighted box explaining what gets calculated
6. **Progress Indicator** - Shows upload progress during processing
7. **Back Button** - Allows users to change file selection

### User Feedback:
- Toast notifications for validation errors
- Disabled upload button until all required fields mapped
- Clear error messages listing missing fields
- Console logging of mapping decisions for debugging

## Technical Details

### File Parsing:
- Supports both CSV and XLSX formats
- Handles quoted values in CSV
- Converts Excel serial dates
- Robust error handling for malformed files

### Validation:
- Client-side validation before upload
- Checks for empty headers
- Ensures no duplicate header names
- Validates required fields are selected
- Prevents upload of invalid selections

### Error Handling:
- Graceful degradation for parsing errors
- Detailed error messages
- Prevents empty string values in Select components (uses `__none__` placeholder)
- Handles edge cases (empty files, no valid headers, etc.)

## Bug Fixes During Implementation

### Issue 1: Empty String in Select Components
**Problem:** Radix UI Select components don't allow empty string (`""`) as a value.
**Solution:** Use `__none__` as placeholder value for "None" options.

```typescript
const isSelected = (value: string) => value && value !== '__none__' && value.trim() !== '';
```

### Issue 2: Empty Column Headers
**Problem:** Some CSV files had blank column names causing Select component errors.
**Solution:** Filter out empty, whitespace-only, and duplicate headers before rendering.

```typescript
const detectedHeaders = parsedData[0].filter((header, index, self) =>
  header && header.trim() !== '' && self.indexOf(header) === index
);
```

### Issue 3: Unique Keys for SelectItems
**Problem:** React complained about duplicate keys when same header appeared multiple times.
**Solution:** Use field-specific key prefixes (e.g., `tag-${index}`, `type-${index}`).

## Files Modified

1. **`src/components/PileLookupUploadModal.tsx`** - Pile plot plan upload with column mapping
2. **`src/components/CSVUploadModal.tsx`** - GPS pile data upload with column mapping
3. **`CLAUDE.md`** - Updated with block management system documentation

## Benefits Achieved

### For Users:
✅ **Flexibility** - Works with any CSV/Excel structure, any column names
✅ **Control** - Users decide which column represents which field
✅ **Visibility** - Clear understanding of what data is being imported
✅ **Error Prevention** - Validation prevents invalid uploads
✅ **Time Savings** - No need to manually rename columns in Excel

### For System:
✅ **Reliability** - More robust parsing with explicit user mapping
✅ **Maintainability** - Cleaner code with user-defined mappings vs complex pattern matching
✅ **Scalability** - Easy to add new fields without changing pattern detection logic
✅ **Debuggability** - Console logs show exact mapping decisions

## User Flow Example

### Pile Plot Plan Upload:
1. User clicks "Upload Pile Lookup Data" in Settings
2. Selects/drops Excel file with pile plot plan
3. Clicks "Next: Map Columns"
4. App shows detected columns, auto-suggests mappings
5. User reviews mappings (e.g., confirms "TAG" → Pile TAG/ID)
6. User adjusts any incorrect mappings using dropdowns
7. Clicks "Upload Data"
8. App processes and imports pile lookup data

### GPS Data Upload:
1. User clicks "Upload CSV" in My Piles page
2. Selects/drops GPS CSV file from pile driver
3. Clicks "Next: Map Columns"
4. App shows all 8 required fields + 2 optional
5. Auto-suggests best matches for each field
6. User confirms "Name" → Pile Number, "Machine" → Machine, etc.
7. Sees helpful note: "Actual Embedment will be calculated as: Start Z - End Z"
8. All required fields validated (button enabled)
9. Clicks "Upload Data"
10. App calculates embedment, looks up pile types, extracts blocks, etc.

## Future Enhancements (Not Implemented)

### Potential Additions:
- **Save Mapping Templates** - Remember mappings for future uploads from same source
- **Mapping Presets** - Pre-configured mappings for common GPS systems
- **Column Preview** - Show sample data from each column during mapping
- **Bulk Rename** - Suggest renaming columns in source file for next time
- **Validation Preview** - Show how many rows will pass/fail validation before upload
- **Custom Block Extraction** - Let users define regex pattern for block extraction

## Testing Recommendations

### Test Cases:
1. ✅ Upload CSV with standard column names (should auto-map correctly)
2. ✅ Upload CSV with non-standard column names (should allow manual mapping)
3. ✅ Upload CSV with empty/blank column headers (should filter out)
4. ✅ Upload XLSX file (should parse correctly)
5. ✅ Try uploading without selecting required fields (should show validation error)
6. ✅ Use "Back" button to change file (should reset mappings)
7. ✅ Upload with only required fields mapped (should succeed)
8. ✅ Upload with all fields mapped (should succeed with more data)
9. Test with various GPS system exports (Trimble, Topcon, Leica, etc.)
10. Test with different date/time formats

## Conclusion

This implementation successfully solves the core problem of inflexible CSV parsing by giving users full control over column mapping while maintaining a streamlined, user-friendly interface. The smart auto-detection reduces manual work for standard formats while the manual override ensures compatibility with any CSV structure.

The clear distinction between raw data fields (mapped from CSV) and calculated fields (computed by app) prevents confusion and makes the data flow transparent to users.

---

**Implementation Time:** ~2 hours
**Lines of Code Changed:** ~800 lines across 2 files
**Compilation Status:** ✅ Successful, no errors
**User Testing:** Ready for production testing
