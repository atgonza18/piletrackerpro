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
import { FileText, UploadCloud, X, AlertCircle, CheckCircle2, Info, ArrowRight, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';

interface PreliminaryProductionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onUploadComplete?: () => void;
}

export function PreliminaryProductionUploadModal({
  isOpen,
  onClose,
  projectId,
  onUploadComplete
}: PreliminaryProductionUploadModalProps) {
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
    pileId: '',
    pileNumber: '',
    machine: '',
    block: '',
    startDate: '',
    duration: '',
    startTime: '',
    stopTime: '',
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
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
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
      pileId: '',
      pileNumber: '',
      machine: '',
      block: '',
      startDate: '',
      duration: '',
      startTime: '',
      stopTime: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];

            // Use defval to ensure empty cells return empty string instead of undefined
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              raw: false,
              defval: ''
            });

            console.log("XLSX raw data first row:", jsonData[0]);

            // Ensure each row is an array and convert all values to strings
            const rows: string[][] = jsonData.map(row => {
              if (!Array.isArray(row)) return [];
              return row.map((cell: any) => {
                if (cell === null || cell === undefined) return '';
                return String(cell).trim();
              });
            });

            console.log("Processed rows first row:", rows[0]);
            resolve(rows);
          } else {
            const csvText = e.target.result as string;
            const rows: string[][] = [];
            const lines = csvText.split(/\r?\n/);

            lines.forEach(line => {
              if (line.trim() === '') return;

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

      if (fileName.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleProceedToMapping = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const parsedData = await readFile(file);

      if (!parsedData || parsedData.length === 0) {
        throw new Error("File is empty or could not be parsed");
      }

      // Get first row as headers
      const rawHeaders = parsedData[0] || [];

      // Convert all headers to strings, keep original names
      const detectedHeaders: string[] = [];
      const seenHeaders = new Set<string>();

      for (let i = 0; i < rawHeaders.length; i++) {
        let header = String(rawHeaders[i] || '').trim();

        // If header is empty, use column letter (A, B, C, etc.)
        if (!header) {
          header = `Column ${String.fromCharCode(65 + i)}`;
        }

        // Handle duplicates by adding a number suffix
        let uniqueHeader = header;
        let counter = 1;
        while (seenHeaders.has(uniqueHeader)) {
          uniqueHeader = `${header} (${counter})`;
          counter++;
        }

        seenHeaders.add(uniqueHeader);
        detectedHeaders.push(uniqueHeader);
      }

      if (detectedHeaders.length === 0) {
        throw new Error("No valid column headers found in the file");
      }

      setHeaders(detectedHeaders);
      setFileData(parsedData);

      // Auto-suggest column mappings
      const suggestColumnMapping = (patterns: string[]) => {
        return detectedHeaders.findIndex(col =>
          patterns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
        );
      };

      const suggestedMapping = {
        pileId: detectedHeaders[suggestColumnMapping(['pile id', 'pile_id', 'pileid', 'tag', 'name'])] || '',
        pileNumber: detectedHeaders[suggestColumnMapping(['pile number', 'pile_number', 'pilenumber', 'number', '#'])] || '',
        machine: detectedHeaders[suggestColumnMapping(['machine', 'rig', 'equipment'])] || '',
        block: detectedHeaders[suggestColumnMapping(['block', 'area', 'section'])] || '',
        startDate: detectedHeaders[suggestColumnMapping(['date', 'start_date', 'startdate', 'install date'])] || '',
        duration: detectedHeaders[suggestColumnMapping(['duration', 'drive time', 'drivetime', 'time'])] || '',
        startTime: detectedHeaders[suggestColumnMapping(['start time', 'start_time', 'starttime'])] || '',
        stopTime: detectedHeaders[suggestColumnMapping(['stop time', 'stop_time', 'stoptime', 'end time'])] || '',
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

  // Helper function to parse duration string to seconds
  const parseDurationToSeconds = (durationStr: string): number | null => {
    if (!durationStr || durationStr.trim() === '') return null;

    const trimmed = durationStr.trim();

    // Check if it's already a number (seconds)
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed);
    }

    // Parse "H:MM:SS" or "M:SS" or "HH:MM:SS" format
    const parts = trimmed.split(':');
    if (parts.length === 3) {
      // H:MM:SS or HH:MM:SS
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      // M:SS or MM:SS
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }

    return null;
  };

  // Helper function to parse time string to Date object for calculation
  const parseTimeToDate = (timeStr: string, baseDate: Date = new Date()): Date | null => {
    if (!timeStr || timeStr.trim() === '') return null;

    const trimmed = timeStr.trim();

    // Try parsing various time formats
    // "HH:MM:SS", "HH:MM", "H:MM:SS AM/PM", etc.
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]) || 0;
      const ampm = timeMatch[4];

      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }

      const date = new Date(baseDate);
      date.setHours(hours, minutes, seconds, 0);
      return date;
    }

    return null;
  };

  // Calculate duration in seconds from start and stop times
  const calculateDurationFromTimes = (startTime: string, stopTime: string): number | null => {
    const start = parseTimeToDate(startTime);
    const stop = parseTimeToDate(stopTime);

    if (!start || !stop) return null;

    let diffMs = stop.getTime() - start.getTime();

    // Handle case where stop time is before start time (crossed midnight)
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000; // Add 24 hours
    }

    return Math.round(diffMs / 1000);
  };

  const handleUpload = async () => {
    if (!fileData || fileData.length === 0 || !projectId) return;

    // Validate that machine column is selected (minimum requirement for production tracking)
    if (!columnMapping.machine) {
      toast.error("Please select at least the Machine column");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage("");

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 500);

      const header = fileData[0];
      const rows = fileData.slice(1);

      const isSelected = (value: string) => value && value !== '__none__' && value.trim() !== '';

      const pileIdIndex = isSelected(columnMapping.pileId) ? header.indexOf(columnMapping.pileId) : -1;
      const pileNumberIndex = isSelected(columnMapping.pileNumber) ? header.indexOf(columnMapping.pileNumber) : -1;
      const machineIndex = isSelected(columnMapping.machine) ? header.indexOf(columnMapping.machine) : -1;
      const blockIndex = isSelected(columnMapping.block) ? header.indexOf(columnMapping.block) : -1;
      const startDateIndex = isSelected(columnMapping.startDate) ? header.indexOf(columnMapping.startDate) : -1;
      const durationIndex = isSelected(columnMapping.duration) ? header.indexOf(columnMapping.duration) : -1;
      const startTimeIndex = isSelected(columnMapping.startTime) ? header.indexOf(columnMapping.startTime) : -1;
      const stopTimeIndex = isSelected(columnMapping.stopTime) ? header.indexOf(columnMapping.stopTime) : -1;

      const pileRecords: any[] = [];
      let rowCounter = 0;

      rows.forEach((row, index) => {
        const machine = machineIndex !== -1 ? row[machineIndex]?.trim() : null;
        if (!machine) return; // Skip rows without machine data

        rowCounter++;
        const pileId = pileIdIndex !== -1 ? row[pileIdIndex]?.trim() : `PRELIM-${rowCounter}`;
        const pileNumber = pileNumberIndex !== -1 ? row[pileNumberIndex]?.trim() : String(rowCounter);

        const durationStr = durationIndex !== -1 ? row[durationIndex]?.trim() : null;
        const startTimeStr = startTimeIndex !== -1 ? row[startTimeIndex]?.trim() : null;
        const stopTimeStr = stopTimeIndex !== -1 ? row[stopTimeIndex]?.trim() : null;

        // Calculate duration_int (in seconds) from duration string or from start/stop times
        let durationInt: number | null = null;
        if (durationStr) {
          durationInt = parseDurationToSeconds(durationStr);
        }
        if (durationInt === null && startTimeStr && stopTimeStr) {
          durationInt = calculateDurationFromTimes(startTimeStr, stopTimeStr);
        }

        // If we have duration_int but no duration string, convert to duration string format
        let finalDurationStr = durationStr;
        if (!finalDurationStr && durationInt !== null) {
          const hours = Math.floor(durationInt / 3600);
          const minutes = Math.floor((durationInt % 3600) / 60);
          const seconds = durationInt % 60;
          finalDurationStr = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // Build record for preliminary_production table (all fields optional except machine)
        const record: any = {
          project_id: projectId,
          machine: machine, // Keep as string for the new table
          pile_id: pileId || null,
          pile_number: pileNumber || null,
          block: blockIndex !== -1 ? row[blockIndex]?.trim() || null : null,
          start_date: startDateIndex !== -1 ? row[startDateIndex]?.trim() || null : null,
          duration: finalDurationStr || null,
          start_time: startTimeStr || null,
          stop_time: stopTimeStr || null,
        };

        pileRecords.push(record);
      });

      clearInterval(progressInterval);

      if (pileRecords.length === 0) {
        throw new Error("No valid production data found in the file");
      }

      // Insert in batches to preliminary_production table
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pileRecords.length; i += batchSize) {
        const batch = pileRecords.slice(i, i + batchSize);
        const { error } = await supabase
          .from('preliminary_production')
          .insert(batch);

        if (error) {
          console.error("=== SUPABASE ERROR DETAILS ===");
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("Error details:", error.details);
          console.error("Error hint:", error.hint);
          console.error("Full error object:", JSON.stringify(error, null, 2));
          console.error("Batch sample (first record):", JSON.stringify(batch[0], null, 2));
          console.error("==============================");
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      setUploadProgress(100);

      if (successCount > 0) {
        setUploadStatus('success');
        if (errorCount > 0) {
          toast.warning(`Uploaded ${successCount} piles. ${errorCount} piles failed.`);
        } else {
          toast.success(`Successfully uploaded ${successCount} preliminary piles!`);
        }
      } else {
        throw new Error("All piles failed to upload. Check your data format.");
      }

      setTimeout(() => {
        onClose();
        handleRemoveFile();
        onUploadComplete?.();
      }, 2000);

    } catch (error) {
      console.error("Error uploading preliminary data:", error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload data");
      setUploadProgress(0);
      toast.error("Failed to upload preliminary production data");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none shadow-xl rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Upload Preliminary Production Data
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Upload machine productivity data before complete engineer data is available. This data is completely isolated and will NOT appear in Dashboard, My Piles, Blocks, or Zones.
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
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Isolated Preliminary Data</p>
                    <p className="text-amber-700 text-xs">
                      This data is stored separately and will only appear on the Preliminary tab. Clear it when complete data is available.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Debug info */}
                  {headers.length === 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      No columns detected. Please check your file format.
                    </div>
                  )}

                  {/* Machine - Required */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Machine # <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-400 font-normal">({headers.length} columns found)</span>
                    </label>
                    <Select
                      value={columnMapping.machine}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, machine: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Machine #" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.length === 0 && (
                          <SelectItem value="__no_columns__" disabled>No columns found</SelectItem>
                        )}
                        {headers.map((header, index) => (
                          <SelectItem key={`machine-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pile ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Pile ID</label>
                    <Select
                      value={columnMapping.pileId}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, pileId: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column (optional - will auto-generate)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Auto-generate --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`pileid-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Block */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Block</label>
                    <Select
                      value={columnMapping.block}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, block: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Block (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`block-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Date</label>
                    <Select
                      value={columnMapping.startDate}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, startDate: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Date (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`date-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Duration (Drive Time)</label>
                    <Select
                      value={columnMapping.duration}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, duration: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Duration (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`duration-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Format: "0:12:05" or "12:05" or seconds</p>
                  </div>

                  {/* Start Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Start Time</label>
                    <Select
                      value={columnMapping.startTime}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, startTime: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Start Time (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`startTime-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stop Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Stop Time</label>
                    <Select
                      value={columnMapping.stopTime}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, stopTime: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Stop Time (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`stopTime-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
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
                  <p>Your preliminary production data has been uploaded.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "border rounded-xl bg-white transition-all overflow-hidden",
                  isDragging ? "border-amber-400 bg-amber-50/50" : "border-slate-200"
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
                        <div className="bg-amber-100 rounded-lg p-3 flex-shrink-0">
                          <FileText className="w-6 h-6 text-amber-600" />
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
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="bg-amber-100 rounded-full p-4 mx-auto">
                        <UploadCloud className="w-8 h-8 text-amber-600" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-medium text-slate-800">
                          {isDragging ? "Drop your file here" : "Drag and drop your production file"}
                        </p>
                        <p className="text-sm text-slate-500">
                          CSV or Excel file with machine productivity data
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
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

          <div className="mt-4 flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Important: Column headers must be in the first row</p>
              <p className="text-red-700 text-xs">
                Remove any title rows or metadata above your column headers before uploading.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3 p-4 bg-amber-50 rounded-lg">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">When to use this?</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Use this when you need to track machine productivity but don't have complete pile data from engineers yet.
                This data is stored separately and can be easily cleared when you receive the complete data.
              </p>
              <div className="mt-2">
                <p className="text-amber-700 text-xs font-medium">Minimum required:</p>
                <ul className="text-amber-700 text-xs list-disc ml-4 mt-1">
                  <li><strong>Machine #:</strong> Required for production tracking</li>
                </ul>
                <p className="text-amber-700 text-xs font-medium mt-2">For accurate drive time tracking:</p>
                <ul className="text-amber-700 text-xs list-disc ml-4 mt-1">
                  <li><strong>Duration:</strong> Drive time (e.g., "0:12:05" or "12:05")</li>
                  <li><strong>OR Start Time + Stop Time:</strong> Will calculate duration automatically</li>
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
                disabled={!columnMapping.machine || isUploading || uploadStatus === 'success'}
                className={cn(
                  "flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700",
                  isUploading ? "opacity-80" : ""
                )}
              >
                {isUploading ? "Processing..." : "Upload Preliminary Data"}
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
                className={cn(
                  "flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700",
                  isUploading ? "opacity-80" : ""
                )}
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
