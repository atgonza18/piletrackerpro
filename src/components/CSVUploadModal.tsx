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
import { FileText, UploadCloud, X, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage("Please upload a CSV file");
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file || !projectId) return;

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

      // Here you would parse the CSV and upload to Supabase
      // This is a simplified example of what that might look like
      const csvData = await readCSVFile(file);
      
      // Process the data and insert into Supabase
      const { data, error } = await processAndUploadData(csvData, projectId);

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
      if (data?.invalidRows && data.invalidRows > 0) {
        toast.success(`✅ Successfully uploaded ${data.validRows} piles! ⚠️ Skipped ${data.invalidRows} invalid rows out of ${data.totalRows} total.`);
      } else {
        toast.success(`✅ Successfully uploaded ${data?.count || 0} pile records! All rows were valid.`);
      }
      
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

  const readCSVFile = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (!e.target || typeof e.target.result !== 'string') {
          reject(new Error('Error reading file'));
          return;
        }
        
        const csvText = e.target.result;
        try {
          // More robust CSV parsing that handles quoted fields and commas within fields
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
        } catch (error) {
          reject(new Error(`Error parsing CSV: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  };

  const processAndUploadData = async (csvData: string[][], projectId: string) => {
    // Get header row and data rows
    const header = csvData[0];
    const rows = csvData.slice(1);
    
    // Create intelligent column mapping
    const columnMapping = createColumnMapping(header);
    
    // Validate that we have essential columns
    if (!columnMapping.pile_id && !columnMapping.block) {
      throw new Error("CSV must contain either a 'Pile ID' or 'Block' column to identify piles");
    }
    
    // Show mapping feedback to user
    console.log("📊 Column Mapping:", columnMapping);
    const mappedColumns = Object.keys(columnMapping).filter(key => columnMapping[key] !== -1);
    const unmappedColumns = header.filter((_, index) => !Object.values(columnMapping).includes(index));
    
    if (mappedColumns.length > 0) {
      toast.success(`✅ Mapped ${mappedColumns.length} columns: ${mappedColumns.join(', ')}`);
    }
    if (unmappedColumns.length > 0) {
      toast.info(`ℹ️ Ignored ${unmappedColumns.length} unmapped columns: ${unmappedColumns.join(', ')}`);
    }
    
    // First, get existing pile numbers for this project to avoid duplicates
    const { data: existingPiles } = await supabase
      .from('piles')
      .select('pile_number')
      .eq('project_id', projectId)
      .limit(10000);
    
    const existingPileNumbers = new Set(existingPiles?.map(p => p.pile_number as string).filter(Boolean) || []);
    
    // Track pile numbers we've seen in this import to avoid duplicates within the import itself
    const seenPileNumbers = new Set<string>();
    
    // Validate each row individually and separate valid from invalid rows
    const validRows: any[] = [];
    const invalidRows: Array<{ row: string[], rowIndex: number, errors: string[] }> = [];
    
    rows.forEach((row, index) => {
      const validation = validateRow(row, index + 2, columnMapping, existingPileNumbers, seenPileNumbers); // +2 because CSV is 1-indexed and we skip header
      
      if (validation.isValid && validation.pileData) {
        validRows.push(validation.pileData);
        // Add to seen pile numbers to track duplicates within this import
        if (validation.pileData.pile_number) {
          seenPileNumbers.add(validation.pileData.pile_number);
        }
      } else {
        invalidRows.push({
          row,
          rowIndex: index + 2,
          errors: validation.errors
        });
      }
    });
    
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
    
    // Insert all batches
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
        totalRows: rows.length,
        errorDetails: invalidRows
      }, 
      error: null 
    };
  };

  // Function to validate a single row and convert it to pile data
  const validateRow = (row: string[], rowIndex: number, columnMapping: Record<string, number>, existingPileNumbers: Set<string>, seenPileNumbers: Set<string>) => {
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

    // Check for required pile identifier
    const pileIdValue = getColumnValue('pile_id');
    const blockValue = getColumnValue('block');
    
    if (!pileIdValue && !blockValue) {
      errors.push("Missing required pile identifier (Pile ID or Block)");
    }

    // Validate numeric fields
    const designEmbedment = getNumericValue('design_embedment');
    const embedment = getNumericValue('embedment');
    const endZ = getNumericValue('end_z');
    const gainPer30 = getNumericValue('gain_per_30_seconds');
    const machine = getNumericValue('machine');
    const startZ = getNumericValue('start_z');

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
          // For other formats, attempt to parse with Date
          else {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              startDate = date.toISOString().split('T')[0];
            } else {
              errors.push(`Invalid date format: '${dateStr}' (expected MM/DD/YYYY)`);
            }
          }
        }
      } catch (error) {
        errors.push(`Error parsing date: '${row[startDateIndex]}'`);
      }
    }

    // Create a unique pile number - prefer pile_id, fallback to block + random
    let pileNumber = '';
    if (pileIdValue) {
      pileNumber = pileIdValue;
    } else if (blockValue) {
      pileNumber = `${blockValue}-${Math.floor(Math.random() * 10000)}`;
    } else {
      pileNumber = `Pile-${Math.floor(Math.random() * 10000)}`;
    }
    
    // Check if pile number already exists in database or in current import
    if (existingPileNumbers.has(pileNumber)) {
      errors.push(`Pile number '${pileNumber}' already exists in database`);
    } else if (seenPileNumbers.has(pileNumber)) {
      errors.push(`Duplicate pile number '${pileNumber}' in this import`);
    }

    // Validate duration format if present
    const duration = getColumnValue('duration');
    if (duration && !/^\d{1,2}:\d{2}:\d{2}$/.test(duration)) {
      // Allow it but warn
      console.warn(`Row ${rowIndex}: Duration format '${duration}' may not be valid (expected H:MM:SS)`);
    }

    // Create pile data object
    const pileData = {
      project_id: projectId,
      pile_number: pileNumber,
      block: blockValue,
      design_embedment: designEmbedment,
      duration: duration,
      embedment: embedment,
      end_z: endZ,
      gain_per_30_seconds: gainPer30,
      machine: machine,
      pile_color: getColumnValue('pile_color'),
      pile_id: pileIdValue,
      start_date: startDate,
      start_time: getColumnValue('start_time'),
      start_z: startZ,
      stop_time: getColumnValue('stop_time'),
      zone: getColumnValue('zone'),
      pile_status: 'pending' // Default status for all imported piles
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
    const fieldPatterns = {
      block: ['block', 'blocks', 'pile block', 'pileblock'],
      design_embedment: ['design embedment', 'designembedment', 'design_embedment', 'target embedment', 'targetembedment', 'target_embedment'],
      duration: ['duration', 'time', 'drive time', 'drivetime', 'drive_time', 'total time', 'totaltime', 'total_time'],
      embedment: ['embedment', 'actual embedment', 'actualembedment', 'actual_embedment', 'final embedment', 'finalembedment', 'final_embedment'],
      end_z: ['end z', 'endz', 'end_z', 'final z', 'finalz', 'final_z', 'end elevation', 'endelevation', 'end_elevation'],
      gain_per_30_seconds: ['gain per 30 seconds', 'gainper30seconds', 'gain_per_30_seconds', 'gain per 30', 'gainper30', 'gain_per_30', 'gain/30', 'gain30'],
      machine: ['machine', 'equipment', 'rig', 'machine id', 'machineid', 'machine_id', 'equipment id', 'equipmentid', 'equipment_id'],
      pile_color: ['pile color', 'pilecolor', 'pile_color', 'color', 'pile colour', 'pilecolour', 'pile_colour'],
      pile_id: ['pile id', 'pileid', 'pile_id', 'id', 'pile number', 'pilenumber', 'pile_number', 'pile no', 'pileno', 'pile_no'],
      start_date: ['start date', 'startdate', 'start_date', 'date', 'installation date', 'installationdate', 'installation_date'],
      start_time: ['start time', 'starttime', 'start_time', 'begin time', 'begintime', 'begin_time'],
      start_z: ['start z', 'startz', 'start_z', 'initial z', 'initialz', 'initial_z', 'start elevation', 'startelevation', 'start_elevation'],
      stop_time: ['stop time', 'stoptime', 'stop_time', 'end time', 'endtime', 'end_time', 'finish time', 'finishtime', 'finish_time'],
      zone: ['zone', 'zones', 'area', 'section', 'location', 'pile zone', 'pilezone', 'pile_zone']
    };

    const mapping: Record<string, number> = {};
    
    // Initialize all mappings to -1 (not found)
    Object.keys(fieldPatterns).forEach(field => {
      mapping[field] = -1;
    });

    // For each header, try to match it to a field
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Check each field pattern
      for (const [fieldName, patterns] of Object.entries(fieldPatterns)) {
        if (mapping[fieldName] === -1) { // Only map if not already mapped
          // Check if header matches any pattern for this field
          const matches = patterns.some(pattern => 
            normalizedHeader === pattern || 
            normalizedHeader.includes(pattern) ||
            pattern.includes(normalizedHeader)
          );
          
          if (matches) {
            mapping[fieldName] = index;
            console.log(`🔗 Mapped '${header}' (column ${index}) -> ${fieldName}`);
            break; // Stop checking other patterns for this header
          }
        }
      }
    });

    return mapping;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none shadow-xl rounded-xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold">Upload CSV Data</DialogTitle>
          <DialogDescription className="text-slate-500">
            Import pile data from a CSV file to your project quickly and easily.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <AnimatePresence mode="wait">
            {uploadStatus === 'error' ? (
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
                          {isDragging ? "Drop your file here" : "Drag and drop your CSV file"}
                        </p>
                        <p className="text-sm text-slate-500">
                          or select a file from your computer
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
                        accept=".csv"
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
                🎉 <strong>Flexible CSV Upload!</strong> Your CSV columns can now be in any order. The app will automatically detect and map your columns based on their names.
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
                    <li><strong>Other:</strong> "Zone", "Pile Color", "Gain per 30 seconds"</li>
                  </ul>
                </div>
                <p className="text-blue-600 text-xs mt-2">
                  <span className="font-medium">🔍 Smart Features:</span>
                </p>
                <ul className="text-blue-600 text-xs list-disc ml-4 space-y-1">
                  <li>✅ Columns can be in any order</li>
                  <li>✅ Column names are case-insensitive</li>
                  <li>✅ Supports spaces, underscores, and variations</li>
                  <li>✅ Automatically ignores unmapped columns</li>
                  <li>✅ <strong>Skips invalid rows</strong> - uploads valid data even if some rows have errors</li>
                  <li>✅ Shows detailed validation feedback after upload</li>
                  <li>⚠️ Must have either "Pile ID" or "Block" column to identify piles</li>
                  <li>📅 Dates should be in MM/DD/YYYY format</li>
                  <li>🔢 Numeric fields will be automatically parsed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex gap-3 sm:gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading || uploadStatus === 'success'}
            className={cn("flex-1 sm:flex-none", isUploading ? "opacity-80" : "")}
          >
            {isUploading ? "Processing..." : "Upload Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 