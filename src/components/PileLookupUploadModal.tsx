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

interface PileLookupUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function PileLookupUploadModal({ isOpen, onClose, projectId }: PileLookupUploadModalProps) {
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
    tag: '',
    block: '',
    type: '',
    embedment: '',
    northing: '',
    easting: '',
    pileSize: ''
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
      tag: '',
      block: '',
      type: '',
      embedment: '',
      northing: '',
      easting: '',
      pileSize: ''
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
          if (fileName.endsWith('.xlsx')) {
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            // Look for "pile plot" sheet or use first sheet
            let worksheet;
            const pilePlotSheet = workbook.SheetNames.find(name =>
              name.toLowerCase().includes('pile plot') || name.toLowerCase().includes('pileplot')
            );

            if (pilePlotSheet) {
              worksheet = workbook.Sheets[pilePlotSheet];
            } else {
              worksheet = workbook.Sheets[workbook.SheetNames[0]];
            }

            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            const rows: string[][] = jsonData.map(row =>
              row.map((cell: any) => String(cell || '').trim())
            );

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

  // Step 1: Parse file and show column mapping
  const handleProceedToMapping = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const parsedData = await readFile(file);

      if (!parsedData || parsedData.length === 0) {
        throw new Error("File is empty or could not be parsed");
      }

      // Filter out empty headers and get unique non-empty headers
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
        tag: detectedHeaders[suggestColumnMapping(['tag', 'name', 'pile name', 'pile id', 'pile_id'])] || '',
        block: detectedHeaders[suggestColumnMapping(['block'])] || '',
        type: detectedHeaders[suggestColumnMapping(['type', 'pile type', 'zone type', 'zone', 'pile_type'])] || '',
        embedment: detectedHeaders[suggestColumnMapping(['embedment', 'design embedment', 'design_embedment'])] || '',
        northing: detectedHeaders[suggestColumnMapping(['northing', 'north'])] || '',
        easting: detectedHeaders[suggestColumnMapping(['easting', 'east'])] || '',
        pileSize: detectedHeaders[suggestColumnMapping(['pile size', 'size', 'pile_size'])] || ''
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

    // Validate that at least TAG column is selected
    if (!columnMapping.tag) {
      toast.error("Please select at least the Pile TAG/ID column");
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

      // Process and upload pile lookup data with user-selected mapping
      const { data, error } = await processAndUploadLookupData(fileData, projectId, columnMapping);

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || "An unknown error occurred during upload.");
      }

      setUploadProgress(100);
      setUploadStatus('success');
      toast.success(`✅ Successfully uploaded ${data?.count || 0} pile lookup records!`);

