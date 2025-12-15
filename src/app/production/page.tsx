"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Search, Clock, AlertTriangle, AlertCircle, Check, Download, ChevronDown, ChevronUp, FileDown, FileText, TrendingUp, Activity, Zap, Calendar, Target, Award, BarChart2, CalendarDays, Upload, Trash2, X, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccountType } from "@/context/AccountTypeContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Brush } from 'recharts';
import { PreliminaryProductionUploadModal } from "@/components/PreliminaryProductionUploadModal";

interface ProjectData {
  id: string;
  project_name: string;
  project_location: string;
  total_project_piles: number;
  tracker_system: string;
  geotech_company: string;
  role: string;
  created_at: string;
  updated_at: string;
  embedment_tolerance?: number;
}

interface MachineData {
  machineId: string;
  totalPiles: number;
  refusalCount: number;
  toleranceCount: number;
  acceptedCount: number;
  pendingCount: number;
  slowDriveTimeCount: number;
  averageDriveTime: number;
  averageEmbedment: number;
  totalDurationMinutes: number;
  pilesPerBlock: { [blockName: string]: number };
  pilesPerDate: { [date: string]: number };
  firstDate: string | null;
  lastDate: string | null;
}

interface PileData {
  id: string;
  pile_id: string;
  pile_number: string;
  machine: number | string | null;
  block: string | null;
  start_date: string | null;
  duration: string | null;
  embedment: number | null;
  design_embedment: number | null;
  status: string;
  pile_type: string | null;
  published: boolean;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Preliminary data interfaces
interface PreliminaryRecord {
  id: string;
  project_id: string;
  machine: string;
  pile_id: string | null;
  pile_number: string | null;
  block: string | null;
  start_date: string | null;
  start_time: string | null;
  stop_time: string | null;
  duration: string | null;
  embedment: number | null;
  design_embedment: number | null;
  pile_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PreliminaryMachineData {
  machineId: string;
  totalPiles: number;
  refusalCount: number;
  toleranceCount: number;
  acceptedCount: number;
  pendingCount: number;
  slowDriveTimeCount: number;
  averageDriveTime: number;
  averageEmbedment: number;
  totalDurationMinutes: number;
  pilesPerBlock: { [blockName: string]: number };
  pilesPerDate: { [date: string]: number };
  firstDate: string | null;
  lastDate: string | null;
}

// Loading component for Suspense
function ProductionPageLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
    </div>
  );
}

// Main export with Suspense boundary
export default function ProductionPage() {
  return (
    <Suspense fallback={<ProductionPageLoading />}>
      <ProductionPageContent />
    </Suspense>
  );
}

function ProductionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { canEdit } = useAccountType();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  // Data source tab (actual vs preliminary) with URL persistence
  const initialDataSourceTab = searchParams.get('tab') === 'preliminary' ? 'preliminary' : 'actual';
  const [dataSourceTab, setDataSourceTab] = useState<'actual' | 'preliminary'>(initialDataSourceTab);
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [allPiles, setAllPiles] = useState<PileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [machinePiles, setMachinePiles] = useState<PileData[]>([]);
  const [isMachinePilesModalOpen, setIsMachinePilesModalOpen] = useState(false);
  const [isLoadingPiles, setIsLoadingPiles] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, stage: '' });

  // Configuration values
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);
  const [driveTimeThreshold, setDriveTimeThreshold] = useState(10);

  // Date range filter
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");

  // Filtering
  const [filteredMachines, setFilteredMachines] = useState<MachineData[]>([]);
  const [sortBy, setSortBy] = useState("totalPiles");
  const [sortOrder, setSortOrder] = useState("desc");

  // Expanded machine for daily breakdown
  const [expandedMachine, setExpandedMachine] = useState<string | null>(null);
  const [dailyFilterDate, setDailyFilterDate] = useState<string>("");

  // Preliminary data (from separate preliminary_production table)
  const [isPreliminaryModalOpen, setIsPreliminaryModalOpen] = useState(false);
  const [preliminaryData, setPreliminaryData] = useState<PreliminaryRecord[]>([]);
  const [preliminaryMachines, setPreliminaryMachines] = useState<PreliminaryMachineData[]>([]);
  const [preliminaryCount, setPreliminaryCount] = useState(0);
  const [isPreliminaryLoading, setIsPreliminaryLoading] = useState(false);
  const [isClearingPreliminary, setIsClearingPreliminary] = useState(false);
  const [preliminarySelectedTab, setPreliminarySelectedTab] = useState("overview");
  const [filteredPreliminaryMachines, setFilteredPreliminaryMachines] = useState<PreliminaryMachineData[]>([]);
  const [expandedPreliminaryMachine, setExpandedPreliminaryMachine] = useState<string | null>(null);
  const [selectedCompareDate, setSelectedCompareDate] = useState<string | null>(null);
  const [showDataDebug, setShowDataDebug] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'30days' | '90days' | 'all' | 'weekly' | 'monthly'>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth");
      return;
    }

    const loadData = async () => {
      if (user) {
        try {
          const { data: userProjectData } = await supabase
            .from('user_projects')
            .select('project_id, role, is_owner')
            .eq('user_id', user.id)
            .single();

          if (userProjectData) {
            const { data: project } = await supabase
              .from('projects')
              .select('*')
              .eq('id', userProjectData.project_id)
              .single();

            if (project) {
              setProjectData(project);

              const tolerance = project.embedment_tolerance !== undefined && project.embedment_tolerance !== null
                ? project.embedment_tolerance
                : 1;
              setEmbedmentTolerance(tolerance);

              // Get total count of piles with machine data
              let countQuery = supabase
                .from('piles')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id)
                .not('machine', 'is', null);

              if (!canEdit) {
                countQuery = countQuery.eq('published', true);
              }

              const { count, error: countError } = await countQuery;

              if (countError) throw countError;

              const totalCount = count || 0;
              setLoadingProgress({ current: 0, total: 100, stage: 'Loading production data...' });

              let allPilesData: any[] = [];
              const pageSize = 1000;
              const totalPages = Math.ceil(totalCount / pageSize);

              if (totalPages > 0) {
                const fetchPromises = [];

                for (let page = 0; page < totalPages; page++) {
                  const from = page * pageSize;
                  const to = Math.min(from + pageSize - 1, totalCount - 1);

                  let pileQuery = supabase
                    .from('piles')
                    .select('*')
                    .eq('project_id', project.id)
                    .not('machine', 'is', null);

                  if (!canEdit) {
                    pileQuery = pileQuery.eq('published', true);
                  }

                  fetchPromises.push(pileQuery.range(from, to));
                }

                const results = await Promise.allSettled(fetchPromises);

                for (let i = 0; i < results.length; i++) {
                  const result = results[i];
                  if (result.status === 'fulfilled' && result.value.data) {
                    allPilesData = [...allPilesData, ...result.value.data];
                    const progress = Math.round(((i + 1) / totalPages) * 50);
                    setLoadingProgress({ current: progress, total: 100, stage: `Loading production data (${i + 1}/${totalPages})...` });
                  }
                }
              }

              setAllPiles(allPilesData);
              setLoadingProgress({ current: 50, total: 100, stage: 'Processing machine data...' });

              // Extract unique machines
              const uniqueMachines = new Set<string>();
              allPilesData.forEach(pile => {
                if (pile.machine !== null && pile.machine !== undefined) {
                  uniqueMachines.add(String(pile.machine));
                }
              });

              // Process machine data
              const machineMap = new Map<string, MachineData>();

              uniqueMachines.forEach(machineId => {
                machineMap.set(machineId, {
                  machineId,
                  totalPiles: 0,
                  refusalCount: 0,
                  toleranceCount: 0,
                  acceptedCount: 0,
                  pendingCount: 0,
                  slowDriveTimeCount: 0,
                  averageDriveTime: 0,
                  averageEmbedment: 0,
                  totalDurationMinutes: 0,
                  pilesPerBlock: {},
                  pilesPerDate: {},
                  firstDate: null,
                  lastDate: null,
                });
              });

              setLoadingProgress({ current: 60, total: 100, stage: 'Calculating statistics...' });

              // Calculate machine statistics
              const durationSums: { [key: string]: number } = {};
              const embedmentSums: { [key: string]: number } = {};
              const embedmentCounts: { [key: string]: number } = {};

              allPilesData.forEach(pile => {
                if (pile.machine === null || pile.machine === undefined) return;

                const machineId = String(pile.machine);
                const machineData = machineMap.get(machineId);
                if (!machineData) return;

                machineData.totalPiles++;

                // Track piles per block
                if (pile.block) {
                  machineData.pilesPerBlock[pile.block] = (machineData.pilesPerBlock[pile.block] || 0) + 1;
                }

                // Track piles per date
                if (pile.start_date) {
                  const dateKey = pile.start_date.split('T')[0];
                  machineData.pilesPerDate[dateKey] = (machineData.pilesPerDate[dateKey] || 0) + 1;

                  // Track first and last dates
                  if (!machineData.firstDate || dateKey < machineData.firstDate) {
                    machineData.firstDate = dateKey;
                  }
                  if (!machineData.lastDate || dateKey > machineData.lastDate) {
                    machineData.lastDate = dateKey;
                  }
                }

                // Parse duration
                const duration = parseDuration(pile.duration);
                durationSums[machineId] = (durationSums[machineId] || 0) + duration;
                machineData.totalDurationMinutes += duration;

                // Count slow drive time
                if (duration > driveTimeThreshold) {
                  machineData.slowDriveTimeCount++;
                }

                // Calculate status based on embedment
                if (pile.embedment && pile.design_embedment) {
                  const embedment = Number(pile.embedment);
                  const designEmbedment = Number(pile.design_embedment);

                  embedmentSums[machineId] = (embedmentSums[machineId] || 0) + embedment;
                  embedmentCounts[machineId] = (embedmentCounts[machineId] || 0) + 1;

                  if (embedment >= designEmbedment) {
                    machineData.acceptedCount++;
                  } else if (embedment >= (designEmbedment - tolerance)) {
                    machineData.toleranceCount++;
                  } else {
                    machineData.refusalCount++;
                  }
                } else {
                  machineData.pendingCount++;
                }
              });

              setLoadingProgress({ current: 80, total: 100, stage: 'Finalizing data...' });

              // Calculate averages
              uniqueMachines.forEach(machineId => {
                const machineData = machineMap.get(machineId);
                if (!machineData || machineData.totalPiles === 0) return;

                machineData.averageDriveTime = durationSums[machineId] / machineData.totalPiles;

                if (embedmentCounts[machineId]) {
                  machineData.averageEmbedment = embedmentSums[machineId] / embedmentCounts[machineId];
                }
              });

              const machineArray = Array.from(machineMap.values());
              setMachines(machineArray);
              setLoadingProgress({ current: 100, total: 100, stage: 'Complete!' });
              setIsLoading(false);
            }
          }
        } catch (error) {
          console.error("Error loading production data:", error);
          toast.error("Failed to load production data");
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [user, router, authLoading, canEdit]);

  // Handle data source tab change with URL persistence
  const handleDataSourceTabChange = (tab: string) => {
    const newTab = tab as 'actual' | 'preliminary';
    setDataSourceTab(newTab);
    // Update URL without full page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.replace(`/production?${params.toString()}`, { scroll: false });
  };

  // Load preliminary data from separate table (with pagination to handle >1000 rows)
  const loadPreliminaryData = async () => {
    if (!projectData?.id) return;

    setIsPreliminaryLoading(true);
    try {
      // First get the total count
      const { count, error: countError } = await supabase
        .from('preliminary_production')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectData.id);

      if (countError) throw countError;

      const totalCount = count || 0;
      setPreliminaryCount(totalCount);

      // Load all data in batches of 1000 (Supabase default limit)
      const PAGE_SIZE = 1000;
      const allData: PreliminaryRecord[] = [];
      const totalPages = Math.ceil(totalCount / PAGE_SIZE);

      // Load pages in parallel for speed
      const pagePromises = [];
      for (let page = 0; page < totalPages; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        pagePromises.push(
          supabase
            .from('preliminary_production')
            .select('*')
            .eq('project_id', projectData.id)
            .order('created_at', { ascending: false })
            .range(from, to)
        );
      }

      const results = await Promise.all(pagePromises);
      for (const result of results) {
        if (result.error) throw result.error;
        if (result.data) allData.push(...result.data);
      }

      // Deduplicate by ID (in case of any overlap from parallel queries)
      const uniqueData = Array.from(
        new Map(allData.map(item => [item.id, item])).values()
      );

      setPreliminaryData(uniqueData);

      // Process machine statistics from preliminary data
      const machineMap = new Map<string, PreliminaryMachineData>();
      const durationSums: { [key: string]: number } = {};
      const embedmentSums: { [key: string]: number } = {};
      const embedmentCounts: { [key: string]: number } = {};

      // Helper function to parse various date formats to ISO (YYYY-MM-DD)
      const parseDateToISO = (dateStr: string | null | undefined): string | null => {
        if (!dateStr) return null;
        const str = String(dateStr).trim();
        if (!str) return null;

        // Already ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          return str.split('T')[0];
        }

        // MM/DD/YYYY or M/D/YYYY format
        const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
          const month = slashMatch[1].padStart(2, '0');
          const day = slashMatch[2].padStart(2, '0');
          const year = slashMatch[3];
          return `${year}-${month}-${day}`;
        }

        // MM-DD-YYYY format
        const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dashMatch) {
          const month = dashMatch[1].padStart(2, '0');
          const day = dashMatch[2].padStart(2, '0');
          const year = dashMatch[3];
          return `${year}-${month}-${day}`;
        }

        // YYYY/MM/DD format
        const slashISOMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (slashISOMatch) {
          const year = slashISOMatch[1];
          const month = slashISOMatch[2].padStart(2, '0');
          const day = slashISOMatch[3].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        // Excel serial number (days since 1899-12-30)
        if (/^\d{5}$/.test(str)) {
          const serial = parseInt(str);
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }

        // Try native Date parsing as fallback (handles "November 26, 2024", etc.)
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          // Ensure we get local date, not UTC
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }

        return null;
      };

      uniqueData.forEach(record => {
        if (!record.machine) return;

        const machineId = String(record.machine).trim();

        // Skip invalid machine IDs (empty, unknown, null-like values)
        if (!machineId || machineId.toLowerCase() === 'unknown' || machineId.toLowerCase() === 'null' || machineId.toLowerCase() === 'undefined') {
          return;
        }

        if (!machineMap.has(machineId)) {
          machineMap.set(machineId, {
            machineId,
            totalPiles: 0,
            refusalCount: 0,
            toleranceCount: 0,
            acceptedCount: 0,
            pendingCount: 0,
            slowDriveTimeCount: 0,
            averageDriveTime: 0,
            averageEmbedment: 0,
            totalDurationMinutes: 0,
            pilesPerBlock: {},
            pilesPerDate: {},
            firstDate: null,
            lastDate: null,
          });
        }

        const machineData = machineMap.get(machineId)!;
        machineData.totalPiles++;

        // Track blocks
        if (record.block) {
          machineData.pilesPerBlock[record.block] =
            (machineData.pilesPerBlock[record.block] || 0) + 1;
        }

        // Track dates - use the date parser to handle various formats
        const dateKey = parseDateToISO(record.start_date);
        if (dateKey) {
          machineData.pilesPerDate[dateKey] =
            (machineData.pilesPerDate[dateKey] || 0) + 1;

          if (!machineData.firstDate || dateKey < machineData.firstDate) {
            machineData.firstDate = dateKey;
          }
          if (!machineData.lastDate || dateKey > machineData.lastDate) {
            machineData.lastDate = dateKey;
          }
        }

        // Track duration
        const duration = parseDuration(record.duration);
        durationSums[machineId] = (durationSums[machineId] || 0) + duration;
        machineData.totalDurationMinutes += duration;

        // Count slow drive time
        if (duration > driveTimeThreshold) {
          machineData.slowDriveTimeCount++;
        }

        // Calculate status based on embedment
        if (record.embedment && record.design_embedment) {
          const embedment = Number(record.embedment);
          const designEmbedment = Number(record.design_embedment);

          embedmentSums[machineId] = (embedmentSums[machineId] || 0) + embedment;
          embedmentCounts[machineId] = (embedmentCounts[machineId] || 0) + 1;

          if (embedment >= designEmbedment) {
            machineData.acceptedCount++;
          } else if (embedment >= (designEmbedment - embedmentTolerance)) {
            machineData.toleranceCount++;
          } else {
            machineData.refusalCount++;
          }
        } else {
          machineData.pendingCount++;
        }
      });

      // Calculate averages
      machineMap.forEach((machineData, machineId) => {
        if (machineData.totalPiles > 0) {
          machineData.averageDriveTime =
            durationSums[machineId] / machineData.totalPiles;

          if (embedmentCounts[machineId]) {
            machineData.averageEmbedment = embedmentSums[machineId] / embedmentCounts[machineId];
          }
        }
      });

      setPreliminaryMachines(Array.from(machineMap.values()));
    } catch (error) {
      console.error('Error loading preliminary data:', error);
      toast.error('Failed to load preliminary data');
    } finally {
      setIsPreliminaryLoading(false);
    }
  };

  // Load preliminary count (just the count, for badge display)
  const loadPreliminaryCount = async () => {
    if (!projectData?.id) return;

    try {
      const { count, error } = await supabase
        .from('preliminary_production')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectData.id);

      if (!error) {
        setPreliminaryCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading preliminary count:', error);
    }
  };

  // Load preliminary count when project data is available
  useEffect(() => {
    if (projectData?.id) {
      loadPreliminaryCount();
    }
  }, [projectData?.id]);

  // Load preliminary data when switching to preliminary tab
  useEffect(() => {
    if (dataSourceTab === 'preliminary' && projectData?.id) {
      loadPreliminaryData();
    }
  }, [dataSourceTab, projectData?.id]);

  // Delete individual preliminary record
  const handleDeletePreliminaryRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('preliminary_production')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast.success('Pile deleted');
      // Refresh the data
      loadPreliminaryData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete pile');
    }
  };

  // Clear all preliminary data
  const handleClearPreliminaryData = async () => {
    if (!projectData?.id) return;

    if (!confirm('Are you sure you want to delete ALL preliminary production data? This action cannot be undone.')) {
      return;
    }

    setIsClearingPreliminary(true);
    try {
      const { error } = await supabase
        .from('preliminary_production')
        .delete()
        .eq('project_id', projectData.id);

      if (error) throw error;

      toast.success('All preliminary data cleared');
      setPreliminaryData([]);
      setPreliminaryMachines([]);
      setPreliminaryCount(0);
    } catch (error) {
      console.error('Error clearing preliminary data:', error);
      toast.error('Failed to clear preliminary data');
    } finally {
      setIsClearingPreliminary(false);
    }
  };

  // Function to parse duration string to minutes
  const parseDuration = (durationString: string | null): number => {
    if (!durationString) return 0;

    try {
      if (durationString.includes(':')) {
        const parts = durationString.split(':');
        if (parts.length === 3) {
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          const seconds = parseInt(parts[2], 10);
          return hours * 60 + minutes + (seconds / 60);
        } else if (parts.length === 2) {
          const minutes = parseInt(parts[0], 10);
          const seconds = parseInt(parts[1], 10);
          return minutes + (seconds / 60);
        }
      } else if (durationString.includes('min')) {
        const regex = /(\d+)\s*min(?:\s*(\d+)\s*sec)?/i;
        const match = durationString.match(regex);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = match[2] ? parseInt(match[2], 10) : 0;
          return minutes + (seconds / 60);
        }
      }

      const minutes = parseFloat(durationString);
      if (!isNaN(minutes)) return minutes;

      return 0;
    } catch (err) {
      return 0;
    }
  };

  // Helper function to parse various date formats to ISO (YYYY-MM-DD)
  const parseDateToISO = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (!str) return null;

    // Already ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.split('T')[0];
    }

    // MM/DD/YYYY or M/D/YYYY format
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, '0');
      const day = slashMatch[2].padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}-${day}`;
    }

    // MM-DD-YYYY format
    const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const month = dashMatch[1].padStart(2, '0');
      const day = dashMatch[2].padStart(2, '0');
      const year = dashMatch[3];
      return `${year}-${month}-${day}`;
    }

    // YYYY/MM/DD format
    const slashISOMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (slashISOMatch) {
      const year = slashISOMatch[1];
      const month = slashISOMatch[2].padStart(2, '0');
      const day = slashISOMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Excel serial number (days since 1899-12-30)
    if (/^\d{5}$/.test(str)) {
      const serial = parseInt(str);
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try native Date parsing as fallback (handles "November 26, 2024", etc.)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      // Ensure we get local date, not UTC
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  };

  // Filter and sort machines
  useEffect(() => {
    let filtered = [...machines];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(machine =>
        machine.machineId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date range filter
    if (dateRangeStart || dateRangeEnd) {
      filtered = filtered.filter(machine => {
        const machineDates = Object.keys(machine.pilesPerDate);
        if (machineDates.length === 0) return false;

        return machineDates.some(date => {
          if (dateRangeStart && date < dateRangeStart) return false;
          if (dateRangeEnd && date > dateRangeEnd) return false;
          return true;
        });
      });
    }

    // Apply tab filter
    if (selectedTab === "performance") {
      filtered = filtered.filter(machine => machine.refusalCount > 0 || machine.slowDriveTimeCount > 0);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "machineId":
          comparison = a.machineId.localeCompare(b.machineId, undefined, { numeric: true });
          break;
        case "totalPiles":
          comparison = a.totalPiles - b.totalPiles;
          break;
        case "acceptedPercent":
          const acceptedA = a.totalPiles > 0 ? (a.acceptedCount / a.totalPiles) : 0;
          const acceptedB = b.totalPiles > 0 ? (b.acceptedCount / b.totalPiles) : 0;
          comparison = acceptedA - acceptedB;
          break;
        case "refusalPercent":
          const refusalA = a.totalPiles > 0 ? (a.refusalCount / a.totalPiles) : 0;
          const refusalB = b.totalPiles > 0 ? (b.refusalCount / b.totalPiles) : 0;
          comparison = refusalA - refusalB;
          break;
        case "averageDriveTime":
          comparison = a.averageDriveTime - b.averageDriveTime;
          break;
        case "averageEmbedment":
          comparison = a.averageEmbedment - b.averageEmbedment;
          break;
        default:
          comparison = b.totalPiles - a.totalPiles;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredMachines(filtered);
  }, [machines, searchQuery, selectedTab, sortBy, sortOrder, dateRangeStart, dateRangeEnd]);

  // Chart data calculations
  const chartData = useMemo(() => {
    // Top machines by total piles with rates
    const topMachinesByPiles = [...machines]
      .sort((a, b) => b.totalPiles - a.totalPiles)
      .slice(0, 10)
      .map(m => ({
        name: `#${m.machineId}`,
        machineId: m.machineId,
        piles: m.totalPiles,
        accepted: m.acceptedCount,
        tolerance: m.toleranceCount,
        refusal: m.refusalCount,
        acceptedRate: m.totalPiles > 0 ? Math.round((m.acceptedCount / m.totalPiles) * 100) : 0,
        toleranceRate: m.totalPiles > 0 ? Math.round((m.toleranceCount / m.totalPiles) * 100) : 0,
        refusalRate: m.totalPiles > 0 ? Math.round((m.refusalCount / m.totalPiles) * 100) : 0,
      }));

    // Machine efficiency (accepted rate)
    const machineEfficiency = [...machines]
      .filter(m => m.totalPiles > 0)
      .sort((a, b) => (b.acceptedCount / b.totalPiles) - (a.acceptedCount / a.totalPiles))
      .slice(0, 10)
      .map(m => ({
        name: `Machine ${m.machineId}`,
        efficiency: Math.round((m.acceptedCount / m.totalPiles) * 100),
        avgDriveTime: Math.round(m.averageDriveTime * 10) / 10,
      }));

    // Daily production trend
    const dailyProduction: { [date: string]: number } = {};
    machines.forEach(m => {
      Object.entries(m.pilesPerDate).forEach(([date, count]) => {
        dailyProduction[date] = (dailyProduction[date] || 0) + count;
      });
    });

    const productionTrend = Object.entries(dailyProduction)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({
        date: format(parseISO(date), 'MMM d'),
        fullDate: date,
        piles: count,
      }));

    // Piles per block distribution
    const blockDistribution: { [block: string]: number } = {};
    machines.forEach(m => {
      Object.entries(m.pilesPerBlock).forEach(([block, count]) => {
        blockDistribution[block] = (blockDistribution[block] || 0) + count;
      });
    });

    const topBlocks = Object.entries(blockDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([block, count]) => ({
        name: block,
        value: count,
      }));

    return { topMachinesByPiles, machineEfficiency, productionTrend, topBlocks };
  }, [machines]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalPiles = machines.reduce((sum, m) => sum + m.totalPiles, 0);
    const totalAccepted = machines.reduce((sum, m) => sum + m.acceptedCount, 0);
    const totalRefusal = machines.reduce((sum, m) => sum + m.refusalCount, 0);
    const totalTolerance = machines.reduce((sum, m) => sum + m.toleranceCount, 0);
    const avgDriveTime = machines.length > 0
      ? machines.reduce((sum, m) => sum + m.averageDriveTime, 0) / machines.length
      : 0;
    const topMachine = machines.reduce((top, m) => m.totalPiles > (top?.totalPiles || 0) ? m : top, machines[0]);

    return { totalPiles, totalAccepted, totalRefusal, totalTolerance, avgDriveTime, topMachine };
  }, [machines]);

  // Preliminary chart data calculations
  const preliminaryChartData = useMemo(() => {
    // Top machines by total piles with rates
    const topMachinesByPiles = [...preliminaryMachines]
      .sort((a, b) => b.totalPiles - a.totalPiles)
      .slice(0, 10)
      .map(m => ({
        name: `#${m.machineId}`,
        machineId: m.machineId,
        piles: m.totalPiles,
        accepted: m.acceptedCount,
        tolerance: m.toleranceCount,
        refusal: m.refusalCount,
        acceptedRate: m.totalPiles > 0 ? Math.round((m.acceptedCount / m.totalPiles) * 100) : 0,
        toleranceRate: m.totalPiles > 0 ? Math.round((m.toleranceCount / m.totalPiles) * 100) : 0,
        refusalRate: m.totalPiles > 0 ? Math.round((m.refusalCount / m.totalPiles) * 100) : 0,
      }));

    // Machine efficiency (accepted rate)
    const machineEfficiency = [...preliminaryMachines]
      .filter(m => m.totalPiles > 0)
      .sort((a, b) => (b.acceptedCount / b.totalPiles) - (a.acceptedCount / a.totalPiles))
      .slice(0, 10)
      .map(m => ({
        name: `Machine ${m.machineId}`,
        efficiency: Math.round((m.acceptedCount / m.totalPiles) * 100),
        avgDriveTime: Math.round(m.averageDriveTime * 10) / 10,
      }));

    // Daily production trend
    const dailyProduction: { [date: string]: number } = {};
    preliminaryMachines.forEach(m => {
      Object.entries(m.pilesPerDate).forEach(([date, count]) => {
        // Normalize date key to ISO format if not already
        let normalizedDate = date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          // Try to parse and convert to ISO
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            normalizedDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
          }
        }
        dailyProduction[normalizedDate] = (dailyProduction[normalizedDate] || 0) + count;
      });
    });

    // Safe date formatter that handles various formats
    const safeFormatDate = (dateStr: string): string => {
      try {
        // If already ISO format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return format(parseISO(dateStr), 'MMM d');
        }
        // Try parsing with native Date
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return format(parsed, 'MMM d');
        }
        return dateStr; // Return as-is if parsing fails
      } catch {
        return dateStr;
      }
    };

    const productionTrend = Object.entries(dailyProduction)
      .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)) // Only include valid ISO dates
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({
        date: safeFormatDate(date),
        fullDate: date,
        piles: count,
      }));

    // Piles per block distribution
    const blockDistribution: { [block: string]: number } = {};
    preliminaryMachines.forEach(m => {
      Object.entries(m.pilesPerBlock).forEach(([block, count]) => {
        blockDistribution[block] = (blockDistribution[block] || 0) + count;
      });
    });

    const topBlocks = Object.entries(blockDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([block, count]) => ({
        name: block,
        value: count,
      }));

    return { topMachinesByPiles, machineEfficiency, productionTrend, topBlocks };
  }, [preliminaryMachines]);

  // Preliminary summary statistics
  const preliminarySummaryStats = useMemo(() => {
    const totalPiles = preliminaryMachines.reduce((sum, m) => sum + m.totalPiles, 0);
    const totalAccepted = preliminaryMachines.reduce((sum, m) => sum + m.acceptedCount, 0);
    const totalRefusal = preliminaryMachines.reduce((sum, m) => sum + m.refusalCount, 0);
    const totalTolerance = preliminaryMachines.reduce((sum, m) => sum + m.toleranceCount, 0);
    const avgDriveTime = preliminaryMachines.length > 0
      ? preliminaryMachines.reduce((sum, m) => sum + m.averageDriveTime, 0) / preliminaryMachines.length
      : 0;
    const topMachine = preliminaryMachines.reduce((top, m) => m.totalPiles > (top?.totalPiles || 0) ? m : top, preliminaryMachines[0]);

    return { totalPiles, totalAccepted, totalRefusal, totalTolerance, avgDriveTime, topMachine };
  }, [preliminaryMachines]);

  // Comprehensive daily production data for the dashboard
  const preliminaryDailyData = useMemo(() => {
    // Aggregate all dates and their production
    const dailyMap: { [date: string]: { total: number; machines: { [id: string]: number } } } = {};

    preliminaryMachines.forEach(m => {
      Object.entries(m.pilesPerDate).forEach(([date, count]) => {
        if (!dailyMap[date]) {
          dailyMap[date] = { total: 0, machines: {} };
        }
        dailyMap[date].total += count;
        dailyMap[date].machines[m.machineId] = count;
      });
    });

    // Convert to sorted array
    const sortedDays = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        total: data.total,
        machines: data.machines,
        machineCount: Object.keys(data.machines).length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate stats
    const totalDays = sortedDays.length;
    const firstDate = sortedDays[0]?.date || null;
    const lastDate = sortedDays[sortedDays.length - 1]?.date || null;
    const totalPiles = sortedDays.reduce((sum, d) => sum + d.total, 0);
    const avgPerDay = totalDays > 0 ? totalPiles / totalDays : 0;
    const maxDay = sortedDays.reduce((max, d) => d.total > (max?.total || 0) ? d : max, sortedDays[0]);
    const minDay = sortedDays.reduce((min, d) => d.total < (min?.total || Infinity) ? d : min, sortedDays[0]);

    return {
      days: sortedDays,
      totalDays,
      firstDate,
      lastDate,
      totalPiles,
      avgPerDay,
      maxDay,
      minDay,
    };
  }, [preliminaryMachines]);

  // Process chart data based on view mode - handles aggregation and smart labeling
  const chartDisplayData = useMemo(() => {
    if (preliminaryDailyData.days.length === 0) {
      return { data: [], tickInterval: 1, showBrush: false };
    }

    let filteredDays = [...preliminaryDailyData.days];
    const totalDays = filteredDays.length;

    // Filter by date range if not showing all or aggregated views
    if (chartViewMode === '30days') {
      filteredDays = filteredDays.slice(-30);
    } else if (chartViewMode === '90days') {
      filteredDays = filteredDays.slice(-90);
    }

    // For weekly aggregation
    if (chartViewMode === 'weekly') {
      const weeklyMap: { [weekStart: string]: { total: number; machines: Set<string>; days: number } } = {};

      filteredDays.forEach(day => {
        const date = parseISO(day.date);
        // Get Monday of the week
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        const weekKey = format(monday, 'yyyy-MM-dd');

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { total: 0, machines: new Set(), days: 0 };
        }
        weeklyMap[weekKey].total += day.total;
        Object.keys(day.machines).forEach(m => weeklyMap[weekKey].machines.add(m));
        weeklyMap[weekKey].days++;
      });

      const weeklyData = Object.entries(weeklyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([weekStart, data]) => ({
          date: `Week of ${format(parseISO(weekStart), 'MMM d')}`,
          fullDate: weekStart,
          piles: data.total,
          machines: data.machines.size,
          avg: Math.round(preliminaryDailyData.avgPerDay * 7), // Weekly average
          daysInWeek: data.days,
        }));

      return {
        data: weeklyData,
        tickInterval: weeklyData.length > 20 ? Math.ceil(weeklyData.length / 15) : 1,
        showBrush: weeklyData.length > 15,
        isAggregated: true,
        aggregationType: 'weekly',
      };
    }

    // For monthly aggregation
    if (chartViewMode === 'monthly') {
      const monthlyMap: { [monthKey: string]: { total: number; machines: Set<string>; days: number } } = {};

      filteredDays.forEach(day => {
        const monthKey = day.date.substring(0, 7); // YYYY-MM

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { total: 0, machines: new Set(), days: 0 };
        }
        monthlyMap[monthKey].total += day.total;
        Object.keys(day.machines).forEach(m => monthlyMap[monthKey].machines.add(m));
        monthlyMap[monthKey].days++;
      });

      const monthlyData = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, data]) => ({
          date: format(parseISO(`${monthKey}-01`), 'MMM yyyy'),
          fullDate: monthKey,
          piles: data.total,
          machines: data.machines.size,
          avg: Math.round(preliminaryDailyData.avgPerDay * data.days),
          daysInMonth: data.days,
        }));

      return {
        data: monthlyData,
        tickInterval: 1,
        showBrush: monthlyData.length > 12,
        isAggregated: true,
        aggregationType: 'monthly',
      };
    }

    // Daily view (30days, 90days, or all)
    const displayDays = filteredDays.length;

    // Smart tick interval based on number of days
    let tickInterval = 1;
    if (displayDays > 200) tickInterval = 14; // Every 2 weeks
    else if (displayDays > 100) tickInterval = 7; // Weekly
    else if (displayDays > 60) tickInterval = 5;
    else if (displayDays > 30) tickInterval = 3;
    else if (displayDays > 14) tickInterval = 2;

    // Format labels smartly - show month name when it changes
    let lastMonth = '';
    const dailyData = filteredDays.map((day, idx) => {
      const date = parseISO(day.date);
      const currentMonth = format(date, 'MMM');
      let label: string;

      if (displayDays > 60) {
        // For long ranges, show "MMM d" only on tick intervals
        if (idx % tickInterval === 0 || currentMonth !== lastMonth) {
          label = currentMonth !== lastMonth ? format(date, 'MMM d') : format(date, 'd');
        } else {
          label = '';
        }
      } else {
        label = format(date, 'MMM d');
      }

      lastMonth = currentMonth;

      return {
        date: label,
        fullDate: day.date,
        piles: day.total,
        machines: day.machineCount,
        avg: Math.round(preliminaryDailyData.avgPerDay),
      };
    });

    return {
      data: dailyData,
      tickInterval,
      showBrush: displayDays > 30,
      isAggregated: false,
      aggregationType: 'daily',
    };
  }, [preliminaryDailyData, chartViewMode]);

  // Debug data for data verification
  const preliminaryDebugData = useMemo(() => {
    // Raw date analysis from preliminary records
    const rawDates: { [date: string]: number } = {};
    const nullDates: number = preliminaryData.filter(r => !r.start_date).length;
    const machineStats: { [id: string]: { total: number; dates: string[] } } = {};

    // Track excluded records and reasons
    let excludedNoMachine = 0;
    let excludedInvalidMachine = 0;
    const invalidMachineValues: string[] = [];

    preliminaryData.forEach(record => {
      if (record.start_date) {
        const dateStr = String(record.start_date);
        rawDates[dateStr] = (rawDates[dateStr] || 0) + 1;
      }

      // Check for invalid machine IDs (same logic as processing)
      if (!record.machine) {
        excludedNoMachine++;
      } else {
        const machineId = String(record.machine).trim();
        if (!machineId || machineId.toLowerCase() === 'unknown' || machineId.toLowerCase() === 'null' || machineId.toLowerCase() === 'undefined') {
          excludedInvalidMachine++;
          if (!invalidMachineValues.includes(machineId || '(empty)')) {
            invalidMachineValues.push(machineId || '(empty)');
          }
        } else {
          if (!machineStats[machineId]) {
            machineStats[machineId] = { total: 0, dates: [] };
          }
          machineStats[machineId].total++;
          if (record.start_date && !machineStats[machineId].dates.includes(String(record.start_date))) {
            machineStats[machineId].dates.push(String(record.start_date));
          }
        }
      }
    });

    const totalExcluded = excludedNoMachine + excludedInvalidMachine;
    const processableRecords = preliminaryData.length - totalExcluded;

    return {
      totalRecords: preliminaryData.length,
      nullDates,
      uniqueRawDates: Object.keys(rawDates).length,
      rawDateCounts: rawDates,
      machineStats,
      processedDates: preliminaryDailyData.totalDays,
      processedTotal: preliminaryDailyData.totalPiles,
      // New fields for exclusion tracking
      excludedNoMachine,
      excludedInvalidMachine,
      totalExcluded,
      processableRecords,
      invalidMachineValues,
    };
  }, [preliminaryData, preliminaryDailyData]);

  // Filter and sort preliminary machines
  useEffect(() => {
    let filtered: PreliminaryMachineData[];

    // If a specific date is selected, recalculate machine stats for just that date
    if (selectedCompareDate) {
      // Filter raw data to just the selected date and recalculate machine stats
      const dateFilteredRecords = preliminaryData.filter(record => {
        const recordDate = parseDateToISO(record.start_date);
        return recordDate === selectedCompareDate;
      });

      // Build machine data from filtered records
      const machineMap = new Map<string, PreliminaryMachineData>();
      const durationSums: { [key: string]: number } = {};
      const embedmentSums: { [key: string]: number } = {};
      const embedmentCounts: { [key: string]: number } = {};

      dateFilteredRecords.forEach(record => {
        if (!record.machine) return;
        const machineId = String(record.machine).trim();
        if (!machineId || machineId.toLowerCase() === 'unknown' || machineId.toLowerCase() === 'null' || machineId.toLowerCase() === 'undefined') {
          return;
        }

        if (!machineMap.has(machineId)) {
          machineMap.set(machineId, {
            machineId,
            totalPiles: 0,
            refusalCount: 0,
            toleranceCount: 0,
            acceptedCount: 0,
            pendingCount: 0,
            slowDriveTimeCount: 0,
            averageDriveTime: 0,
            averageEmbedment: 0,
            totalDurationMinutes: 0,
            pilesPerBlock: {},
            pilesPerDate: {},
            firstDate: selectedCompareDate,
            lastDate: selectedCompareDate,
          });
        }

        const machineData = machineMap.get(machineId)!;
        machineData.totalPiles++;

        // Track blocks
        if (record.block) {
          machineData.pilesPerBlock[record.block] = (machineData.pilesPerBlock[record.block] || 0) + 1;
        }

        // Track date (should all be the same date)
        machineData.pilesPerDate[selectedCompareDate] = (machineData.pilesPerDate[selectedCompareDate] || 0) + 1;

        // Track duration
        const duration = parseDuration(record.duration);
        durationSums[machineId] = (durationSums[machineId] || 0) + duration;
        machineData.totalDurationMinutes += duration;

        // Count slow drive time
        if (duration > driveTimeThreshold) {
          machineData.slowDriveTimeCount++;
        }

        // Calculate status based on embedment
        if (record.embedment && record.design_embedment) {
          const embedment = Number(record.embedment);
          const designEmbedment = Number(record.design_embedment);

          embedmentSums[machineId] = (embedmentSums[machineId] || 0) + embedment;
          embedmentCounts[machineId] = (embedmentCounts[machineId] || 0) + 1;

          if (embedment >= designEmbedment) {
            machineData.acceptedCount++;
          } else if (embedment >= (designEmbedment - embedmentTolerance)) {
            machineData.toleranceCount++;
          } else {
            machineData.refusalCount++;
          }
        } else {
          machineData.pendingCount++;
        }
      });

      // Calculate averages
      machineMap.forEach((machineData, machineId) => {
        if (machineData.totalPiles > 0) {
          machineData.averageDriveTime = durationSums[machineId] / machineData.totalPiles;
          if (embedmentCounts[machineId]) {
            machineData.averageEmbedment = embedmentSums[machineId] / embedmentCounts[machineId];
          }
        }
      });

      filtered = Array.from(machineMap.values());
    } else {
      // No date filter - use the pre-calculated machine data
      filtered = [...preliminaryMachines];
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(machine =>
        machine.machineId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date range filter (only when not filtering by specific date)
    if (!selectedCompareDate && (dateRangeStart || dateRangeEnd)) {
      filtered = filtered.filter(machine => {
        const machineDates = Object.keys(machine.pilesPerDate);
        if (machineDates.length === 0) return false;

        return machineDates.some(date => {
          if (dateRangeStart && date < dateRangeStart) return false;
          if (dateRangeEnd && date > dateRangeEnd) return false;
          return true;
        });
      });
    }

    // Apply tab filter for performance issues
    if (preliminarySelectedTab === "performance") {
      filtered = filtered.filter(machine => machine.refusalCount > 0 || machine.slowDriveTimeCount > 0);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "machineId":
          comparison = a.machineId.localeCompare(b.machineId, undefined, { numeric: true });
          break;
        case "totalPiles":
          comparison = a.totalPiles - b.totalPiles;
          break;
        case "acceptedPercent":
          const acceptedA = a.totalPiles > 0 ? (a.acceptedCount / a.totalPiles) : 0;
          const acceptedB = b.totalPiles > 0 ? (b.acceptedCount / b.totalPiles) : 0;
          comparison = acceptedA - acceptedB;
          break;
        case "refusalPercent":
          const refusalA = a.totalPiles > 0 ? (a.refusalCount / a.totalPiles) : 0;
          const refusalB = b.totalPiles > 0 ? (b.refusalCount / b.totalPiles) : 0;
          comparison = refusalA - refusalB;
          break;
        case "averageDriveTime":
          comparison = a.averageDriveTime - b.averageDriveTime;
          break;
        case "averageEmbedment":
          comparison = a.averageEmbedment - b.averageEmbedment;
          break;
        default:
          comparison = b.totalPiles - a.totalPiles;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredPreliminaryMachines(filtered);
  }, [preliminaryMachines, preliminaryData, searchQuery, preliminarySelectedTab, sortBy, sortOrder, dateRangeStart, dateRangeEnd, selectedCompareDate, embedmentTolerance, driveTimeThreshold]);

  // Get daily breakdown data for a preliminary machine
  const getPreliminaryDailyBreakdown = (machine: PreliminaryMachineData, filterDate?: string) => {
    const dailyData = Object.entries(machine.pilesPerDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    if (filterDate) {
      return dailyData.filter(d => d.date === filterDate);
    }
    return dailyData;
  };

  // Toggle expanded preliminary machine
  const togglePreliminaryMachineExpand = (machineId: string) => {
    if (expandedPreliminaryMachine === machineId) {
      setExpandedPreliminaryMachine(null);
      setDailyFilterDate("");
    } else {
      setExpandedPreliminaryMachine(machineId);
      setDailyFilterDate("");
    }
  };

  // Get daily breakdown data for a specific machine
  const getDailyBreakdown = (machine: MachineData, filterDate?: string) => {
    const dailyData = Object.entries(machine.pilesPerDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    if (filterDate) {
      return dailyData.filter(d => d.date === filterDate);
    }
    return dailyData;
  };

  // Toggle expanded machine
  const toggleMachineExpand = (machineId: string) => {
    if (expandedMachine === machineId) {
      setExpandedMachine(null);
      setDailyFilterDate("");
    } else {
      setExpandedMachine(machineId);
      setDailyFilterDate("");
    }
  };

  const handleViewMachinePiles = async (machineId: string) => {
    if (!projectData) return;

    try {
      setSelectedMachine(machineId);
      setIsLoadingPiles(true);
      setIsMachinePilesModalOpen(true);

      let query = supabase
        .from('piles')
        .select('*')
        .eq('project_id', projectData.id)
        .eq('machine', machineId);

      if (!canEdit) {
        query = query.eq('published', true);
      }

      const { data: pileData, error } = await query;

      if (error) throw error;

      const processedPileData = pileData?.map(pile => {
        if (pile.embedment && pile.design_embedment) {
          const embedment = Number(pile.embedment);
          const designEmbedment = Number(pile.design_embedment);

          if (embedment >= designEmbedment) {
            return { ...pile, status: 'accepted' };
          } else if (embedment >= (designEmbedment - embedmentTolerance)) {
            return { ...pile, status: 'tolerance' };
          } else {
            return { ...pile, status: 'refusal' };
          }
        }
        return { ...pile, status: 'pending' };
      });

      setMachinePiles(processedPileData || []);
    } catch (error) {
      console.error(`Error loading piles for machine ${machineId}:`, error);
      toast.error("Failed to load piles data");
    } finally {
      setIsLoadingPiles(false);
    }
  };

  const formatNumber = (num: number, decimals = 1) => num.toFixed(decimals);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const exportToExcel = () => {
    if (!machines.length) {
      toast.error("No production data to export");
      return;
    }

    try {
      const exportData = filteredMachines.map(machine => ({
        'Machine ID': machine.machineId,
        'Total Piles': machine.totalPiles,
        'Accepted': machine.acceptedCount,
        'Accepted %': machine.totalPiles > 0 ? ((machine.acceptedCount / machine.totalPiles) * 100).toFixed(1) : '0',
        'Tolerance': machine.toleranceCount,
        'Refusal': machine.refusalCount,
        'Refusal %': machine.totalPiles > 0 ? ((machine.refusalCount / machine.totalPiles) * 100).toFixed(1) : '0',
        'Slow Drive Count': machine.slowDriveTimeCount,
        'Avg Drive Time (min)': formatNumber(machine.averageDriveTime),
        'Avg Embedment (ft)': formatNumber(machine.averageEmbedment, 2),
        'Total Time (min)': formatNumber(machine.totalDurationMinutes),
        'First Date': machine.firstDate || 'N/A',
        'Last Date': machine.lastDate || 'N/A',
        'Blocks Worked': Object.keys(machine.pilesPerBlock).length,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Production");

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const projectName = projectData?.project_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'project';
      const filename = `${projectName}_production_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Production data exported to Excel successfully`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export to Excel");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check size={12} />
            Accepted
          </span>
        );
      case 'tolerance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
            <AlertCircle size={12} />
            Tolerance
          </span>
        );
      case 'refusal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle size={12} />
            Refusal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <CollapsibleSidebar
        projectName={projectData?.project_name}
        currentPage="production"
      />

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white flex items-center justify-center font-bold text-sm">
            PT
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Production
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="flex items-center justify-center h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            onClick={() => router.push('/dashboard')}
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className="transition-all duration-300 ease-in-out max-lg:!pl-0"
        style={{ paddingLeft: 'var(--sidebar-width, 0px)' }}
      >
        <main className="p-3">
          <div className="max-w-7xl mx-auto">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Production Analytics
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track machine performance, efficiency, and production metrics
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search machines..."
                    className="pl-8 h-10 w-full sm:w-[180px] bg-white dark:bg-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Input
                  type="date"
                  placeholder="Start date"
                  className="h-10 w-full sm:w-[140px] bg-white dark:bg-slate-800"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="End date"
                  className="h-10 w-full sm:w-[140px] bg-white dark:bg-slate-800"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                />

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 w-full sm:w-[160px] bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalPiles">Total Piles</SelectItem>
                    <SelectItem value="machineId">Machine ID</SelectItem>
                    <SelectItem value="acceptedPercent">Accepted %</SelectItem>
                    <SelectItem value="refusalPercent">Refusal %</SelectItem>
                    <SelectItem value="averageDriveTime">Avg. Drive Time</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="h-10 px-3 bg-white dark:bg-slate-800"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 gap-1.5 bg-white dark:bg-slate-800">
                      <Download size={16} />
                      Export
                      <ChevronDown size={14} className="ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToExcel}>
                      <FileDown size={16} className="mr-2" />
                      Export to Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Data Source Tabs - Actual vs Preliminary */}
            <Tabs value={dataSourceTab} onValueChange={handleDataSourceTabChange} className="mb-3">
              <TabsList className="bg-slate-100 dark:bg-slate-800 h-11">
                <TabsTrigger
                  value="actual"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 h-9 px-4"
                >
                  <BarChart2 className="h-4 w-4 mr-1.5" />
                  Actual Production
                </TabsTrigger>
                <TabsTrigger
                  value="preliminary"
                  className="data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-800 dark:data-[state=active]:text-amber-200 h-9 px-4"
                >
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Preliminary Data
                  {(preliminaryData.length > 0 ? preliminaryDebugData.processableRecords : preliminaryCount) > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                      {preliminaryData.length > 0 ? preliminaryDebugData.processableRecords : preliminaryCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Actual Production Tab Content */}
              <TabsContent value="actual" className="mt-3">
                {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Zap size={14} />
                    Total Machines
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{machines.length}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Target size={14} />
                    Total Piles Driven
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{summaryStats.totalPiles.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Check size={14} />
                    Accepted
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-green-600 dark:text-green-500">{summaryStats.totalAccepted.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">
                    {summaryStats.totalPiles > 0 ? ((summaryStats.totalAccepted / summaryStats.totalPiles) * 100).toFixed(1) : 0}%
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    Refusal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-500">{summaryStats.totalRefusal.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">
                    {summaryStats.totalPiles > 0 ? ((summaryStats.totalRefusal / summaryStats.totalPiles) * 100).toFixed(1) : 0}%
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock size={14} />
                    Avg. Drive Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(summaryStats.avgDriveTime)} min</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Award size={14} />
                    Top Producer
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {summaryStats.topMachine ? `#${summaryStats.topMachine.machineId}` : 'N/A'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {summaryStats.topMachine?.totalPiles.toLocaleString() || 0} piles
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="mb-4" onValueChange={setSelectedTab}>
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="machines" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Zap className="h-4 w-4 mr-1" />
                  All Machines
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Performance Issues
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{loadingProgress.stage}</span>
                      <span>{loadingProgress.current}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-300 ease-out"
                        style={{ width: `${loadingProgress.current}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <TabsContent value="overview" className="mt-4">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      {/* Production Trend Chart */}
                      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                            Daily Production Trend
                          </CardTitle>
                          <CardDescription>Piles driven per day (last 30 days)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData.productionTrend}>
                                <defs>
                                  <linearGradient id="colorPiles" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                  labelStyle={{ color: '#f1f5f9' }}
                                  itemStyle={{ color: '#f1f5f9' }}
                                />
                                <Area type="monotone" dataKey="piles" stroke="#6366f1" strokeWidth={2} fill="url(#colorPiles)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Top Machines by Piles */}
                      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-600" />
                            Top Machines by Production
                          </CardTitle>
                          <CardDescription>Total piles and performance rates per machine</CardDescription>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 pt-0">
                          <div className="max-h-[260px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                                <tr>
                                  <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Machine</th>
                                  <th className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Piles</th>
                                  <th className="py-2.5 px-3 text-right font-semibold text-xs uppercase tracking-wide text-green-600 dark:text-green-400">Accepted</th>
                                  <th className="py-2.5 px-3 text-right font-semibold text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Tolerance</th>
                                  <th className="py-2.5 px-3 text-right font-semibold text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Refusal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {chartData.topMachinesByPiles.map((machine, index) => (
                                  <tr key={machine.machineId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <span className="font-semibold text-slate-900 dark:text-white">#{machine.machineId}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="font-bold text-slate-900 dark:text-white">{machine.piles.toLocaleString()}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="inline-flex items-center gap-1">
                                        <span className="font-semibold text-green-600 dark:text-green-400">{machine.acceptedRate}%</span>
                                        <span className="text-xs text-slate-400">({machine.accepted.toLocaleString()})</span>
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="inline-flex items-center gap-1">
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{machine.toleranceRate}%</span>
                                        <span className="text-xs text-slate-400">({machine.tolerance.toLocaleString()})</span>
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="inline-flex items-center gap-1">
                                        <span className={`font-semibold ${machine.refusalRate > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                          {machine.refusalRate}%
                                        </span>
                                        <span className="text-xs text-slate-400">({machine.refusal.toLocaleString()})</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Machine Efficiency */}
                      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-600" />
                            Machine Efficiency
                          </CardTitle>
                          <CardDescription>Accepted rate by machine</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData.machineEfficiency}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                  labelStyle={{ color: '#f1f5f9' }}
                                  itemStyle={{ color: '#f1f5f9' }}
                                  formatter={(value: number, name: string) => [
                                    name === 'efficiency' ? `${value}%` : `${value} min`,
                                    name === 'efficiency' ? 'Efficiency' : 'Avg Drive Time'
                                  ]}
                                />
                                <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Block Distribution */}
                      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <BarChart2 className="h-4 w-4 text-purple-600" />
                            Production by Block
                          </CardTitle>
                          <CardDescription>Top 8 blocks by pile count</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData.topBlocks}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={90}
                                  paddingAngle={2}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                  labelLine={false}
                                >
                                  {chartData.topBlocks.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                  labelStyle={{ color: '#f1f5f9' }}
                                  itemStyle={{ color: '#f1f5f9' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="machines" className="mt-4">
                    {filteredMachines.length === 0 ? (
                      <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Zap className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No machines found</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                            {searchQuery
                              ? "No machines match your search criteria."
                              : "No machine data available. Machine IDs are imported from your CSV data."}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMachines.map(machine => (
                          <Card key={machine.machineId} className="bg-white dark:bg-slate-800 overflow-hidden hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                                      {machine.machineId}
                                    </div>
                                    Machine #{machine.machineId}
                                  </CardTitle>
                                  <CardDescription className="mt-1">
                                    {machine.firstDate && machine.lastDate
                                      ? `Active: ${formatDate(machine.firstDate)} - ${formatDate(machine.lastDate)}`
                                      : 'No date data'}
                                  </CardDescription>
                                </div>
                                <div className="text-xs font-medium px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                                  {machine.totalPiles} piles
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="pt-4">
                              <div className="grid grid-cols-3 gap-2">
                                {/* Accepted Gauge */}
                                <div className="flex flex-col items-center">
                                  <div className="w-14 h-14 mb-1">
                                    <CircularProgressbar
                                      value={machine.totalPiles > 0 ? (machine.acceptedCount / machine.totalPiles) * 100 : 0}
                                      text={`${machine.totalPiles > 0 ? Math.round((machine.acceptedCount / machine.totalPiles) * 100) : 0}%`}
                                      styles={buildStyles({
                                        textSize: '1.6rem',
                                        pathColor: '#10b981',
                                        textColor: '#10b981',
                                        trailColor: '#e2e8f0'
                                      })}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Accepted</div>
                                  <div className="text-xs font-medium text-green-600">{machine.acceptedCount}</div>
                                </div>

                                {/* Tolerance Gauge */}
                                <div className="flex flex-col items-center">
                                  <div className="w-14 h-14 mb-1">
                                    <CircularProgressbar
                                      value={machine.totalPiles > 0 ? (machine.toleranceCount / machine.totalPiles) * 100 : 0}
                                      text={`${machine.totalPiles > 0 ? Math.round((machine.toleranceCount / machine.totalPiles) * 100) : 0}%`}
                                      styles={buildStyles({
                                        textSize: '1.6rem',
                                        pathColor: '#6366f1',
                                        textColor: '#6366f1',
                                        trailColor: '#e2e8f0'
                                      })}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Tolerance</div>
                                  <div className="text-xs font-medium text-indigo-600">{machine.toleranceCount}</div>
                                </div>

                                {/* Refusal Gauge */}
                                <div className="flex flex-col items-center">
                                  <div className="w-14 h-14 mb-1">
                                    <CircularProgressbar
                                      value={machine.totalPiles > 0 ? (machine.refusalCount / machine.totalPiles) * 100 : 0}
                                      text={`${machine.totalPiles > 0 ? Math.round((machine.refusalCount / machine.totalPiles) * 100) : 0}%`}
                                      styles={buildStyles({
                                        textSize: '1.6rem',
                                        pathColor: machine.refusalCount > 0 ? '#f59e0b' : '#10b981',
                                        textColor: machine.refusalCount > 0 ? '#f59e0b' : '#10b981',
                                        trailColor: '#e2e8f0'
                                      })}
                                    />
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">Refusal</div>
                                  <div className={`text-xs font-medium ${machine.refusalCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {machine.refusalCount}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Avg. Drive Time</div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {formatNumber(machine.averageDriveTime)} min
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Avg. Embedment</div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {formatNumber(machine.averageEmbedment)} ft
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Blocks Worked</div>
                                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                                    {Object.keys(machine.pilesPerBlock).length}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Slow Drives</div>
                                  <div className={`text-sm font-medium ${machine.slowDriveTimeCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {machine.slowDriveTimeCount}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleViewMachinePiles(machine.machineId)}
                                >
                                  View All Piles
                                </Button>
                                <Button
                                  variant={expandedMachine === machine.machineId ? "default" : "outline"}
                                  size="sm"
                                  className="flex-1 gap-1"
                                  onClick={() => toggleMachineExpand(machine.machineId)}
                                >
                                  <CalendarDays size={14} />
                                  Daily
                                  {expandedMachine === machine.machineId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </Button>
                              </div>

                              {/* Expandable Daily Breakdown */}
                              {expandedMachine === machine.machineId && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                      <CalendarDays size={14} className="text-indigo-600" />
                                      Daily Production
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="date"
                                        value={dailyFilterDate}
                                        onChange={(e) => setDailyFilterDate(e.target.value)}
                                        className="h-8 w-[140px] text-xs"
                                        placeholder="Filter date"
                                      />
                                      {dailyFilterDate && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => setDailyFilterDate("")}
                                        >
                                          Clear
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="max-h-[200px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                    {getDailyBreakdown(machine, dailyFilterDate).length === 0 ? (
                                      <div className="p-4 text-center text-sm text-slate-500">
                                        {dailyFilterDate ? "No piles on this date" : "No daily data available"}
                                      </div>
                                    ) : (
                                      <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                                          <tr>
                                            <th className="py-2 px-3 text-left font-medium text-slate-600 dark:text-slate-300 text-xs">Date</th>
                                            <th className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-300 text-xs">Piles</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                          {getDailyBreakdown(machine, dailyFilterDate).map((day) => (
                                            <tr key={day.date} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                {format(parseISO(day.date), 'EEE, MMM d, yyyy')}
                                              </td>
                                              <td className="py-2 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                                                {day.count}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-slate-100 dark:bg-slate-700 sticky bottom-0">
                                          <tr>
                                            <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-200 text-xs">
                                              {dailyFilterDate ? "Filtered Total" : `Total (${getDailyBreakdown(machine, dailyFilterDate).length} days)`}
                                            </td>
                                            <td className="py-2 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                              {getDailyBreakdown(machine, dailyFilterDate).reduce((sum, d) => sum + d.count, 0)}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="performance" className="mt-4">
                    {filteredMachines.length === 0 ? (
                      <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Check className="h-12 w-12 text-green-500 mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">All machines performing well!</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                            No machines have refusal or slow drive time issues.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMachines.map(machine => (
                          <Card key={machine.machineId} className="bg-white dark:bg-slate-800 overflow-hidden border-l-4 border-l-amber-500">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                  Machine #{machine.machineId}
                                </CardTitle>
                                <div className="flex gap-1">
                                  {machine.refusalCount > 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                                      {machine.refusalCount} refusals
                                    </span>
                                  )}
                                  {machine.slowDriveTimeCount > 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                      {machine.slowDriveTimeCount} slow
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Total Piles:</span>
                                  <span className="font-medium">{machine.totalPiles}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Refusal Rate:</span>
                                  <span className={`font-medium ${machine.refusalCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {machine.totalPiles > 0 ? ((machine.refusalCount / machine.totalPiles) * 100).toFixed(1) : 0}%
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Avg. Drive Time:</span>
                                  <span className="font-medium">{formatNumber(machine.averageDriveTime)} min</span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-3"
                                onClick={() => handleViewMachinePiles(machine.machineId)}
                              >
                                Investigate
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
              </TabsContent>

              {/* Preliminary Data Tab Content */}
              <TabsContent value="preliminary" className="mt-3">
                {/* Warning Banner */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Preliminary Data Mode
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        This data is isolated and will NOT appear in Dashboard, My Piles, Blocks, or Zones pages.
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPreliminaryModalOpen(true)}
                          className="bg-white dark:bg-slate-800 border-amber-300"
                        >
                          <Upload size={14} className="mr-1" />
                          Upload
                        </Button>
                        {preliminaryData.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearPreliminaryData}
                            disabled={isClearingPreliminary}
                            className="bg-white dark:bg-slate-800 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Clear All
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary KPI Cards for Preliminary Data - Same as Actual */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
                  <Card className="border-amber-200 dark:border-amber-800 dark:bg-slate-800">
                    <CardHeader className="pb-1 p-3">
                      <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Zap size={14} />
                        Total Machines
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{preliminaryMachines.length}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 dark:border-amber-800 dark:bg-slate-800">
                    <CardHeader className="pb-1 p-3">
                      <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Target size={14} />
                        Total Piles Driven
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{preliminarySummaryStats.totalPiles.toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 dark:border-amber-800 dark:bg-slate-800">
                    <CardHeader className="pb-1 p-3">
                      <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Check size={14} />
                        Accepted
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xl font-bold text-green-600 dark:text-green-500">{preliminarySummaryStats.totalAccepted.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">
                        {preliminarySummaryStats.totalPiles > 0 ? ((preliminarySummaryStats.totalAccepted / preliminarySummaryStats.totalPiles) * 100).toFixed(1) : 0}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 dark:border-amber-800 dark:bg-slate-800">
                    <CardHeader className="pb-1 p-3">
                      <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <AlertTriangle size={14} />
                        Refusal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-500">{preliminarySummaryStats.totalRefusal.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">
                        {preliminarySummaryStats.totalPiles > 0 ? ((preliminarySummaryStats.totalRefusal / preliminarySummaryStats.totalPiles) * 100).toFixed(1) : 0}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 dark:border-amber-800 dark:bg-slate-800">
                    <CardHeader className="pb-1 p-3">
                      <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={14} />
                        Avg. Drive Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(preliminarySummaryStats.avgDriveTime)} min</div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 dark:border-amber-800 dark:bg-slate-800">
                    <CardHeader className="pb-1 p-3">
                      <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Award size={14} />
                        Top Producer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {preliminarySummaryStats.topMachine ? `#${preliminarySummaryStats.topMachine.machineId}` : 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {preliminarySummaryStats.topMachine?.totalPiles.toLocaleString() || 0} piles
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Debug Panel - Collapsible */}
                <Card className="mb-3 border-slate-300 dark:border-slate-600">
                  <CardHeader
                    className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => setShowDataDebug(!showDataDebug)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <Search size={14} />
                        Data Verification Panel
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {preliminaryDebugData.processableRecords} processable | {preliminaryDailyData.totalDays} dates | {preliminaryMachines.length} machines
                          {preliminaryDebugData.totalExcluded > 0 && (
                            <span className="ml-1 text-amber-600">({preliminaryDebugData.totalExcluded} excluded)</span>
                          )}
                        </span>
                        {showDataDebug ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </CardHeader>
                  {showDataDebug && (
                    <CardContent className="p-3 pt-0 border-t border-slate-200 dark:border-slate-700">
                      {/* Excluded Records Summary - Only show if there are exclusions */}
                      {preliminaryDebugData.totalExcluded > 0 && (
                        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                              <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                                {preliminaryDebugData.totalExcluded} record{preliminaryDebugData.totalExcluded !== 1 ? 's' : ''} excluded from processing:
                              </p>
                              <ul className="text-amber-700 dark:text-amber-300 space-y-0.5 ml-2">
                                {preliminaryDebugData.excludedNoMachine > 0 && (
                                  <li>{preliminaryDebugData.excludedNoMachine} - Missing machine ID (null/empty)</li>
                                )}
                                {preliminaryDebugData.excludedInvalidMachine > 0 && (
                                  <li>{preliminaryDebugData.excludedInvalidMachine} - Invalid machine ID ({preliminaryDebugData.invalidMachineValues.join(', ')})</li>
                                )}
                              </ul>
                              <p className="mt-1 text-amber-600 dark:text-amber-400">
                                Total in database: {preliminaryDebugData.totalRecords} | Processable: {preliminaryDebugData.processableRecords}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Raw Date Analysis */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Raw Date Values (all CSV records)</h4>
                          <div className="max-h-[200px] overflow-y-auto text-xs bg-slate-100 dark:bg-slate-800 rounded p-2 font-mono">
                            {Object.entries(preliminaryDebugData.rawDateCounts)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([date, count]) => {
                                // Find the processed count for this date to show discrepancy
                                const processedDay = preliminaryDailyData.days.find(d => d.date === parseDateToISO(date));
                                const discrepancy = processedDay ? count - processedDay.total : 0;
                                return (
                                  <div key={date} className="flex justify-between py-0.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                    <span className="text-slate-600 dark:text-slate-400">{date}</span>
                                    <span className="font-semibold text-amber-600">
                                      {count} raw
                                      {discrepancy > 0 && (
                                        <span className="ml-1 text-red-500">(-{discrepancy})</span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            {preliminaryDebugData.nullDates > 0 && (
                              <div className="flex justify-between py-0.5 text-red-500">
                                <span>NULL/Empty dates</span>
                                <span className="font-semibold">{preliminaryDebugData.nullDates}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Processed Date Summary */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Processed Daily Totals (valid machine records only)</h4>
                          <div className="max-h-[200px] overflow-y-auto text-xs bg-slate-100 dark:bg-slate-800 rounded p-2 font-mono">
                            {preliminaryDailyData.days.map(day => (
                              <div key={day.date} className="flex justify-between py-0.5 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                <span className="text-slate-600 dark:text-slate-400">{day.date}</span>
                                <span className="font-semibold text-amber-600">{day.total} piles ({day.machineCount} machines)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Date Range:</span>
                          <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                            {preliminaryDailyData.firstDate || 'N/A'} → {preliminaryDailyData.lastDate || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Best Day:</span>
                          <span className="ml-2 font-semibold text-green-600">
                            {preliminaryDailyData.maxDay?.date || 'N/A'} ({preliminaryDailyData.maxDay?.total || 0} piles)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Avg/Day:</span>
                          <span className="ml-2 font-semibold text-amber-600">
                            {Math.round(preliminaryDailyData.avgPerDay)} piles
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {isPreliminaryLoading ? (
                  <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
                    <p className="text-sm text-slate-500">Loading preliminary data...</p>
                  </div>
                ) : preliminaryData.length === 0 ? (
                  <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        No Preliminary Data
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-4">
                        Upload preliminary production data to track machine productivity before complete engineer data is available.
                      </p>
                      {canEdit && (
                        <Button
                          onClick={() => setIsPreliminaryModalOpen(true)}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Upload size={16} className="mr-2" />
                          Upload Preliminary Data
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* CONSOLIDATED DASHBOARD - Production Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* LEFT: Daily Production Chart - Larger and more detailed */}
                      <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-amber-600" />
                                Production Trend
                                <span className="text-xs font-normal bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                  {chartViewMode === 'weekly' ? 'Weekly' : chartViewMode === 'monthly' ? 'Monthly' : 'Daily'}
                                </span>
                              </CardTitle>
                              <CardDescription>
                                {preliminaryDailyData.firstDate && preliminaryDailyData.lastDate
                                  ? `${format(parseISO(preliminaryDailyData.firstDate), 'MMM d, yyyy')} - ${format(parseISO(preliminaryDailyData.lastDate), 'MMM d, yyyy')} (${preliminaryDailyData.totalDays} days)`
                                  : 'No data available'
                                }
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* View Mode Selector */}
                              <Select value={chartViewMode} onValueChange={(v) => setChartViewMode(v as typeof chartViewMode)}>
                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="30days">Last 30 Days</SelectItem>
                                  <SelectItem value="90days">Last 90 Days</SelectItem>
                                  <SelectItem value="all">All Days</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="text-right">
                                <div className="text-xl font-bold text-amber-600">{Math.round(preliminaryDailyData.avgPerDay)}</div>
                                <div className="text-[10px] text-slate-500">avg/day</div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={chartDisplayData.showBrush ? "h-[320px]" : "h-[280px]"}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartDisplayData.data}>
                                <defs>
                                  <linearGradient id="colorPilesPrelimNew" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 9 }}
                                  stroke="#94a3b8"
                                  angle={chartDisplayData.data.length > 20 ? -45 : 0}
                                  textAnchor={chartDisplayData.data.length > 20 ? "end" : "middle"}
                                  height={chartDisplayData.data.length > 20 ? 60 : 30}
                                  interval={chartDisplayData.tickInterval - 1}
                                />
                                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                  labelStyle={{ color: '#f1f5f9' }}
                                  labelFormatter={(label, payload) => {
                                    if (payload && payload[0]?.payload?.fullDate) {
                                      const fullDate = payload[0].payload.fullDate;
                                      if (chartViewMode === 'monthly') {
                                        return format(parseISO(`${fullDate}-01`), 'MMMM yyyy');
                                      } else if (chartViewMode === 'weekly') {
                                        return `Week of ${format(parseISO(fullDate), 'MMM d, yyyy')}`;
                                      }
                                      return format(parseISO(fullDate), 'EEEE, MMM d, yyyy');
                                    }
                                    return label;
                                  }}
                                  formatter={(value: number, name: string, props: { payload?: { daysInWeek?: number; daysInMonth?: number } }) => {
                                    if (name === 'piles') {
                                      const extra = props.payload?.daysInWeek
                                        ? ` (${props.payload.daysInWeek} days)`
                                        : props.payload?.daysInMonth
                                        ? ` (${props.payload.daysInMonth} days)`
                                        : '';
                                      return [value.toLocaleString() + extra, chartViewMode === 'weekly' ? 'Weekly Total' : chartViewMode === 'monthly' ? 'Monthly Total' : 'Piles Driven'];
                                    }
                                    if (name === 'machines') return [value, 'Active Machines'];
                                    if (name === 'avg') return [value, chartViewMode === 'weekly' ? 'Weekly Avg' : chartViewMode === 'monthly' ? 'Period Avg' : 'Daily Average'];
                                    return [value, name];
                                  }}
                                />
                                <Area type="monotone" dataKey="piles" stroke="#f59e0b" strokeWidth={2} fill="url(#colorPilesPrelimNew)" name="piles" />
                                <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 5" dot={false} name="avg" />
                                {chartDisplayData.showBrush && (
                                  <Brush
                                    dataKey="date"
                                    height={25}
                                    stroke="#f59e0b"
                                    fill="#fef3c7"
                                    travellerWidth={8}
                                  />
                                )}
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                          {chartDisplayData.data.length > 30 && (
                            <p className="text-[10px] text-slate-500 mt-1 text-center">
                              {chartDisplayData.showBrush ? 'Drag the handles below to zoom into a specific date range' : `Showing ${chartDisplayData.data.length} data points`}
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* RIGHT: Machine Leaderboard */}
                      <Card className="bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-600" />
                            Machine Leaderboard
                          </CardTitle>
                          <CardDescription>Ranked by total production</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="max-h-[320px] overflow-y-auto space-y-2">
                            {[...preliminaryMachines]
                              .sort((a, b) => b.totalPiles - a.totalPiles)
                              .map((machine, idx) => {
                                const maxPiles = preliminaryMachines[0]?.totalPiles || 1;
                                const barWidth = (machine.totalPiles / maxPiles) * 100;
                                const acceptRate = machine.totalPiles > 0 ? (machine.acceptedCount / machine.totalPiles * 100) : 0;
                                const daysActive = Object.keys(machine.pilesPerDate).length;
                                const avgPerDay = daysActive > 0 ? (machine.totalPiles / daysActive) : 0;
                                return (
                                  <div key={machine.machineId} className="relative">
                                    <div
                                      className={`absolute inset-0 rounded ${idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700/30'}`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                    <div className="relative flex items-center justify-between p-2">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                          idx === 0 ? 'bg-amber-500 text-white' :
                                          idx === 1 ? 'bg-slate-400 text-white' :
                                          idx === 2 ? 'bg-orange-700 text-white' :
                                          'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                                        }`}>
                                          {idx + 1}
                                        </div>
                                        <div>
                                          <div className="font-semibold text-sm text-slate-900 dark:text-white">Machine #{machine.machineId}</div>
                                          <div className="text-xs text-slate-500">{daysActive} days active</div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-sm text-amber-600">{machine.totalPiles} <span className="font-normal text-xs text-slate-500">total</span></div>
                                        <div className="text-xs">
                                          <span className="font-semibold text-indigo-600">{avgPerDay.toFixed(1)}</span>
                                          <span className="text-slate-500"> avg/day</span>
                                          <span className="mx-1 text-slate-300">|</span>
                                          <span className={acceptRate >= 90 ? 'text-green-600' : acceptRate >= 70 ? 'text-amber-600' : 'text-red-600'}>
                                            {acceptRate.toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* DAILY BREAKDOWN TABLE - Complete daily summary */}
                    <Card className="bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-amber-600" />
                              Complete Daily Breakdown
                            </CardTitle>
                            <CardDescription>Click any row to see machine details for that day</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={selectedCompareDate || ''}
                              onChange={(e) => setSelectedCompareDate(e.target.value || null)}
                              className="h-8 w-[150px] text-sm"
                              min={preliminaryDailyData.firstDate || undefined}
                              max={preliminaryDailyData.lastDate || undefined}
                            />
                            {selectedCompareDate && (
                              <Button variant="ghost" size="sm" onClick={() => setSelectedCompareDate(null)} className="h-8 px-2">
                                <X size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10">
                              <tr>
                                <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Date</th>
                                <th className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Total Piles</th>
                                <th className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Machines</th>
                                <th className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">vs Avg</th>
                                <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Production by Machine</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {(selectedCompareDate
                                ? preliminaryDailyData.days.filter(d => d.date === selectedCompareDate)
                                : preliminaryDailyData.days
                              ).slice().reverse().map(day => {
                                const vsAvg = preliminaryDailyData.avgPerDay > 0
                                  ? ((day.total / preliminaryDailyData.avgPerDay) - 1) * 100
                                  : 0;
                                const isExpanded = selectedCompareDate === day.date;
                                const dayOfWeek = new Date(day.date).getDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                return (
                                  <tr
                                    key={day.date}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                                      isExpanded ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                                    }`}
                                    onClick={() => setSelectedCompareDate(isExpanded ? null : day.date)}
                                  >
                                    <td className="py-2.5 px-3">
                                      <div className="font-medium text-slate-900 dark:text-white">
                                        {format(parseISO(day.date), 'EEE, MMM d, yyyy')}
                                      </div>
                                      {isWeekend && (
                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Weekend</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="font-bold text-lg text-amber-600">{day.total}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className="text-slate-600 dark:text-slate-400">{day.machineCount}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span className={`font-medium ${vsAvg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(0)}%
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex flex-wrap gap-1">
                                        {Object.entries(day.machines)
                                          .sort(([, a], [, b]) => b - a)
                                          .slice(0, isExpanded ? undefined : 5)
                                          .map(([machineId, count]) => (
                                            <span
                                              key={machineId}
                                              className="inline-flex items-center gap-1 text-xs bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full"
                                            >
                                              <span className="font-semibold">#{machineId}</span>
                                              <span className="text-amber-600 dark:text-amber-400 font-bold">{count}</span>
                                            </span>
                                          ))}
                                        {!isExpanded && Object.keys(day.machines).length > 5 && (
                                          <span className="text-xs text-slate-500">+{Object.keys(day.machines).length - 5} more</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-100 dark:bg-slate-700 sticky bottom-0">
                              <tr>
                                <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-200">
                                  Total ({selectedCompareDate ? '1 day' : `${preliminaryDailyData.totalDays} days`})
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-lg text-amber-600">
                                  {selectedCompareDate
                                    ? preliminaryDailyData.days.find(d => d.date === selectedCompareDate)?.total || 0
                                    : preliminaryDailyData.totalPiles
                                  }
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                                  {preliminaryMachines.length} total
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-500">-</td>
                                <td className="py-2.5 px-3 text-slate-500 text-xs">
                                  Avg: {Math.round(preliminaryDailyData.avgPerDay)} piles/day
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* MACHINE CARDS GRID */}
                    <Card className="bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <Zap className="h-4 w-4 text-amber-600" />
                              Machine Details
                              {selectedCompareDate && (
                                <span className="text-xs font-normal bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                  {format(parseISO(selectedCompareDate), 'MMM d, yyyy')}
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {selectedCompareDate
                                ? `Stats for ${filteredPreliminaryMachines.length} machine${filteredPreliminaryMachines.length !== 1 ? 's' : ''} on this day`
                                : 'Detailed stats for each machine'}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedCompareDate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCompareDate(null)}
                                className="h-8 text-xs"
                              >
                                Show All Days
                              </Button>
                            )}
                            <Input
                              placeholder="Search machines..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="h-8 w-[200px] text-sm"
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredPreliminaryMachines.map(machine => {
                            const acceptRate = machine.totalPiles > 0 ? (machine.acceptedCount / machine.totalPiles * 100) : 0;
                            const refusalRate = machine.totalPiles > 0 ? (machine.refusalCount / machine.totalPiles * 100) : 0;
                            const daysActive = Object.keys(machine.pilesPerDate).length;
                            const avgPilesPerDay = daysActive > 0 ? (machine.totalPiles / daysActive) : 0;
                            return (
                              <div
                                key={machine.machineId}
                                className={`p-3 rounded-lg border ${
                                  refusalRate > 10 ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' :
                                  acceptRate >= 90 ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10' :
                                  'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
                                      {machine.machineId}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900 dark:text-white">Machine #{machine.machineId}</div>
                                      <div className="text-xs text-slate-500">{daysActive} days | {Object.keys(machine.pilesPerBlock).length} blocks</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-amber-600">{machine.totalPiles}</div>
                                    <div className="text-xs text-slate-500">piles total</div>
                                  </div>
                                </div>
                                {/* Avg Piles/Day - Prominent Display */}
                                <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center">
                                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{avgPilesPerDay.toFixed(1)}</div>
                                  <div className="text-[10px] text-indigo-500 dark:text-indigo-400">avg piles/day</div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                  <div>
                                    <div className="text-sm font-bold text-green-600">{machine.acceptedCount}</div>
                                    <div className="text-[10px] text-slate-500">Accepted</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-indigo-600">{machine.toleranceCount}</div>
                                    <div className="text-[10px] text-slate-500">Tolerance</div>
                                  </div>
                                  <div>
                                    <div className={`text-sm font-bold ${machine.refusalCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>{machine.refusalCount}</div>
                                    <div className="text-[10px] text-slate-500">Refusal</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-500">{machine.pendingCount}</div>
                                    <div className="text-[10px] text-slate-500">Pending</div>
                                  </div>
                                </div>
                                {machine.firstDate && machine.lastDate && (
                                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                                    Active: {format(parseISO(machine.firstDate), 'MMM d')} - {format(parseISO(machine.lastDate), 'MMM d')}
                                    {' '}&bull;{' '}
                                    Avg: {formatNumber(machine.averageDriveTime)} min/pile
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Machine Piles Modal */}
      <Dialog
        open={isMachinePilesModalOpen}
        onOpenChange={(open) => {
          setIsMachinePilesModalOpen(open);
          if (!open) setSelectedMachine(null);
        }}
      >
        <DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <Zap className="h-5 w-5 mr-2 text-indigo-600" />
              Piles Driven by Machine #{selectedMachine}
            </DialogTitle>
          </DialogHeader>

          {isLoadingPiles ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
            </div>
          ) : machinePiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No piles found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                No piles were found for machine #{selectedMachine}
              </p>
            </div>
          ) : (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-1 p-3">
                    <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Piles</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{machinePiles.length}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-1 p-3">
                    <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Accepted</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-green-600">
                      {machinePiles.filter(p => p.status === 'accepted').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-1 p-3">
                    <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Tolerance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-indigo-600">
                      {machinePiles.filter(p => p.status === 'tolerance').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-1 p-3">
                    <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Refusal</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-amber-600">
                      {machinePiles.filter(p => p.status === 'refusal').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-1 p-3">
                    <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xl font-bold text-yellow-600">
                      {machinePiles.filter(p => p.status === 'pending').length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Piles Table */}
              <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Pile ID</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Block</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Embedment</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Design</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Drive Time</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {machinePiles.slice(0, 100).map((pile, index) => (
                        <tr
                          key={pile.id}
                          className={`${
                            index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'
                          } hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
                        >
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{pile.pile_id || pile.pile_number || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{pile.block || 'N/A'}</td>
                          <td className="py-3 px-4">{getStatusBadge(pile.status)}</td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">
                            {pile.embedment ? `${formatNumber(Number(pile.embedment))} ft` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">
                            {pile.design_embedment ? `${formatNumber(Number(pile.design_embedment))} ft` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">
                            {pile.duration ? `${parseDuration(pile.duration).toFixed(1)} min` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {pile.start_date ? formatDate(pile.start_date) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {machinePiles.length > 100 && (
                  <div className="p-3 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800">
                    Showing first 100 of {machinePiles.length} piles
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setIsMachinePilesModalOpen(false)}
                  className="bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preliminary Production Upload Modal */}
      <PreliminaryProductionUploadModal
        isOpen={isPreliminaryModalOpen}
        onClose={() => setIsPreliminaryModalOpen(false)}
        projectId={projectData?.id || ''}
        onUploadComplete={() => {
          loadPreliminaryCount();
          window.location.reload();
        }}
      />
    </div>
  );
}
