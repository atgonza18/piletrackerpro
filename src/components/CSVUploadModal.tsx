"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, UploadCloud, X, AlertCircle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function CSVUploadModal({ isOpen, onClose, projectId }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column mapping state
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState({
    // Required fields
    pileNumber: '',
    startDate: '',
    startTime: '',
    stopTime: '',
    duration: '',
    startZ: '',
    endZ: '',
    machine: '',
    // Optional fields
    endDate: '',
    block: '',
    pileLocation: '',
    pileColor: '',
    pileSize: '',
    zone: '',
    notes: '',
    // Fields that can be provided OR calculated
    embedment: '', // Can be calculated from Start Z - End Z
    designEmbedment: '', // Can be looked up from pile_lookup_data
    pileType: '', // Can be looked up from pile_lookup_data
    gainPer30: '' // Can be calculated from embedment and duration
  });

  // Pattern extraction state for Pile ID and Block
  const [pileIdPattern, setPileIdPattern] = useState({
    enabled: false,
    startIndex: 0,
    endIndex: 0,
    useRegex: false,
    regexPattern: ''
  });

  const [blockPattern, setBlockPattern] = useState({
    enabled: false,
    startIndex: 0,
    endIndex: 0,
    useRegex: false,
    regexPattern: ''
  });

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type - accept both CSV and XLSX
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
      setErrorMessage("Please upload a CSV or XLSX file");
      setUploadStatus('error');
      return;
    }

    setErrorMessage("");
    setUploadStatus('idle');
    setFile(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage("");
    setUploadProgress(0);
    setShowColumnMapping(false);
    setHeaders([]);
    setFileData([]);
    setColumnMapping({
      pileNumber: '',
      startDate: '',
      startTime: '',
      stopTime: '',
      duration: '',
      startZ: '',
      endZ: '',
      machine: '',
      endDate: '',
      block: '',
      pileLocation: '',
      pileColor: '',
      pileSize: '',
      zone: '',
      notes: '',
      embedment: '',
      designEmbedment: '',
      pileType: '',
      gainPer30: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 1: Parse file and show column mapping
  const handleProceedToMapping = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const parsedData = await readFile(file);

      if (!parsedData || parsedData.length === 0) {
        throw new Error("File is empty or could not be parsed");
      }

      // Filter out empty headers
      const detectedHeaders = parsedData[0].filter((header, index, self) =>
        header && header.trim() !== '' && self.indexOf(header) === index
      );

      if (detectedHeaders.length === 0) {
        throw new Error("No valid column headers found in the file");
      }

      setHeaders(detectedHeaders);
      setFileData(parsedData);

      // Auto-suggest column mappings based on header names
      const suggestColumnMapping = (patterns: string[]) => {
        return detectedHeaders.findIndex(col =>
          patterns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
        );
      };

      const suggestedMapping = {
        // Required fields
        pileNumber: detectedHeaders[suggestColumnMapping(['pile number', 'pile_number', 'pilenumber', 'pile no', 'pile #', 'number', 'tag', 'name', 'pile id', 'pile_id'])] || '',
        startDate: detectedHeaders[suggestColumnMapping(['start date', 'start_date', 'startdate', 'date', 'install date'])] || '',
        startTime: detectedHeaders[suggestColumnMapping(['start time', 'start_time', 'starttime', 'begin time'])] || '',
        stopTime: detectedHeaders[suggestColumnMapping(['stop time', 'stop_time', 'stoptime', 'end time', 'end_time', 'endtime', 'finish time'])] || '',
        duration: detectedHeaders[suggestColumnMapping(['duration', 'drive time', 'drivetime', 'time'])] || '',
        startZ: detectedHeaders[suggestColumnMapping(['start z', 'start_z', 'startz', 'start elevation', 'start z(feet)', 'start z (feet)'])] || '',
        endZ: detectedHeaders[suggestColumnMapping(['end z', 'end_z', 'endz', 'end elevation', 'end z(feet)', 'end z (feet)'])] || '',
        machine: detectedHeaders[suggestColumnMapping(['machine', 'equipment', 'rig', 'machine id', 'machine_id'])] || '',
        // Optional fields
        endDate: detectedHeaders[suggestColumnMapping(['end date', 'end_date', 'enddate', 'finish date', 'completion date'])] || '',
        block: detectedHeaders[suggestColumnMapping(['block', 'pile block'])] || '',
        pileLocation: detectedHeaders[suggestColumnMapping(['pile location', 'location', 'pile_location'])] || '',
        pileColor: detectedHeaders[suggestColumnMapping(['pile color', 'color', 'pile_color'])] || '',
        pileSize: detectedHeaders[suggestColumnMapping(['pile size', 'size', 'pile_size'])] || '',
        zone: detectedHeaders[suggestColumnMapping(['zone', 'area', 'section'])] || '',
        notes: detectedHeaders[suggestColumnMapping(['notes', 'comments', 'remarks'])] || '',
        // Fields that can be provided OR calculated
        embedment: detectedHeaders[suggestColumnMapping(['embedment', 'actual embedment', 'final embedment'])] || '',
        designEmbedment: detectedHeaders[suggestColumnMapping(['design embedment', 'design_embedment', 'target embedment'])] || '',
        pileType: detectedHeaders[suggestColumnMapping(['pile type', 'pile_type', 'type', 'zone type'])] || '',
        gainPer30: detectedHeaders[suggestColumnMapping(['gain per 30', 'gain_per_30', 'gain/30', 'gain per 30 seconds'])] || ''
      };

      setColumnMapping(suggestedMapping);
      setShowColumnMapping(true);
    } catch (error) {
      console.error("Error parsing file:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse file");
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Upload with user-selected column mapping
  const handleUpload = async () => {
    if (!fileData || fileData.length === 0 || !projectId) return;

    // Validate that all required columns are selected
    const requiredFields = [
      { field: 'pileNumber', label: 'Pile Number' },
      { field: 'machine', label: 'Machine' },
      { field: 'startDate', label: 'Start Date' },
      { field: 'startTime', label: 'Start Time' },
      { field: 'stopTime', label: 'Stop Time' },
      { field: 'duration', label: 'Duration' },
      { field: 'startZ', label: 'Start Z' },
      { field: 'endZ', label: 'End Z' }
    ];

    const missingFields = requiredFields.filter(({ field }) => !columnMapping[field]);
    if (missingFields.length > 0) {
      toast.error(`Please select all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage("");

    try {
      // Simulate upload progress for UX purposes
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 500);

      // Process the data and insert into Supabase with user-selected mapping
      const { data, error } = await processAndUploadData(fileData, projectId, columnMapping);

      clearInterval(progressInterval);

      if (error) {
        // Provide more specific error messages based on the error type
        if (error.code === '23505') { // PostgreSQL unique violation code
          throw new Error(`Duplicate data detected. Some pile IDs may already exist in the database.`);
        } else if (error.code === '23503') { // PostgreSQL foreign key violation
          throw new Error(`Referenced data does not exist. Please check the project ID.`);
        } else if (error.code === '22P02') { // PostgreSQL invalid text representation
          throw new Error(`Invalid data format. Please check that your date formats are correct (MM/DD/YYYY) and numeric values contain only numbers.`);
        } else if (error.message.includes("column") && error.message.includes("schema")) {
          throw new Error(`Database schema error: ${error.message}. Please contact the administrator to update the database schema.`);
        } else {
          throw new Error(error.message || "An unknown error occurred during upload.");
        }
      }

      setUploadProgress(100);
      setUploadStatus('success');

      // Enhanced success message with detailed results
      const messages: string[] = [];

      if (data?.validRows) {
        messages.push(`✅ Successfully uploaded ${data.validRows} pile(s)`);
      }

      if (data?.skippedDuplicates && data.skippedDuplicates > 0) {
        messages.push(`⏭️ Skipped ${data.skippedDuplicates} duplicate(s)`);
      }

      if (data?.invalidRows && data.invalidRows > 0) {
        messages.push(`⚠️ Skipped ${data.invalidRows} invalid row(s)`);
      }

      toast.success(messages.join(' • '));

      // Close the modal after a delay to show success state
      setTimeout(() => {
        onClose();
        handleRemoveFile();
      }, 2000);

    } catch (error) {
      console.error("Error uploading CSV:", error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload CSV data");
      setUploadProgress(0);
      toast.error("Failed to upload CSV data");
    } finally {
      setIsUploading(false);
    }
  };

  // Read file (CSV or XLSX) and return as 2D array
  const readFile = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const fileName = file.name.toLowerCase();

      reader.onload = (e) => {
        if (!e.target || !e.target.result) {
          reject(new Error('Error reading file'));
          return;
        }

        try {
          if (fileName.endsWith('.xlsx')) {
            // Parse XLSX file
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

            // Convert to string array
            const rows: string[][] = jsonData.map(row =>
              row.map((cell: any) => String(cell || '').trim())
            );

            resolve(rows);
          } else {
            // Parse CSV file
            const csvText = e.target.result as string;
            const rows: string[][] = [];
            const lines = csvText.split(/\r?\n/);

            lines.forEach(line => {
              if (line.trim() === '') return; // Skip empty lines

              const row: string[] = [];
              let inQuotes = false;
              let currentValue = '';

              for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  row.push(currentValue.trim());
                  currentValue = '';
                } else {
                  currentValue += char;
                }
              }

              // Push the last value
              row.push(currentValue.trim());
              rows.push(row);
            });

            resolve(rows);
          }
        } catch (error) {
          reject(new Error(`Error parsing file: ${error instanceof Error ? error.message : String(error)}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      // Read as ArrayBuffer for XLSX, as Text for CSV
      if (fileName.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Normalize pile ID for matching (handle formatting variations)
  const normalizePileId = (pileId: string): string => {
    if (!pileId) return '';

    // Convert to uppercase and trim
    let normalized = pileId.toUpperCase().trim();

    // Remove any extra whitespace
    normalized = normalized.replace(/\s+/g, '');

    // DON'T change zero-padding - keep the format as-is
    // This way we match exactly what's in both files without transformation
    // The old logic was changing A1.005.03 -> A1.005.003 which might not match

    return normalized;
  };

  // Fetch pile lookup data for Pile Type and Design Embedment
  const fetchPileLookupData = async (projectId: string) => {
    // Fetch ALL records - Supabase defaults to 1000 row limit, so we need to handle pagination
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('pile_lookup_data')
        .select('pile_tag, pile_type, design_embedment')
        .eq('project_id', projectId)
        .order('pile_tag', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.warn('Error fetching pile lookup data:', error);
        break;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        hasMore = data.length === pageSize; // If we got a full page, there might be more
        page++;
      } else {
        hasMore = false;
      }
    }

    // Create multiple lookup maps for flexible matching
    const exactMap = new Map();
    const normalizedMap = new Map();

    allData.forEach(row => {
      const lookupData = {
        pile_type: row.pile_type,
        design_embedment: row.design_embedment
      };

      // Store by exact tag
      exactMap.set(row.pile_tag, lookupData);

      // Store by normalized tag for fuzzy matching
      const normalizedTag = normalizePileId(row.pile_tag);
      normalizedMap.set(normalizedTag, lookupData);
    });

    console.log(`📚 Loaded ${exactMap.size} pile lookup records from database (fetched in ${page} page(s))`);
    console.log(`🔍 Sample exact tags (first 10):`, Array.from(exactMap.keys()).slice(0, 10));
    console.log(`🔍 Sample exact tags (last 10):`, Array.from(exactMap.keys()).slice(-10));

    if (exactMap.size === 0) {
      console.warn('⚠️ WARNING: No pile lookup data found! Make sure you uploaded the pile plot plan first.');
    }

    return { exactMap, normalizedMap };
  };

  // Helper function to extract pattern from text
  const extractPattern = (
    text: string,
    pattern: typeof pileIdPattern | typeof blockPattern
  ): string => {
    if (!pattern.enabled || !text) return text;

    if (pattern.useRegex && pattern.regexPattern) {
      try {
        const regex = new RegExp(pattern.regexPattern);
        const match = text.match(regex);
        return match && match[1] ? match[1] : text;
      } catch (error) {
        console.warn('Invalid regex pattern:', pattern.regexPattern, error);
        return text;
      }
    } else {
      // Use character position extraction
      const end = pattern.endIndex > 0 ? pattern.endIndex : undefined;
      return text.substring(pattern.startIndex, end);
    }
  };

  const processAndUploadData = async (
    csvData: string[][],
    projectId: string,
    userMapping: typeof columnMapping
  ) => {
    // Get header row and data rows
    const header = csvData[0];
    const rows = csvData.slice(1);

    // Fetch existing piles from database to check for duplicates
    const { data: existingPiles, error: fetchError } = await supabase
      .from('piles')
      .select('pile_number, embedment')
      .eq('project_id', projectId);

    if (fetchError) {
      console.warn('Error fetching existing piles:', fetchError);
    }

    // Create a map of pile_number -> embedment values for quick lookup
    const existingPileMap = new Map<string, number[]>();
    if (existingPiles) {
      existingPiles.forEach(pile => {
        if (pile.pile_number && pile.embedment !== null) {
          if (!existingPileMap.has(pile.pile_number)) {
            existingPileMap.set(pile.pile_number, []);
          }
          existingPileMap.get(pile.pile_number)!.push(pile.embedment);
        }
      });
    }

    console.log(`📊 Found ${existingPileMap.size} existing pile numbers with embedment data`);

    // Fetch pile lookup data
    const pileLookupMaps = await fetchPileLookupData(projectId);

    // Helper to check if a value is selected (not empty and not __none__)
    const isSelected = (value: string) => value && value !== '__none__' && value.trim() !== '';

    // Convert user mapping to column indices
    const columnMapping = {
      // Required fields
      pile_id: isSelected(userMapping.pileNumber) ? header.indexOf(userMapping.pileNumber) : -1,
      machine: isSelected(userMapping.machine) ? header.indexOf(userMapping.machine) : -1,
      start_date: isSelected(userMapping.startDate) ? header.indexOf(userMapping.startDate) : -1,
      start_time: isSelected(userMapping.startTime) ? header.indexOf(userMapping.startTime) : -1,
      stop_time: isSelected(userMapping.stopTime) ? header.indexOf(userMapping.stopTime) : -1,
      duration: isSelected(userMapping.duration) ? header.indexOf(userMapping.duration) : -1,
      start_z: isSelected(userMapping.startZ) ? header.indexOf(userMapping.startZ) : -1,
      end_z: isSelected(userMapping.endZ) ? header.indexOf(userMapping.endZ) : -1,
      // Optional fields
      end_date: isSelected(userMapping.endDate) ? header.indexOf(userMapping.endDate) : -1,
      block: isSelected(userMapping.block) ? header.indexOf(userMapping.block) : -1,
      pile_location: isSelected(userMapping.pileLocation) ? header.indexOf(userMapping.pileLocation) : -1,
      pile_color: isSelected(userMapping.pileColor) ? header.indexOf(userMapping.pileColor) : -1,
      pile_size: isSelected(userMapping.pileSize) ? header.indexOf(userMapping.pileSize) : -1,
      zone: isSelected(userMapping.zone) ? header.indexOf(userMapping.zone) : -1,
      notes: isSelected(userMapping.notes) ? header.indexOf(userMapping.notes) : -1,
      // Fields that can be provided OR calculated
      embedment: isSelected(userMapping.embedment) ? header.indexOf(userMapping.embedment) : -1,
      design_embedment: isSelected(userMapping.designEmbedment) ? header.indexOf(userMapping.designEmbedment) : -1,
      pile_type: isSelected(userMapping.pileType) ? header.indexOf(userMapping.pileType) : -1,
      gain_per_30_seconds: isSelected(userMapping.gainPer30) ? header.indexOf(userMapping.gainPer30) : -1
    };

    // Validate that we have essential columns
    if (columnMapping.pile_id === -1) {
      throw new Error("Pile Number is required");
    }
    if (columnMapping.machine === -1) {
      throw new Error("Machine is required");
    }
    if (columnMapping.start_date === -1) {
      throw new Error("Start Date is required");
    }
    if (columnMapping.start_time === -1) {
      throw new Error("Start Time is required");
    }
    if (columnMapping.stop_time === -1) {
      throw new Error("Stop Time is required");
    }
    if (columnMapping.duration === -1) {
      throw new Error("Duration is required");
    }
    if (columnMapping.start_z === -1) {
      throw new Error("Start Z is required");
    }
    if (columnMapping.end_z === -1) {
      throw new Error("End Z is required");
    }

    // Show mapping feedback to user
    console.log("📊 Column Mapping:", columnMapping);
    console.log("📋 CSV Headers:", header);
    const mappedColumns = Object.keys(columnMapping).filter(key => columnMapping[key] !== -1);
    const unmappedColumns = header.filter((_, index) => !Object.values(columnMapping).includes(index));

    console.log("✅ Mapped columns:", mappedColumns);
    console.log("❌ Unmapped columns:", unmappedColumns);

    if (mappedColumns.length > 0) {
      toast.success(`✅ Mapped ${mappedColumns.length} columns: ${mappedColumns.join(', ')}`);
    }
    if (unmappedColumns.length > 0) {
      toast.info(`ℹ️ Ignored ${unmappedColumns.length} unmapped columns: ${unmappedColumns.join(', ')}`);
    }
    
    // Validate each row individually and separate valid from invalid rows
    const validRows: any[] = [];
    const invalidRows: Array<{ row: string[], rowIndex: number, errors: string[] }> = [];
    const skippedDuplicates: Array<{ row: string[], rowIndex: number, pileNumber: string, embedment: number }> = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    rows.forEach((row, index) => {
      const validation = validateRow(row, index + 2, columnMapping, new Set(), new Set(), pileLookupMaps, pileIdPattern, blockPattern); // +2 because CSV is 1-indexed and we skip header

      if (validation.isValid && validation.pileData) {
        // Check if this pile_number + embedment combination already exists
        const pileNumber = validation.pileData.pile_number;
        const embedment = validation.pileData.embedment;

        if (pileNumber && embedment !== null && existingPileMap.has(pileNumber)) {
          const existingEmbedments = existingPileMap.get(pileNumber)!;
          // Check if any existing embedment matches (with small tolerance for floating point)
          const isDuplicate = existingEmbedments.some(existing =>
            Math.abs(existing - embedment) < 0.001
          );

          if (isDuplicate) {
            // Skip this row - it's a duplicate
            skippedDuplicates.push({
              row,
              rowIndex: index + 2,
              pileNumber,
              embedment
            });
            console.log(`⏭️ Skipping duplicate: ${pileNumber} with embedment ${embedment}ft`);
            return; // Skip to next row
          }
        }

        // Not a duplicate, add to valid rows
        validRows.push(validation.pileData);
        // Track if pile type was successfully looked up
        if (validation.pileData.pile_type) {
          matchedCount++;
        } else {
          unmatchedCount++;
        }
      } else {
        invalidRows.push({
          row,
          rowIndex: index + 2,
          errors: validation.errors
        });
      }
    });

    // Log matching statistics
    console.log(`📊 Pile Lookup Statistics:`);
    console.log(`   ✅ Matched: ${matchedCount} piles`);
    console.log(`   ❌ Unmatched: ${unmatchedCount} piles`);
    console.log(`   Total valid rows: ${validRows.length}`);
    console.log(`   ⏭️ Skipped duplicates: ${skippedDuplicates.length}`);

    // Show duplicate skip results
    if (skippedDuplicates.length > 0) {
      console.log(`⏭️ Skipped ${skippedDuplicates.length} duplicate rows with matching embedment:`, skippedDuplicates);
      toast.info(`ℹ️ Skipped ${skippedDuplicates.length} duplicate(s) - same pile number + embedment already exists`);
    }

    // Show validation results
    if (invalidRows.length > 0) {
      console.warn(`⚠️ Skipping ${invalidRows.length} invalid rows:`, invalidRows);

      // Group errors by type for better user feedback
      const errorSummary = invalidRows.reduce((acc, invalidRow) => {
        invalidRow.errors.forEach(error => {
          if (!acc[error]) acc[error] = 0;
          acc[error]++;
        });
        return acc;
      }, {} as Record<string, number>);

      const errorMessages = Object.entries(errorSummary)
        .map(([error, count]) => `${error} (${count} rows)`)
        .join(', ');

      toast.warning(`⚠️ Skipped ${invalidRows.length} invalid rows: ${errorMessages}`);
    }

    if (validRows.length === 0) {
      throw new Error("No valid rows found to upload. Please check your data and try again.");
    }

    // Batch the inserts to avoid hitting limits - only process valid rows
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      batches.push(batch);
    }

    // Insert all batches (allow duplicates for comparison feature)
    for (const batch of batches) {
      const { error } = await supabase
        .from('piles')
        .insert(batch);

      if (error) {
        console.error("Error inserting batch:", error);
        return { data: null, error };
      }
    }
    
    return {
      data: {
        count: validRows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        skippedDuplicates: skippedDuplicates.length,
        totalRows: rows.length,
        errorDetails: invalidRows
      },
      error: null
    };
  };

  // Function to validate a single row and convert it to pile data
  const validateRow = (
    row: string[],
    rowIndex: number,
    columnMapping: Record<string, number>,
    existingPileNumbers: Set<string>,
    seenPileNumbers: Set<string>,
    pileLookupMaps: { exactMap: Map<string, any>, normalizedMap: Map<string, any> },
    pileIdPatternConfig: typeof pileIdPattern,
    blockPatternConfig: typeof blockPattern
  ) => {
    const { exactMap, normalizedMap } = pileLookupMaps;
    const errors: string[] = [];

    // Helper function to safely get column value
    const getColumnValue = (columnKey: keyof typeof columnMapping): string | null => {
      const index = columnMapping[columnKey];
      return index !== -1 ? (row[index]?.trim() || null) : null;
    };

    // Helper function to safely parse numeric column value
    const getNumericValue = (columnKey: keyof typeof columnMapping): number | null => {
      const value = getColumnValue(columnKey);
      if (!value) return null;

      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        errors.push(`Invalid numeric value in ${columnKey}: '${value}'`);
        return null;
      }
      return parsed;
    };

    // Get pile identifier - prefer 'Name' column from GPS CSV, fallback to pile_id or block
    let rawPileIdValue = getColumnValue('name') || getColumnValue('pile_id');
    let rawBlockValue = getColumnValue('block');

    // Apply pattern extraction for Pile ID if enabled
    const pileIdValue = rawPileIdValue ? extractPattern(rawPileIdValue, pileIdPatternConfig) : rawPileIdValue;

    // Apply pattern extraction for Block if enabled
    let blockValue = rawBlockValue ? extractPattern(rawBlockValue, blockPatternConfig) : rawBlockValue;

    // Extract block from pile name if not provided (e.g., "A1.005.03" -> "A1")
    let extractedBlock = blockValue;
    if (!extractedBlock && pileIdValue) {
      const match = pileIdValue.match(/^([A-Z]+\d+)/);
      if (match) {
        extractedBlock = match[1];
      }
    }

    if (!pileIdValue && !extractedBlock) {
      errors.push("Missing required pile identifier (Name, Pile ID, or Block)");
    }

    // Read base numeric fields from GPS CSV
    const startZ = getNumericValue('start_z');
    const endZ = getNumericValue('end_z');
    const machine = getNumericValue('machine');

    // ========== FORMULA CALCULATIONS ==========

    // 1. Calculate Embedment (feet) = Start Z - End Z
    let embedment = getNumericValue('embedment'); // Try to get from CSV first
    if (embedment === null && startZ !== null && endZ !== null) {
      embedment = startZ - endZ;
    }

    // 2. Calculate Embedment (in) = Embedment × 12
    const embedmentInches = embedment !== null ? embedment * 12 : null;

    // 3. Parse Duration and convert to seconds
    const durationStr = getColumnValue('duration');
    let durationSeconds: number | null = null;
    if (durationStr) {
      // Parse duration in format "HH:MM:SS" or "H:MM:SS"
      const durationMatch = durationStr.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseInt(durationMatch[3]);
        durationSeconds = hours * 3600 + minutes * 60 + seconds;
      }
    }

    // 4. Calculate Gain/30 = Embedment (in) / (Duration (seconds) / 30)
    let gainPer30 = getNumericValue('gain_per_30_seconds'); // Try to get from CSV first
    if (gainPer30 === null && embedmentInches !== null && durationSeconds !== null && durationSeconds > 0) {
      gainPer30 = embedmentInches / (durationSeconds / 30);
    }

    // 5. Lookup Pile Type and Design Embedment from pile lookup data
    let pileType = getColumnValue('pile_type'); // Try to get from CSV first
    let designEmbedment = getNumericValue('design_embedment'); // Try to get from CSV first
    let matchedVia = null; // Track how we matched for debugging

    if (pileIdValue) {
      let lookupData = null;

      // Try exact match first
      if (exactMap.has(pileIdValue)) {
        lookupData = exactMap.get(pileIdValue);
        matchedVia = 'exact';
      } else {
        // Try normalized match (handles formatting differences)
        const normalizedPileId = normalizePileId(pileIdValue);
        if (normalizedMap.has(normalizedPileId)) {
          lookupData = normalizedMap.get(normalizedPileId);
          matchedVia = 'normalized';
        } else {
          // Log failed matches for debugging
          if (rowIndex <= 5) { // Only log first 5 for debugging
            console.log(`❌ No match for pile ID: "${pileIdValue}" (normalized: "${normalizedPileId}")`);
            const availableKeys = Array.from(normalizedMap.keys()).slice(0, 10);
            console.log(`   Available normalized keys:`, availableKeys);
            console.log(`   Character comparison of first available key:`,
              availableKeys[0] ? {
                available: availableKeys[0],
                searching: normalizedPileId,
                match: availableKeys[0] === normalizedPileId
              } : 'No keys available');
          }
        }
      }

      // Apply the lookup data if found
      if (lookupData) {
        if (!pileType && lookupData.pile_type) {
          pileType = lookupData.pile_type;
        }
        if (designEmbedment === null && lookupData.design_embedment !== null) {
          designEmbedment = lookupData.design_embedment;
        }
        // Log successful matches for debugging
        if (rowIndex <= 5) {
          console.log(`✅ Matched "${pileIdValue}" via ${matchedVia}, got type: ${pileType}`);
        }
      }
    }

    // 6. Calculate Embedment w/ Tolerance = Design Embedment - 1
    const embedmentWithTolerance = designEmbedment !== null ? designEmbedment - 1 : null;

    // 7. Calculate Embedment Difference = Embedment w/ Tolerance - Embedment (feet)
    const embedmentDifference =
      embedmentWithTolerance !== null && embedment !== null
        ? embedmentWithTolerance - embedment
        : null;

    // Validate and parse date
    let startDate = null;
    const startDateIndex = columnMapping.start_date;
    if (startDateIndex !== -1 && row[startDateIndex]?.trim()) {
      try {
        const dateStr = row[startDateIndex].trim();
        if (dateStr) {
          // If it's already in YYYY-MM-DD format, use it as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            startDate = dateStr;
          } 
          // If it's in MM/DD/YYYY format, convert it
          else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const parts = dateStr.split('/');
            const month = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            // Validate date components
            if (month < 1 || month > 12) {
              errors.push(`Invalid month in date: '${dateStr}'`);
            } else if (day < 1 || day > 31) {
              errors.push(`Invalid day in date: '${dateStr}'`);
            } else if (year < 1900 || year > 2100) {
              errors.push(`Invalid year in date: '${dateStr}'`);
            } else {
              startDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }
          }
          // Check if it's an Excel serial date number (numeric string > 1)
          else if (/^\d+(\.\d+)?$/.test(dateStr)) {
            const serialNumber = parseFloat(dateStr);
            // Excel serial dates start from January 1, 1900 (with 1900 incorrectly treated as leap year)
            // Serial number 1 = January 1, 1900
            if (serialNumber > 1 && serialNumber < 100000) { // reasonable range for dates
              // Excel epoch starts at 1900-01-01, but Excel treats 1900 as a leap year
              // So we need to subtract 1 day for dates after Feb 28, 1900
              const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
              const millisecondsPerDay = 24 * 60 * 60 * 1000;
              
              // Calculate the date
              let calculatedDate;
              if (serialNumber < 60) {
                // Before March 1, 1900 (Excel's fake leap day)
                calculatedDate = new Date(excelEpoch.getTime() + (serialNumber - 1) * millisecondsPerDay);
              } else {
                // After February 28, 1900 - subtract 1 day to account for Excel's leap year bug
                calculatedDate = new Date(excelEpoch.getTime() + (serialNumber - 2) * millisecondsPerDay);
              }
              
              if (!isNaN(calculatedDate.getTime())) {
                startDate = calculatedDate.toISOString().split('T')[0];
              } else {
                errors.push(`Invalid Excel serial date: '${dateStr}'`);
              }
            } else {
              errors.push(`Excel serial date out of range: '${dateStr}'`);
            }
          }
          // For other formats, attempt to parse with Date
          else {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              startDate = date.toISOString().split('T')[0];
            } else {
              errors.push(`Invalid date format: '${dateStr}' (expected MM/DD/YYYY or Excel serial number)`);
            }
          }
        }
      } catch (error) {
        errors.push(`Error parsing date: '${row[startDateIndex]}'`);
      }
    }

    // Parse start_time and stop_time (handle Excel time formats)
    const parseTime = (timeStr: string | null) => {
      if (!timeStr || !timeStr.trim()) return null;
      
      const trimmed = timeStr.trim();
      
      // If it's already in HH:MM or HH:MM AM/PM format, keep as is
      if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(trimmed)) {
        return trimmed;
      }
      
      // Check if it's an Excel time decimal (0.0 to 1.0)
      if (/^0\.\d+$/.test(trimmed)) {
        const decimal = parseFloat(trimmed);
        if (decimal >= 0 && decimal < 1) {
          // Convert decimal to hours and minutes
          const totalMinutes = Math.round(decimal * 24 * 60);
          const hours = Math.floor(totalMinutes / 60) % 24;
          const minutes = totalMinutes % 60;
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      
      // If it's just a number (like 14.5 for 2:30 PM), try to parse as decimal hours
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const decimalHours = parseFloat(trimmed);
        if (decimalHours >= 0 && decimalHours < 24) {
          const hours = Math.floor(decimalHours);
          const minutes = Math.round((decimalHours - hours) * 60);
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      
      // Return original if we can't parse it
      return trimmed;
    };

    const startTime = parseTime(getColumnValue('start_time'));
    const stopTime = parseTime(getColumnValue('stop_time'));

    // Create pile number - use pile_id directly to preserve duplicates
    // Duplicates are intentionally allowed so users can compare multiple entries for the same pile
    let pileNumber = '';

    if (pileIdValue) {
      pileNumber = pileIdValue;
    } else if (blockValue) {
      pileNumber = blockValue;
    } else {
      pileNumber = `Pile_Row${rowIndex}`;
    }

    // Validate duration format if present
    const duration = getColumnValue('duration');
    if (duration && !/^\d{1,2}:\d{2}:\d{2}$/.test(duration)) {
      // Allow it but warn
      console.warn(`Row ${rowIndex}: Duration format '${duration}' may not be valid (expected H:MM:SS)`);
    }

    // Create pile data object with calculated values
    const pileData = {
      project_id: projectId,
      pile_number: pileNumber,
      block: extractedBlock || getColumnValue('block'), // Use extracted block or direct column
      design_embedment: designEmbedment, // From lookup or CSV
      duration: duration, // Original duration string
      embedment: embedment, // Calculated or from CSV
      end_z: endZ,
      gain_per_30_seconds: gainPer30, // Calculated or from CSV
      machine: machine,
      pile_color: getColumnValue('pile_color'),
      pile_id: pileIdValue,
      pile_location: getColumnValue('pile_location'),
      pile_size: getColumnValue('pile_size'),
      pile_type: pileType, // From lookup or CSV
      start_date: startDate,
      start_time: startTime,
      start_z: startZ,
      stop_time: stopTime,
      notes: getColumnValue('notes'),
      pile_status: 'pending' // Default status for all imported piles
      // Note: 'zone' column is excluded - it was replaced by 'pile_type' in the schema
    };

    return {
      isValid: errors.length === 0,
      errors,
      pileData: errors.length === 0 ? pileData : null
    };
  };

  // Function to create intelligent column mapping from CSV headers
  const createColumnMapping = (headers: string[]): Record<string, number> => {
    // Define mapping patterns for each field (multiple variations)
    // IMPORTANT: Removed generic 'time' from duration to avoid conflicts with 'start time', 'stop time'
    const fieldPatterns = {
      block: ['block', 'blocks', 'pile block', 'pileblock'],
      design_embedment: ['design embedment', 'designembedment', 'design_embedment', 'target embedment', 'targetembedment', 'target_embedment'],
      duration: ['duration', 'drive time', 'drivetime', 'drive_time', 'total time', 'totaltime', 'total_time', 'duration (seconds)', 'duration seconds', 'duration_seconds'],
      embedment: ['embedment', 'actual embedment', 'actualembedment', 'actual_embedment', 'final embedment', 'finalembedment', 'final_embedment'],
      end_z: ['end z', 'endz', 'end_z', 'final z', 'finalz', 'final_z', 'end elevation', 'endelevation', 'end_elevation', 'end z(feet)', 'end z (feet)'],
      gain_per_30_seconds: ['gain per 30 seconds', 'gainper30seconds', 'gain_per_30_seconds', 'gain per 30', 'gainper30', 'gain_per_30', 'gain/30', 'gain30'],
      machine: ['machine', 'equipment', 'rig', 'machine id', 'machineid', 'machine_id', 'equipment id', 'equipmentid', 'equipment_id'],
      name: ['name', 'pile name', 'pilename', 'pile_name', 'tag', 'pile tag', 'piletag', 'pile_tag'],
      pile_color: ['pile color', 'pilecolor', 'pile_color', 'color', 'pile colour', 'pilecolour', 'pile_colour'],
      pile_id: ['pile id', 'pileid', 'pile_id', 'id', 'pile number', 'pilenumber', 'pile_number', 'pile no', 'pileno', 'pile_no'],
      pile_type: ['pile type', 'piletype', 'pile_type', 'type', 'zone', 'zones', 'pile zone', 'pilezone', 'pile_zone', 'area', 'section'],
      start_date: ['start date', 'startdate', 'start_date', 'date', 'installation date', 'installationdate', 'installation_date'],
      start_time: ['start time', 'starttime', 'start_time', 'begin time', 'begintime', 'begin_time'],
      start_z: ['start z', 'startz', 'start_z', 'initial z', 'initialz', 'initial_z', 'start elevation', 'startelevation', 'start_elevation', 'start z(feet)', 'start z (feet)'],
      stop_date: ['stop date', 'stopdate', 'stop_date', 'end date', 'enddate', 'end_date'],
      stop_time: ['stop time', 'stoptime', 'stop_time', 'end time', 'endtime', 'end_time', 'finish time', 'finishtime', 'finish_time']
    };

    const mapping: Record<string, number> = {};
    
    // Initialize all mappings to -1 (not found)
    Object.keys(fieldPatterns).forEach(field => {
      mapping[field] = -1;
    });

    // Enhanced mapping logic with better prioritization
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      let bestMatch: { fieldName: string; priority: number } | null = null;
      
      // Check each field pattern
      for (const [fieldName, patterns] of Object.entries(fieldPatterns)) {
        if (mapping[fieldName] === -1) { // Only map if not already mapped
          
          for (const pattern of patterns) {
            let priority = 0;
            let matches = false;
            
            // Priority 1: Exact match (highest priority)
            if (normalizedHeader === pattern) {
              matches = true;
              priority = 3;
            }
            // Priority 2: Header contains the full pattern
            else if (normalizedHeader.includes(pattern)) {
              matches = true;
              priority = 2;
            }
            // Priority 3: Pattern contains header (lowest priority)
            else if (pattern.includes(normalizedHeader)) {
              matches = true;
              priority = 1;
            }
            
            if (matches) {
              if (!bestMatch || priority > bestMatch.priority) {
                bestMatch = { fieldName, priority };
              }
              if (priority === 3) break; // Exact match found, no need to check further
            }
          }
        }
      }
      
      // Apply the best match found
      if (bestMatch && mapping[bestMatch.fieldName] === -1) {
        mapping[bestMatch.fieldName] = index;
        console.log(`🔗 Mapped '${header}' (column ${index}) -> ${bestMatch.fieldName} (priority: ${bestMatch.priority})`);
      }
    });

    return mapping;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none shadow-xl rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Upload CSV Data</DialogTitle>
          <DialogDescription className="text-slate-500">
            Import pile data directly from GPS CSV/XLSX files. The app will automatically calculate all derived fields.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {showColumnMapping ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Map Your GPS Data Columns</p>
                    <p className="text-blue-600 text-xs">
                      Select which columns contain the raw data from your GPS file. The app will automatically calculate derived fields (like actual embedment from Start Z - End Z) and lookup fields (like Pile Type from your pile plot data).
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Required Field: Pile Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Pile Number / ID <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.pileNumber}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, pileNumber: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Pile Number" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`pilenum-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Pattern extraction for Pile ID */}
                    {columnMapping.pileNumber && fileData.length > 1 && (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="pileIdPatternEnabled"
                            checked={pileIdPattern.enabled}
                            onChange={(e) => setPileIdPattern(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="rounded"
                          />
                          <label htmlFor="pileIdPatternEnabled" className="text-xs font-medium text-slate-700">
                            Extract pattern from text
                          </label>
                        </div>

                        {pileIdPattern.enabled && (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-600">
                              Sample value: <span className="font-mono bg-white px-2 py-1 rounded">{fileData[1][headers.indexOf(columnMapping.pileNumber)]}</span>
                            </div>

                            <div className="flex gap-2 items-center">
                              <label className="text-xs text-slate-600">Extract characters from position:</label>
                              <input
                                type="number"
                                min="0"
                                value={pileIdPattern.startIndex}
                                onChange={(e) => setPileIdPattern(prev => ({ ...prev, startIndex: parseInt(e.target.value) || 0 }))}
                                className="w-16 px-2 py-1 text-xs border border-slate-300 rounded"
                                placeholder="Start"
                              />
                              <span className="text-xs text-slate-600">to</span>
                              <input
                                type="number"
                                min="0"
                                value={pileIdPattern.endIndex}
                                onChange={(e) => setPileIdPattern(prev => ({ ...prev, endIndex: parseInt(e.target.value) || 0 }))}
                                className="w-16 px-2 py-1 text-xs border border-slate-300 rounded"
                                placeholder="End"
                              />
                            </div>

                            <div className="text-xs text-slate-600">
                              Result: <span className="font-mono bg-white px-2 py-1 rounded font-medium text-blue-600">
                                {fileData[1][headers.indexOf(columnMapping.pileNumber)]?.substring(pileIdPattern.startIndex, pileIdPattern.endIndex || undefined)}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-300">
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  id="pileIdUseRegex"
                                  checked={pileIdPattern.useRegex}
                                  onChange={(e) => setPileIdPattern(prev => ({ ...prev, useRegex: e.target.checked }))}
                                  className="rounded"
                                />
                                <label htmlFor="pileIdUseRegex" className="text-xs font-medium text-slate-700">
                                  Use regex pattern instead
                                </label>
                              </div>

                              {pileIdPattern.useRegex && (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={pileIdPattern.regexPattern}
                                    onChange={(e) => setPileIdPattern(prev => ({ ...prev, regexPattern: e.target.value }))}
                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                    placeholder="e.g., ^([A-Z]+\d+\.\d+\.\d+)$ or ^([A-Z]+\d+)"
                                  />
                                  <div className="text-xs text-slate-500">
                                    Example: ^([A-Z]+\d+) extracts "A1" from "A1.005.03"
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Machine */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Machine / Equipment <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.machine}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, machine: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Machine" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`machine-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.startDate}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, startDate: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Start Date" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`startdate-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.startTime}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, startTime: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Start Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`starttime-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stop Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Stop / End Time <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.stopTime}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, stopTime: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Stop Time" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`stoptime-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Duration / Drive Time <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.duration}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, duration: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`duration-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Z */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Start Z / Elevation <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-1">(feet)</span>
                    </label>
                    <Select
                      value={columnMapping.startZ}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, startZ: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Start Z" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`startz-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* End Z */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      End Z / Elevation <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-1">(feet)</span>
                    </label>
                    <Select
                      value={columnMapping.endZ}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, endZ: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for End Z" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`endz-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Actual Embedment will be calculated as: Start Z - End Z</p>
                  </div>

                  {/* Optional Fields Collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      Additional Optional Fields
                    </summary>
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-200">
                      {/* End Date */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">End / Completion Date</label>
                        <Select
                          value={columnMapping.endDate}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, endDate: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for End Date (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`enddate-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Block - Direct Column */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Block (Direct Column)</label>
                        <Select
                          value={columnMapping.block}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, block: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select if you have a Block column (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`block-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">OR if no direct Block column exists, the app will auto-extract from Pile Number (e.g., "A1" from "A1.005.03")</p>

                        {/* Pattern extraction for Block */}
                        {columnMapping.block && columnMapping.block !== '__none__' && fileData.length > 1 && (
                          <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="blockPatternEnabled"
                                checked={blockPattern.enabled}
                                onChange={(e) => setBlockPattern(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="rounded"
                              />
                              <label htmlFor="blockPatternEnabled" className="text-xs font-medium text-slate-700">
                                Extract pattern from text
                              </label>
                            </div>

                            {blockPattern.enabled && (
                              <div className="space-y-2">
                                <div className="text-xs text-slate-600">
                                  Sample value: <span className="font-mono bg-white px-2 py-1 rounded">{fileData[1][headers.indexOf(columnMapping.block)]}</span>
                                </div>

                                <div className="flex gap-2 items-center">
                                  <label className="text-xs text-slate-600">Extract characters from position:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={blockPattern.startIndex}
                                    onChange={(e) => setBlockPattern(prev => ({ ...prev, startIndex: parseInt(e.target.value) || 0 }))}
                                    className="w-16 px-2 py-1 text-xs border border-slate-300 rounded"
                                    placeholder="Start"
                                  />
                                  <span className="text-xs text-slate-600">to</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={blockPattern.endIndex}
                                    onChange={(e) => setBlockPattern(prev => ({ ...prev, endIndex: parseInt(e.target.value) || 0 }))}
                                    className="w-16 px-2 py-1 text-xs border border-slate-300 rounded"
                                    placeholder="End"
                                  />
                                </div>

                                <div className="text-xs text-slate-600">
                                  Result: <span className="font-mono bg-white px-2 py-1 rounded font-medium text-blue-600">
                                    {fileData[1][headers.indexOf(columnMapping.block)]?.substring(blockPattern.startIndex, blockPattern.endIndex || undefined)}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-slate-300">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="checkbox"
                                      id="blockUseRegex"
                                      checked={blockPattern.useRegex}
                                      onChange={(e) => setBlockPattern(prev => ({ ...prev, useRegex: e.target.checked }))}
                                      className="rounded"
                                    />
                                    <label htmlFor="blockUseRegex" className="text-xs font-medium text-slate-700">
                                      Use regex pattern instead
                                    </label>
                                  </div>

                                  {blockPattern.useRegex && (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={blockPattern.regexPattern}
                                        onChange={(e) => setBlockPattern(prev => ({ ...prev, regexPattern: e.target.value }))}
                                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                                        placeholder="e.g., ^([A-Z]+\d+)"
                                      />
                                      <div className="text-xs text-slate-500">
                                        Example: ^([A-Z]+\d+) extracts "A1" from "A1.005.03"
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pile Location */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Pile Location</label>
                        <Select
                          value={columnMapping.pileLocation}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, pileLocation: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for Pile Location (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`pilelocation-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pile Color */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Pile Color</label>
                        <Select
                          value={columnMapping.pileColor}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, pileColor: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for Pile Color (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`pilecolor-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pile Size */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Pile Size</label>
                        <Select
                          value={columnMapping.pileSize}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, pileSize: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for Pile Size (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`pilesize-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Notes / Comments</label>
                        <Select
                          value={columnMapping.notes}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, notes: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for Notes (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`notes-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </details>

                  {/* Optional Fields with Formulas Collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      Advanced: Override Auto-Calculated Fields
                    </summary>
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-amber-200">
                      <p className="text-xs text-amber-700 mb-2">
                        ⚠️ These fields are normally calculated automatically. Only map them if your CSV already contains these values and you want to override the calculations.
                      </p>

                      {/* Embedment (can override calculation) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          Actual Embedment
                          <span className="text-xs text-amber-600 font-normal">(Formula: Start Z - End Z)</span>
                        </label>
                        <Select
                          value={columnMapping.embedment}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, embedment: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Auto-calculated (optional override)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Auto-Calculate --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`embedment-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">If not selected, will be calculated from Start Z - End Z</p>
                      </div>

                      {/* Design Embedment (can override lookup) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          Design Embedment
                          <span className="text-xs text-blue-600 font-normal">(Looked up from Pile Plot)</span>
                        </label>
                        <Select
                          value={columnMapping.designEmbedment}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, designEmbedment: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Auto-looked up (optional override)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Auto-Lookup --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`designembedment-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">If not selected, will be looked up from pile_lookup_data table</p>
                      </div>

                      {/* Pile Type (can override lookup) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          Pile Type
                          <span className="text-xs text-blue-600 font-normal">(Looked up from Pile Plot)</span>
                        </label>
                        <Select
                          value={columnMapping.pileType}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, pileType: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Auto-looked up (optional override)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Auto-Lookup --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`piletype-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">If not selected, will be looked up from pile_lookup_data table</p>
                      </div>

                      {/* Gain per 30 seconds (can override calculation) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          Gain per 30 seconds
                          <span className="text-xs text-amber-600 font-normal">(Formula: Embedment (in) / (Duration / 30))</span>
                        </label>
                        <Select
                          value={columnMapping.gainPer30}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, gainPer30: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Auto-calculated (optional override)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- Auto-Calculate --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`gainper30-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">If not selected, will be calculated from embedment and duration</p>
                      </div>
                    </div>
                  </details>

                  {/* Info about auto-calculated fields */}
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 font-medium mb-1">✨ Auto-Calculated & Looked-Up Fields:</p>
                    <ul className="text-xs text-amber-700 space-y-0.5">
                      <li>• <strong>Actual Embedment (ft):</strong> Start Z - End Z</li>
                      <li>• <strong>Embedment (inches):</strong> Embedment × 12</li>
                      <li>• <strong>Gain/30 seconds:</strong> Embedment (in) / (Duration (seconds) / 30)</li>
                      <li>• <strong>Pile Type:</strong> Looked up from pile_lookup_data by Pile ID</li>
                      <li>• <strong>Design Embedment:</strong> Looked up from pile_lookup_data by Pile ID</li>
                      <li>• <strong>Block:</strong> Auto-extracted from Pile Number (e.g., "A1" from "A1.005.03")</li>
                      <li>• <strong>Embedment w/ Tolerance:</strong> Design Embedment - 1</li>
                      <li>• <strong>Embedment Difference:</strong> Embedment w/ Tolerance - Actual Embedment</li>
                    </ul>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 text-center">
                      {uploadProgress < 100 ? 'Processing...' : 'Completed'}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : uploadStatus === 'error' ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Upload Failed</p>
                  <p>{errorMessage || "There was an error uploading your file. Please try again."}</p>
                </div>
              </motion.div>
            ) : uploadStatus === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-700">
                  <p className="font-medium">Upload Successful</p>
                  <p>Your CSV data has been successfully uploaded and processed.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "border rounded-xl bg-white transition-all overflow-hidden",
                  isDragging ? "border-blue-400 bg-blue-50/50" : "border-slate-200"
                )}
              >
                <div
                  className="p-8 text-center flex flex-col items-center"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full space-y-4"
                    >
                      <div className="flex items-center gap-4 mx-auto max-w-[260px] bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                        <div className="bg-blue-50 rounded-lg p-3 flex-shrink-0">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-800 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button 
                          onClick={handleRemoveFile}
                          className="ml-auto p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {isUploading && (
                        <div className="space-y-2 w-full max-w-[260px] mx-auto">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 text-center">
                            {uploadProgress < 100 ? 'Processing...' : 'Completed'}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="bg-blue-50 rounded-full p-4 mx-auto">
                        <UploadCloud className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-medium text-slate-800">
                          {isDragging ? "Drop your file here" : "Drag and drop your CSV or XLSX file"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Direct from GPS pile driver or from your computer
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Browse files
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-4 flex gap-3 p-4 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Format Requirements</p>
              <p className="text-blue-600 text-xs leading-relaxed">
                🎉 <strong>GPS CSV Support!</strong> Upload CSV/XLSX files directly from your GPS pile driver. The app will automatically calculate Embedment, Gain/30, Pile Type, Design Embedment, and more!
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-blue-600 text-xs">
                  <span className="font-medium">Supported Column Names (case-insensitive):</span>
                </p>
                <div className="grid grid-cols-1 gap-1">
                  <ul className="text-blue-600 text-xs list-disc ml-4 space-y-1">
                    <li><strong>Pile Identifier:</strong> "Pile ID", "Pile Number", "ID", "Pile_ID" (at least one required)</li>
                    <li><strong>Block:</strong> "Block", "Pile Block" (alternative identifier)</li>
                    <li><strong>Design Embedment:</strong> "Design Embedment", "Target Embedment"</li>
                    <li><strong>Actual Embedment:</strong> "Embedment", "Actual Embedment", "Final Embedment"</li>
                    <li><strong>Duration:</strong> "Duration", "Drive Time", "Time" (format: "0:12:05")</li>
                    <li><strong>Elevations:</strong> "Start Z", "End Z", "Start Elevation", "End Elevation"</li>
                    <li><strong>Machine:</strong> "Machine", "Equipment", "Rig", "Machine ID"</li>
                    <li><strong>Dates/Times:</strong> "Start Date" (MM/DD/YYYY), "Start Time", "Stop Time"</li>
                    <li><strong>Other:</strong> "Pile Type", "Pile Color", "Gain per 30 seconds"</li>
                  </ul>
                </div>
                <p className="text-blue-600 text-xs mt-2">
                  <span className="font-medium">🔍 Smart Features:</span>
                </p>
                <ul className="text-blue-600 text-xs list-disc ml-4 space-y-1">
                  <li>✅ Accepts CSV and XLSX files (direct from GPS pile driver)</li>
                  <li>✅ <strong>Auto-calculates:</strong> Embedment, Embedment (in), Duration (int), Gain/30, Embedment w/ Tolerance, Embedment Difference</li>
                  <li>✅ <strong>Auto-lookups:</strong> Pile Type and Design Embedment (if pile lookup data uploaded)</li>
                  <li>✅ <strong>Auto-extracts:</strong> Block from pile name (e.g., "A1" from "A1.005.03")</li>
                  <li>✅ Columns can be in any order - case-insensitive matching</li>
                  <li>✅ <strong>Skips invalid rows</strong> - uploads valid data even if some rows have errors</li>
                  <li>✅ <strong>Skips duplicates</strong> - piles with same number + embedment won't be uploaded twice</li>
                  <li>⚠️ Minimum required columns: Name (or Pile ID), Machine, Start Date, Start Time, Stop Time, Duration, Start Z(Feet), End Z(Feet)</li>
                  <li>📅 Dates auto-convert from various formats (MM/DD/YYYY, Excel serial dates)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3 pt-2 flex-shrink-0">
          {showColumnMapping ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowColumnMapping(false);
                  handleRemoveFile();
                }}
                disabled={isUploading}
                className="flex-1 sm:flex-none"
              >
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={
                  !columnMapping.pileNumber ||
                  !columnMapping.machine ||
                  !columnMapping.startDate ||
                  !columnMapping.startTime ||
                  !columnMapping.stopTime ||
                  !columnMapping.duration ||
                  !columnMapping.startZ ||
                  !columnMapping.endZ ||
                  isUploading ||
                  uploadStatus === 'success'
                }
                className={cn("flex-1 sm:flex-none", isUploading ? "opacity-80" : "")}
              >
                {isUploading ? "Processing..." : "Upload Data"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToMapping}
                disabled={!file || isUploading}
                className={cn("flex-1 sm:flex-none", isUploading ? "opacity-80" : "")}
              >
                {isUploading ? "Analyzing..." : (
                  <>
                    Next: Map Columns
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 