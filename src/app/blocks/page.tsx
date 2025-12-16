"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, List, BarChart3, Settings, User, Bell, FileText, MapPin, Filter, Search, Clock, AlertTriangle, AlertCircle, Check, ChevronLeft, ChevronRight, Box, Download, ChevronDown, FileDown, Building2, X } from "lucide-react";
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
import { format } from "date-fns";
import { exportBlocksToPDF } from '@/lib/pdfExport';
import * as XLSX from 'xlsx';
import { adminService } from "@/lib/adminService";

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

interface BlockData {
  name: string;
  totalPiles: number;
  refusalCount: number;
  toleranceCount: number; // Piles below design embedment but within tolerance
  slowDriveTimeCount: number;
  averageDriveTime: number;
  averageEmbedment: number;
  designEmbedment: number | null;
}

export default function BlocksPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(3);
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { canEdit } = useAccountType();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("User");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [blockPiles, setBlockPiles] = useState<any[]>([]);
  const [isBlockPilesModalOpen, setIsBlockPilesModalOpen] = useState(false);
  const [isLoadingPiles, setIsLoadingPiles] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, stage: '' });

  // Configuration values
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);
  const [driveTimeThreshold, setDriveTimeThreshold] = useState(10);

  // Filtering
  const [filteredBlocks, setFilteredBlocks] = useState<BlockData[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isAdminViewing, setIsAdminViewing] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (authLoading) {
      return;
    }

    // Check if user is logged in, if not redirect to auth page
    if (!user) {
      router.push("/auth");
      return;
    }

    // Load user and project data
    const loadData = async () => {
      if (user) {
        try {
          // Check for super admin project override
          const overrideProjectId = localStorage.getItem('selectedProjectId');
          let project: any = null;
          let allPilesData: any[] = [];

          if (overrideProjectId) {
            // Super admin viewing a different project - use admin API
            setIsAdminViewing(true);
            console.log('[Blocks] Super admin viewing project:', overrideProjectId);

            try {
              const adminData = await adminService.getProjectData(overrideProjectId);
              project = adminData.project;
              setProjectData(project);

              const tolerance = project.embedment_tolerance !== undefined && project.embedment_tolerance !== null
                ? project.embedment_tolerance
                : 1;
              setEmbedmentTolerance(tolerance);

              // Fetch piles via admin API
              setLoadingProgress({ current: 0, total: 100, stage: 'Loading pile data...' });

              const { count: totalCount } = await adminService.getPileCount(overrideProjectId);
              const pageSize = 1000;
              const totalPages = Math.ceil(totalCount / pageSize);

              for (let page = 0; page < totalPages; page++) {
                const { piles } = await adminService.getPiles(overrideProjectId, page, pageSize);
                // Filter for piles with blocks
                const pilesWithBlocks = piles.filter((p: any) => p.block !== null && p.block !== undefined && p.block !== '');
                allPilesData = [...allPilesData, ...pilesWithBlocks];
                const progress = Math.round(((page + 1) / totalPages) * 50);
                setLoadingProgress({ current: progress, total: 100, stage: `Loading pile data (${page + 1}/${totalPages})...` });
              }

              console.log('[Blocks] Admin API - Loaded', allPilesData.length, 'piles with blocks');
            } catch (adminError) {
              console.error('[Blocks] Admin API error:', adminError);
              toast.error('Failed to load project data');
              setIsAdminViewing(false);
              setIsLoading(false);
              return;
            }
          } else {
            // Normal user flow
            setIsAdminViewing(false);

            const { data: userProjectData } = await supabase
              .from('user_projects')
              .select('project_id, role, is_owner')
              .eq('user_id', user.id)
              .single();

            if (userProjectData) {
              const { data: projectResult } = await supabase
                .from('projects')
                .select('*')
                .eq('id', userProjectData.project_id)
                .single();

              project = projectResult;

              if (project) {
                setProjectData(project);

                const tolerance = project.embedment_tolerance !== undefined && project.embedment_tolerance !== null
                  ? project.embedment_tolerance
                  : 1;
                setEmbedmentTolerance(tolerance);

                // Get total count of piles with blocks
                let countQuery = supabase
                  .from('piles')
                  .select('*', { count: 'exact', head: true })
                  .eq('project_id', project.id)
                  .not('block', 'is', null);

                if (!canEdit) {
                  countQuery = countQuery.eq('published', true);
                }

                const { count, error: countError } = await countQuery;

                if (countError) {
                  throw countError;
                }

                const totalCount = count || 0;
                console.log("Total piles with blocks:", totalCount);

                setLoadingProgress({ current: 0, total: 100, stage: 'Loading pile data...' });

                const pageSize = 1000;
                const totalPages = Math.ceil(totalCount / pageSize);

                console.log(`Loading ${totalCount} piles in ${totalPages} parallel requests`);

                if (totalPages > 0) {
                  const fetchPromises = [];

                  for (let page = 0; page < totalPages; page++) {
                    const from = page * pageSize;
                    const to = Math.min(from + pageSize - 1, totalCount - 1);

                    let pileQuery = supabase
                      .from('piles')
                      .select('*')
                      .eq('project_id', project.id)
                      .not('block', 'is', null);

                    if (!canEdit) {
                      pileQuery = pileQuery.eq('published', true);
                  }

                  fetchPromises.push(pileQuery.range(from, to));
                }

                console.log(`Fetching ${fetchPromises.length} pages in parallel...`);
                const results = await Promise.allSettled(fetchPromises);

                for (let i = 0; i < results.length; i++) {
                  const result = results[i];
                  if (result.status === 'fulfilled' && result.value.data) {
                    allPilesData = [...allPilesData, ...result.value.data];
                    const progress = Math.round(((i + 1) / totalPages) * 50); // First 50% of progress
                    setLoadingProgress({ current: progress, total: 100, stage: `Loading pile data (${i + 1}/${totalPages})...` });
                    console.log(`Page ${i + 1}: Loaded ${result.value.data.length} piles`);
                  } else if (result.status === 'rejected') {
                    console.error(`Page ${i + 1} failed:`, result.reason);
                  }
                }

                console.log(`Successfully loaded ${allPilesData.length} of ${totalCount} piles`);
              }
            } // End if (project)
          } // End if (userProjectData)
          } // End else (normal flow)

          // Common processing block - runs for both admin and normal flows
          if (project && allPilesData.length >= 0) {
            const pileData = allPilesData;
            const tolerance = project.embedment_tolerance !== undefined && project.embedment_tolerance !== null
              ? project.embedment_tolerance
              : 1;

            setLoadingProgress({ current: 50, total: 100, stage: 'Processing blocks...' });

            // Extract unique blocks from ALL the loaded pile data
            const uniqueBlocks = new Set<string>();
            pileData.forEach(pile => {
              if (pile.block && pile.block.trim()) {
                uniqueBlocks.add(pile.block.trim());
              }
            });

            console.log(`Found ${uniqueBlocks.size} unique blocks:`, Array.from(uniqueBlocks).sort());

            // Process block data - optimized to use in-memory data only (no separate DB queries)
            const blockMap = new Map<string, BlockData>();
            const blockArray: BlockData[] = [];

            // Initialize block data structures and count piles directly from loaded data
            const blockPileCounts: { [blockName: string]: number } = {};
            const blockEmbedmentSums: { [blockName: string]: number } = {};
            const blockDurationSums: { [blockName: string]: number } = {};
            const blockRefusalCounts: { [blockName: string]: number } = {};
            const blockToleranceCounts: { [blockName: string]: number } = {};
            const blockSlowDriveCounts: { [blockName: string]: number } = {};

            // Initialize all blocks
            uniqueBlocks.forEach(blockName => {
              const blockData: BlockData = {
                name: blockName,
                totalPiles: 0,
                refusalCount: 0,
                toleranceCount: 0,
                slowDriveTimeCount: 0,
                averageDriveTime: 0,
                averageEmbedment: 0,
                designEmbedment: null
              };
              blockArray.push(blockData);
              blockMap.set(blockName, blockData);
              blockPileCounts[blockName] = 0;
            });

            setLoadingProgress({ current: 60, total: 100, stage: 'Calculating statistics...' });

            // Single pass through all pile data to calculate everything
            pileData.forEach(pile => {
              if (!pile.block) return;

              const blockName = pile.block.trim();
              const blockData = blockMap.get(blockName);
              if (!blockData) return;

              // Count piles
              blockPileCounts[blockName] = (blockPileCounts[blockName] || 0) + 1;

              // Parse duration
              const duration = parseDuration(pile.duration);

              // Track total duration for calculating average later
              blockDurationSums[blockName] = (blockDurationSums[blockName] || 0) + duration;

              // Count slow drive time piles
              if (duration > driveTimeThreshold) {
                blockSlowDriveCounts[blockName] = (blockSlowDriveCounts[blockName] || 0) + 1;
              }

              // Update embedment data
              if (pile.embedment && pile.design_embedment) {
                // Convert to numbers for proper comparison
                const embedment = Number(pile.embedment);
                const designEmbedment = Number(pile.design_embedment);

                // Set design embedment (should be the same for all piles in block)
                blockData.designEmbedment = designEmbedment;

                // Track total embedment for calculating average later
                blockEmbedmentSums[blockName] = (blockEmbedmentSums[blockName] || 0) + embedment;

                // Check embedment against design values
                if (embedment < (designEmbedment - tolerance)) {
                  // Count refusal piles (below tolerance)
                  blockRefusalCounts[blockName] = (blockRefusalCounts[blockName] || 0) + 1;
                } else if (embedment < designEmbedment) {
                  // Count piles below design embedment but within tolerance
                  blockToleranceCounts[blockName] = (blockToleranceCounts[blockName] || 0) + 1;
                }
              }
            });

            setLoadingProgress({ current: 80, total: 100, stage: 'Finalizing data...' });

            // Update all the block data with calculated statistics
            uniqueBlocks.forEach(blockName => {
              const blockData = blockMap.get(blockName);
              if (!blockData) return;

              // Set total pile count from in-memory data
              blockData.totalPiles = blockPileCounts[blockName] || 0;

              // Set refusal and tolerance counts
              blockData.refusalCount = blockRefusalCounts[blockName] || 0;
              blockData.toleranceCount = blockToleranceCounts[blockName] || 0;
              blockData.slowDriveTimeCount = blockSlowDriveCounts[blockName] || 0;

              // Calculate averages if we have data
              if (blockData.totalPiles > 0) {
                if (blockDurationSums[blockName]) {
                  blockData.averageDriveTime = blockDurationSums[blockName] / blockData.totalPiles;
                }

                if (blockEmbedmentSums[blockName]) {
                  blockData.averageEmbedment = blockEmbedmentSums[blockName] / blockData.totalPiles;
                }
              }

              console.log(`Block ${blockName}: ${blockData.totalPiles} piles, ${blockData.refusalCount} refusals`);
            });

            setLoadingProgress({ current: 100, total: 100, stage: 'Complete!' });

            // Set the blocks state
            setBlocks(blockArray);
            setIsLoading(false);
          } else if (!project) {
            setIsLoading(false);
          }

          // Extract user data for profile display
          const metadata = user.user_metadata;
          const firstName = metadata?.first_name || "";
          const lastName = metadata?.last_name || "";

          // Generate initials
          let initials = "";
          if (firstName) initials += firstName[0].toUpperCase();
          if (lastName) initials += lastName[0].toUpperCase();

          // If no initials could be generated, use the first character of the email
          if (!initials && user.email) {
            initials = user.email[0].toUpperCase();
          }

          setUserInitials(initials || "U");
          setUserName(firstName || user.email?.split("@")[0] || "User");
        } catch (error) {
          console.error("Error loading block data:", error);
          toast.error("Failed to load block data");
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [user, router, authLoading]);

  // Function to parse duration string to minutes
  const parseDuration = (durationString: string | null): number => {
    if (!durationString) return 0;

    try {
      // Handle different formats like "0:12:05" (hours:minutes:seconds) from CSV
      if (durationString.includes(':')) {
        const parts = durationString.split(':');
        if (parts.length === 3) {
          // Format is hours:minutes:seconds
          const hours = parseInt(parts[0], 10);
          const minutes = parseInt(parts[1], 10);
          const seconds = parseInt(parts[2], 10);
          return hours * 60 + minutes + (seconds / 60);
        } else if (parts.length === 2) {
          // Format is minutes:seconds
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

      // Try to parse as a simple number (assuming minutes)
      const minutes = parseFloat(durationString);
      if (!isNaN(minutes)) {
        return minutes;
      }

      return 0;
    } catch (err) {
      console.error("Error parsing duration:", err);
      return 0;
    }
  };

  // Filter and sort blocks
  useEffect(() => {
    let filtered = [...blocks];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(block =>
        block.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply tab filter
    if (selectedTab === "refusal") {
      filtered = filtered.filter(block => block.refusalCount > 0);
    } else if (selectedTab === "drivetime") {
      filtered = filtered.filter(block => block.slowDriveTimeCount > 0);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalPiles":
          comparison = a.totalPiles - b.totalPiles;
          break;
        case "refusalPercent":
          const refusalA = a.totalPiles > 0 ? (a.refusalCount / a.totalPiles) : 0;
          const refusalB = b.totalPiles > 0 ? (b.refusalCount / b.totalPiles) : 0;
          comparison = refusalA - refusalB;
          break;
        case "tolerancePercent":
          const toleranceA = a.totalPiles > 0 ? (a.toleranceCount / a.totalPiles) : 0;
          const toleranceB = b.totalPiles > 0 ? (b.toleranceCount / b.totalPiles) : 0;
          comparison = toleranceA - toleranceB;
          break;
        case "driveTimePercent":
          const slowA = a.totalPiles > 0 ? (a.slowDriveTimeCount / a.totalPiles) : 0;
          const slowB = b.totalPiles > 0 ? (b.slowDriveTimeCount / b.totalPiles) : 0;
          comparison = slowA - slowB;
          break;
        case "averageDriveTime":
          comparison = a.averageDriveTime - b.averageDriveTime;
          break;
        case "averageEmbedment":
          comparison = a.averageEmbedment - b.averageEmbedment;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredBlocks(filtered);
  }, [blocks, searchQuery, selectedTab, sortBy, sortOrder]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const handleViewPilesInBlock = async (blockName: string) => {
    if (!projectData) return;

    try {
      setSelectedBlock(blockName);
      setIsLoadingPiles(true);
      setIsBlockPilesModalOpen(true);

      // Fetch piles for the selected block
      const { data: pileData, error } = await supabase
        .from('piles')
        .select('*')
        .eq('project_id', projectData.id)
        .eq('block', blockName);

      if (error) {
        throw error;
      }

      // Process the pile data with more detailed status classification
      const processedPileData = pileData?.map(pile => {
        // Check if we have both embedment values
        if (pile.embedment && pile.design_embedment) {
          const embedment = Number(pile.embedment);
          const designEmbedment = Number(pile.design_embedment);

          // Case 1: Pile meets or exceeds design embedment
          if (embedment >= designEmbedment) {
            return { ...pile, status: 'accepted' };
          }
          // Case 2: Pile is below design embedment but within tolerance
          else if (embedment >= (designEmbedment - embedmentTolerance)) {
            return { ...pile, status: 'tolerance' };
          }
          // Case 3: Pile is below tolerance - a refusal
          else {
            return { ...pile, status: 'refusal' };
          }
        } else {
          // Default to N/A if we don't have complete data
          return { ...pile, status: 'na' };
        }
      });

      setBlockPiles(processedPileData || []);
    } catch (error) {
      console.error(`Error loading piles for block ${blockName}:`, error);
      toast.error("Failed to load piles data");
    } finally {
      setIsLoadingPiles(false);
    }
  };

  // Helper function to format numbers
  const formatNumber = (num: number, decimals = 1) => {
    return num.toFixed(decimals);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Export blocks to Excel
  const exportBlocksToExcel = () => {
    if (!blocks.length) {
      toast.error("No block data to export");
      return;
    }

    try {
      const exportData = filteredBlocks.map(block => ({
        'Block': block.name,
        'Total Piles': block.totalPiles,
        'Refusal Count': block.refusalCount,
        'Refusal %': block.totalPiles > 0 ? ((block.refusalCount / block.totalPiles) * 100).toFixed(1) : '0',
        'Tolerance Count': block.toleranceCount,
        'Tolerance %': block.totalPiles > 0 ? ((block.toleranceCount / block.totalPiles) * 100).toFixed(1) : '0',
        'Slow Drive Count': block.slowDriveTimeCount,
        'Slow Drive %': block.totalPiles > 0 ? ((block.slowDriveTimeCount / block.totalPiles) * 100).toFixed(1) : '0',
        'Avg Drive Time (min)': formatNumber(block.averageDriveTime),
        'Avg Embedment (ft)': formatNumber(block.averageEmbedment, 2),
        'Design Embedment (ft)': block.designEmbedment ? formatNumber(block.designEmbedment, 2) : 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Blocks");

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const projectName = projectData?.project_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'project';
      const filename = `${projectName}_blocks_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`${filteredBlocks.length} blocks exported to Excel successfully`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export to Excel");
    }
  };

  // Export blocks to PDF
  const exportBlocksToPDFFile = () => {
    if (!blocks.length) {
      toast.error("No block data to export");
      return;
    }

    try {
      const activeFilters = [];
      if (searchQuery) activeFilters.push({ label: 'Search', value: searchQuery });
      if (selectedTab !== 'all') activeFilters.push({ label: 'Filter', value: selectedTab });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const projectName = projectData?.project_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'project';
      const filename = `${projectName}_blocks_${timestamp}.pdf`;

      exportBlocksToPDF(filteredBlocks, {
        title: 'Block Analysis Report',
        projectName: projectData?.project_name,
        projectLocation: projectData?.project_location,
        fileName: filename,
        orientation: 'landscape',
        filters: activeFilters
      });

      toast.success(`${filteredBlocks.length} blocks exported to PDF successfully`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Failed to export to PDF");
    }
  };

  // Get status badge for visual display
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} />
            Accepted
          </span>
        );
      case 'tolerance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            <AlertCircle size={12} />
            Tolerance
          </span>
        );
      case 'refusal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle size={12} />
            Refusal
          </span>
        );
      case 'na':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} />
            N/A
          </span>
        );
    }
  };

  if (!user) {
    return null; // Don't render anything if user isn't logged in
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Collapsible Sidebar - Hidden on mobile */}
      <CollapsibleSidebar
        projectName={projectData?.project_name}
        currentPage="blocks"
      />

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white flex items-center justify-center font-bold text-sm">
            PT
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Blocks
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
          {/* Admin Viewing Banner */}
          {isAdminViewing && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                <span className="text-amber-800 dark:text-amber-200 font-medium">
                  Admin View: Viewing {projectData?.project_name || 'project'} data
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('selectedProjectId');
                  window.location.reload();
                }}
                className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/30"
              >
                <X className="h-4 w-4 mr-1" />
                Exit Admin View
              </Button>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Block Analysis</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Analyze pile performance by block to identify patterns and issues
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search blocks..."
                    className="pl-8 h-10 w-full sm:w-[240px] bg-white dark:bg-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 w-full sm:w-[180px] bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Block Name</SelectItem>
                    <SelectItem value="totalPiles">Total Piles</SelectItem>
                    <SelectItem value="refusalPercent">Refusal %</SelectItem>
                    <SelectItem value="tolerancePercent">Tolerance %</SelectItem>
                    <SelectItem value="driveTimePercent">Slow Drive Time %</SelectItem>
                    <SelectItem value="averageDriveTime">Avg. Drive Time</SelectItem>
                    <SelectItem value="averageEmbedment">Avg. Embedment</SelectItem>
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
                    <DropdownMenuItem onClick={exportBlocksToExcel}>
                      <FileDown size={16} className="mr-2" />
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportBlocksToPDFFile}>
                      <FileText size={16} className="mr-2" />
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Blocks</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{blocks.length}</div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Blocks with Refusal</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-500">
                    {blocks.filter(b => b.refusalCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Blocks Within Tolerance</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-500">
                    {blocks.filter(b => b.toleranceCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Piles Within Tolerance</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-500">
                    {blocks.reduce((sum, block) => sum + block.toleranceCount, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Blocks with Slow Drive Time</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-slate-600 dark:text-slate-400">
                    {blocks.filter(b => b.slowDriveTimeCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg. Drive Time</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(blocks.reduce((sum, block) => sum + block.averageDriveTime, 0) / (blocks.length || 1))} min
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="mb-6" onValueChange={setSelectedTab}>
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  All Blocks
                </TabsTrigger>
                <TabsTrigger value="refusal" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Refusal Issues
                </TabsTrigger>
                {/* Removed tolerance tab to match My Piles page */}
                <TabsTrigger value="drivetime" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Clock className="h-4 w-4 mr-1" />
                  Drive Time Issues
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                    Loading block data, please wait...
                  </p>
                </div>
              </div>
            ) : filteredBlocks.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Box className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No blocks found</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                    {searchQuery
                      ? "No blocks match your search criteria. Try different search terms."
                      : selectedTab !== "all"
                        ? `No blocks with ${
                            selectedTab === "refusal"
                              ? "refusal"
                              : selectedTab === "tolerance"
                                ? "tolerance"
                                : "drive time"
                          } issues found.`
                        : "No blocks have been defined yet. Blocks are imported from your CSV data."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBlocks.map(block => (
                  <Card key={block.name} className="bg-white dark:bg-slate-800 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          {block.name}
                        </CardTitle>
                        <div className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          {block.totalPiles} piles
                        </div>
                      </div>
                      <CardDescription>
                        Design Embedment: {block.designEmbedment ? `${formatNumber(block.designEmbedment)} ft` : "N/A"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Refusal Gauge */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-2">
                            <CircularProgressbar
                              value={block.totalPiles > 0 ? (block.refusalCount / block.totalPiles) * 100 : 0}
                              text={`${block.totalPiles > 0 ? Math.round((block.refusalCount / block.totalPiles) * 100) : 0}%`}
                              styles={buildStyles({
                                textSize: '1.5rem',
                                pathColor: block.refusalCount > 0 ? '#f59e0b' : '#10b981',
                                textColor: block.refusalCount > 0 ? '#f59e0b' : '#10b981',
                                trailColor: '#e2e8f0'
                              })}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Refusal</div>
                          <div className={`text-sm font-medium ${block.refusalCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'}`}>
                            {block.refusalCount} of {block.totalPiles}
                          </div>
                        </div>

                        {/* Tolerance Gauge */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-2">
                            <CircularProgressbar
                              value={block.totalPiles > 0 ? (block.toleranceCount / block.totalPiles) * 100 : 0}
                              text={`${block.totalPiles > 0 ? Math.round((block.toleranceCount / block.totalPiles) * 100) : 0}%`}
                              styles={buildStyles({
                                textSize: '1.5rem',
                                pathColor: block.toleranceCount > 0 ? '#6366f1' : '#10b981',
                                textColor: block.toleranceCount > 0 ? '#6366f1' : '#10b981',
                                trailColor: '#e2e8f0'
                              })}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Tolerance</div>
                          <div className={`text-sm font-medium ${block.toleranceCount > 0 ? 'text-indigo-600 dark:text-indigo-500' : 'text-green-600 dark:text-green-500'}`}>
                            {block.toleranceCount} of {block.totalPiles}
                          </div>
                        </div>

                        {/* Drive Time Gauge */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-2">
                            <CircularProgressbar
                              value={block.totalPiles > 0 ? (block.slowDriveTimeCount / block.totalPiles) * 100 : 0}
                              text={`${block.totalPiles > 0 ? Math.round((block.slowDriveTimeCount / block.totalPiles) * 100) : 0}%`}
                              styles={buildStyles({
                                textSize: '1.5rem',
                                pathColor: block.slowDriveTimeCount > 0 ? '#3b82f6' : '#10b981',
                                textColor: block.slowDriveTimeCount > 0 ? '#3b82f6' : '#10b981',
                                trailColor: '#e2e8f0'
                              })}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Drive Time</div>
                          <div className={`text-sm font-medium ${block.slowDriveTimeCount > 0 ? 'text-slate-600 dark:text-slate-400' : 'text-green-600 dark:text-green-500'}`}>
                            {block.slowDriveTimeCount} of {block.totalPiles}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg. Drive Time</div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatNumber(block.averageDriveTime)} min
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg. Embedment</div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatNumber(block.averageEmbedment)} ft
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => handleViewPilesInBlock(block.name)}
                      >
                        View Piles in Block
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Block Piles Modal */}
      <Dialog
        open={isBlockPilesModalOpen}
        onOpenChange={(open) => {
          setIsBlockPilesModalOpen(open);
          if (!open) setSelectedBlock(null);
        }}
      >
        <DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <Box className="h-5 w-5 mr-2 text-indigo-600" />
              Piles in Block: {selectedBlock}
            </DialogTitle>
          </DialogHeader>

          {isLoadingPiles ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
            </div>
          ) : blockPiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No piles found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                No piles were found in block {selectedBlock}
              </p>
            </div>
          ) : (
            <div>
              {/* Piles Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Piles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{blockPiles.length}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Accepted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                      {blockPiles.filter(pile => pile.status === 'accepted').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Tolerance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
                      {blockPiles.filter(pile => pile.status === 'tolerance').length}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Refusal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                      {blockPiles.filter(pile => pile.status === 'refusal').length}
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
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Pile Number</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Embedment</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Design Embedment</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Drive Time</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Pile Type</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {blockPiles.map((pile, index) => (
                        <tr
                          key={pile.id}
                          className={`${
                            index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'
                          } hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
                        >
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{pile.pile_id || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{pile.pile_number}</td>
                          <td className="py-3 px-4">{getStatusBadge(pile.status)}</td>
                          <td className={`py-3 px-4 font-medium ${
                            pile.status === 'refusal'
                              ? 'text-red-600 dark:text-red-500'
                              : pile.status === 'tolerance'
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-900 dark:text-white'
                          }`}>
                            {pile.embedment ? `${formatNumber(pile.embedment)} ft` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">
                            {pile.design_embedment ? `${formatNumber(pile.design_embedment)} ft` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">
                            {pile.duration ? `${parseDuration(pile.duration).toFixed(1)} min` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{pile.pile_type || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {pile.start_date ? formatDate(pile.start_date) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom button to close modal */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setIsBlockPilesModalOpen(false)}
                  className="bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}