      setTimeout(() => {
        onClose();
        handleRemoveFile();
      }, 2000);

    } catch (error) {
      console.error("Error uploading pile lookup data:", error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload pile lookup data");
      setUploadProgress(0);
      toast.error("Failed to upload pile lookup data");
    } finally {
      setIsUploading(false);
    }
  };

  const processAndUploadLookupData = async (
    fileData: string[][],
    projectId: string,
    mapping: typeof columnMapping
  ) => {
    const header = fileData[0];
    const rows = fileData.slice(1);

    // Helper to check if a value is selected (not empty and not __none__)
    const isSelected = (value: string) => value && value !== '__none__' && value.trim() !== '';

    // Get column indices from user-selected mapping
    const tagIndex = isSelected(mapping.tag) ? header.indexOf(mapping.tag) : -1;
    const blockIndex = isSelected(mapping.block) ? header.indexOf(mapping.block) : -1;
    const typeIndex = isSelected(mapping.type) ? header.indexOf(mapping.type) : -1;
    const embedmentIndex = isSelected(mapping.embedment) ? header.indexOf(mapping.embedment) : -1;
    const northingIndex = isSelected(mapping.northing) ? header.indexOf(mapping.northing) : -1;
    const eastingIndex = isSelected(mapping.easting) ? header.indexOf(mapping.easting) : -1;
    const pileSizeIndex = isSelected(mapping.pileSize) ? header.indexOf(mapping.pileSize) : -1;

    if (tagIndex === -1) {
      throw new Error("Pile TAG/ID column is required");
    }

    // Delete existing lookup data for this project
    const { error: deleteError } = await supabase
      .from('pile_lookup_data')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      console.warn('Error deleting old lookup data:', deleteError);
    }

    // Process rows
    const lookupRecords: any[] = [];

    rows.forEach((row, index) => {
      const pileTag = row[tagIndex]?.trim();
      if (!pileTag) return; // Skip rows without pile tag

      const record = {
        project_id: projectId,
        pile_tag: pileTag,
        block: blockIndex !== -1 ? row[blockIndex]?.trim() : null,
        pile_type: typeIndex !== -1 ? row[typeIndex]?.trim() : null,
        design_embedment: embedmentIndex !== -1 ? parseFloat(row[embedmentIndex]) || null : null,
        northing: northingIndex !== -1 ? parseFloat(row[northingIndex]) || null : null,
        easting: eastingIndex !== -1 ? parseFloat(row[eastingIndex]) || null : null,
        pile_size: pileSizeIndex !== -1 ? row[pileSizeIndex]?.trim() : null,
      };

      lookupRecords.push(record);
    });

    if (lookupRecords.length === 0) {
      throw new Error("No valid lookup data found in the file");
    }

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < lookupRecords.length; i += batchSize) {
      const batch = lookupRecords.slice(i, i + batchSize);
      const { error } = await supabase
        .from('pile_lookup_data')
        .insert(batch);

      if (error) {
        console.error("Error inserting batch:", error);
        return { data: null, error };
      }
    }

    return {
      data: { count: lookupRecords.length },
      error: null
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-none shadow-xl rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Upload Pile Lookup Data</DialogTitle>
          <DialogDescription className="text-slate-500">
            Upload your "pile plot" Excel file to enable automatic Pile Type and Design Embedment lookups.
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
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-700">
                    <p className="font-medium mb-1">Map Your Columns</p>
                    <p className="text-slate-600 text-xs">
                      Select which columns in your file correspond to each field. We've pre-selected our best guesses, but you can adjust them as needed.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Required Field: TAG */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      Pile TAG/ID <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={columnMapping.tag}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, tag: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Pile TAG/ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header, index) => (
                          <SelectItem key={`tag-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pile Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Pile Type</label>
                    <Select
                      value={columnMapping.type}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Pile Type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`type-${index}`} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Design Embedment */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Design Embedment</label>
                    <Select
                      value={columnMapping.embedment}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, embedment: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select column for Design Embedment (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={`embedment-${index}`} value={header}>{header}</SelectItem>
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

                  {/* Optional Fields Collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      Additional Optional Fields
                    </summary>
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-200">
                      {/* Northing */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Northing</label>
                        <Select
                          value={columnMapping.northing}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, northing: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for Northing (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`northing-${index}`} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Easting */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Easting</label>
                        <Select
                          value={columnMapping.easting}
                          onValueChange={(value) => setColumnMapping(prev => ({ ...prev, easting: value }))}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select column for Easting (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">-- None --</SelectItem>
                            {headers.map((header, index) => (
                              <SelectItem key={`easting-${index}`} value={header}>{header}</SelectItem>
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
                    </div>
                  </details>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-1000 rounded-full transition-all"
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
                  <p>Your pile lookup data has been successfully uploaded.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "border rounded-xl bg-white transition-all overflow-hidden",
                  isDragging ? "border-slate-400 bg-slate-100/50" : "border-slate-200"
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
                        <div className="bg-slate-100 rounded-lg p-3 flex-shrink-0">
                          <FileText className="w-6 h-6 text-slate-500" />
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
                              className="h-full bg-slate-1000 rounded-full transition-all"
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
                      <div className="bg-slate-100 rounded-full p-4 mx-auto">
                        <UploadCloud className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-medium text-slate-800">
                          {isDragging ? "Drop your file here" : "Drag and drop your pile plot file"}
                        </p>
                        <p className="text-sm text-slate-500">
                          Excel or CSV file with TAG, Pile Type, and Embedment columns
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-700"
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

          <div className="mt-4 flex gap-3 p-4 bg-slate-100 rounded-lg">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-1">What is this?</p>
              <p className="text-slate-600 text-xs leading-relaxed">
                Upload your "pile plot" Excel file (the one with pile tags, types, and design embedments).
                This allows the app to automatically lookup Pile Type and Design Embedment values when you upload GPS CSV files.
              </p>
              <div className="mt-2">
                <p className="text-slate-600 text-xs font-medium">Required columns:</p>
                <ul className="text-slate-600 text-xs list-disc ml-4 space-y-1 mt-1">
                  <li><strong>TAG or Name:</strong> Pile identifier (e.g., "A1.005.03")</li>
                  <li><strong>TYPE or Pile Type:</strong> Pile type (e.g., "2A2B.INTARRAY")</li>
                  <li><strong>Embedment:</strong> Design embedment value</li>
                </ul>
                <p className="text-slate-600 text-xs mt-2">
                  ℹ️ This data will be replaced each time you upload a new pile plot file.
                </p>
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
                disabled={!columnMapping.tag || isUploading || uploadStatus === 'success'}
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
