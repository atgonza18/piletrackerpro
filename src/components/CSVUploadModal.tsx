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
      toast.success(`Successfully uploaded ${data?.count || 0} pile records`);
      
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
    // Skip header row
    const header = csvData[0];
    const rows = csvData.slice(1);
    
    // First, get existing pile numbers for this project to avoid duplicates
    const { data: existingPiles } = await supabase
      .from('piles')
      .select('pile_number')
      .eq('project_id', projectId)
      .limit(10000);
    
    const existingPileNumbers = new Set(existingPiles?.map(p => p.pile_number) || []);
    
    // Track pile numbers we've seen in this import to avoid duplicates within the import itself
    const seenPileNumbers = new Set();
    
    // Batch the inserts to avoid hitting limits
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Convert CSV data to piles object format based on the table columns
      const pilesData = batch.map(row => {
        // Parse and format the date correctly
        let startDate = null;
        try {
          // Check if date is in the expected format
          const dateStr = row[9]?.trim(); // Start Date column (index 9)
          if (dateStr) {
            // If it's already in YYYY-MM-DD format, use it as is
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              startDate = dateStr;
            } 
            // If it's in MM/DD/YYYY format, convert it
            else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
              const parts = dateStr.split('/');
              startDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
            // For other formats, attempt to parse with Date
            else {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                startDate = date.toISOString().split('T')[0];
              }
            }
          }
        } catch (error) {
          console.error("Error parsing date:", row[9], error);
        }

        // Create a unique pile number from pile_id
        // Use the pile_id field from the CSV as the pile_number
        let pileNumber = row[8]?.trim() || `Pile-${Math.floor(Math.random() * 10000)}`; // Pile ID column (index 8)
        
        // Check if pile number already exists in database or in current import
        if (existingPileNumbers.has(pileNumber) || seenPileNumbers.has(pileNumber)) {
          // Add a timestamp suffix to make it unique
          pileNumber = `${pileNumber}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        
        // Add to seen pile numbers for this import
        seenPileNumbers.add(pileNumber);

        // Map CSV columns exactly as they appear in the CSV file
        // "Block,Design Embedment,Duration,Embedment,end z,gain per 30 seconds,Machine,Pile Color,Pile ID,Start Date,Start Time,start z,Stop Time,Zone"
        return {
          project_id: projectId,
          pile_number: pileNumber,
          block: row[0]?.trim() || null,                         // Block (column 0)
          design_embedment: row[1] ? parseFloat(row[1]) : null,  // Design Embedment (column 1)
          duration: row[2]?.trim() || null,                      // Duration (column 2)
          embedment: row[3] ? parseFloat(row[3]) : null,         // Embedment (column 3)
          end_z: row[4] ? parseFloat(row[4]) : null,             // end z (column 4)
          gain_per_30_seconds: row[5] ? parseFloat(row[5]) : null, // gain per 30 seconds (column 5)
          machine: row[6] ? parseFloat(row[6]) : null,           // Machine (column 6)
          pile_color: row[7]?.trim() || null,                    // Pile Color (column 7)
          pile_id: row[8]?.trim() || null,                       // Pile ID (column 8)
          start_date: startDate,                                 // Start Date (column 9)
          start_time: row[10]?.trim() || null,                   // Start Time (column 10)
          start_z: row[11] ? parseFloat(row[11]) : null,         // start z (column 11)
          stop_time: row[12]?.trim() || null,                    // Stop Time (column 12)
          zone: row[13]?.trim() || null,                         // Zone (column 13)
          pile_status: 'pending' // Default status for all imported piles
        };
      });
      
      batches.push(pilesData);
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
    
    return { data: { count: rows.length }, error: null };
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
                Your CSV file should include columns in this exact order: Block, Design Embedment, Duration, Embedment, end z, gain per 30 seconds, Machine, Pile Color, Pile ID, Start Date, Start Time, start z, Stop Time, Zone.
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-blue-600 text-xs">
                  <span className="font-medium">Column Requirements:</span>
                </p>
                <ul className="text-blue-600 text-xs list-disc ml-4 space-y-1">
                  <li>Block: Text field (e.g., "C3", "C4")</li>
                  <li>Design Embedment: Number (e.g., 10.95)</li>
                  <li>Duration: Time format (e.g., "0:12:05")</li>
                  <li>Embedment: Number (e.g., 13.328)</li>
                  <li>end z: Number in feet (e.g., 717.378)</li>
                  <li>gain per 30 seconds: Number (e.g., 6.62)</li>
                  <li>Machine: Number (e.g., 13118)</li>
                  <li>Pile Color: Text (optional)</li>
                  <li>Pile ID: Text (e.g., "C3.057.12") - used as unique identifier</li>
                  <li>Start Date: Date format MM/DD/YYYY (e.g., "4/8/2025")</li>
                  <li>Start Time: Time format (e.g., "9:55:54")</li>
                  <li>start z: Number in feet (e.g., 730.706)</li>
                  <li>Stop Time: Time format (e.g., "10:07:59")</li>
                  <li>Zone: Text (e.g., "2A2B.INTARRAY")</li>
                </ul>
                <p className="text-blue-600 text-xs mt-2">
                  <span className="font-medium">Important notes:</span>
                </p>
                <ul className="text-blue-600 text-xs list-disc ml-4 space-y-1">
                  <li>All imported piles will have a "pending" status initially</li>
                  <li>Pile IDs should be unique within a project (duplicates will be automatically renamed)</li>
                  <li>Make sure dates are in MM/DD/YYYY format</li>
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