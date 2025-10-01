"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, List, BarChart3, Settings, User, Bell, FileText, MapPin, Filter, Search, Clock, AlertTriangle, AlertCircle, Check, ChevronLeft, ChevronRight, Box } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

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

  // Configuration values
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);
  const [driveTimeThreshold, setDriveTimeThreshold] = useState(10);

  // Filtering
  const [filteredBlocks, setFilteredBlocks] = useState<BlockData[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

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
          // Get the user's project
          const { data: userProjectData } = await supabase
            .from('user_projects')
            .select('project_id, role, is_owner')
            .eq('user_id', user.id)
            .single();

          if (userProjectData) {
            // Get the project details
            const { data: project } = await supabase
              .from('projects')
              .select('*')
              .eq('id', userProjectData.project_id)
              .single();

            if (project) {
              setProjectData(project);

              // Get embedment tolerance from project settings
              const tolerance = project.embedment_tolerance !== undefined && project.embedment_tolerance !== null
                ? project.embedment_tolerance
                : 1;
              setEmbedmentTolerance(tolerance);

              // Get total count of piles with blocks
              const { count, error: countError } = await supabase
                .from('piles')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id)
                .not('block', 'is', null);

              if (countError) {
                throw countError;
              }

              const totalCount = count || 0;
              console.log("Total piles with blocks:", totalCount);

              // Fetch ALL piles with blocks in parallel pages (same as my-piles page)
              let allPilesData: any[] = [];
              const pageSize = 1000;
              const totalPages = Math.ceil(totalCount / pageSize);

              console.log(`Loading ${totalCount} piles in ${totalPages} parallel requests`);

              if (totalPages > 0) {
                const fetchPromises = [];

                for (let page = 0; page < totalPages; page++) {
                  const from = page * pageSize;
                  const to = Math.min(from + pageSize - 1, totalCount - 1);

                  fetchPromises.push(
                    supabase
                      .from('piles')
                      .select('*')
                      .eq('project_id', project.id)
                      .not('block', 'is', null)
                      .range(from, to)
                  );
                }

                console.log(`Fetching ${fetchPromises.length} pages in parallel...`);
                const results = await Promise.allSettled(fetchPromises);

                for (let i = 0; i < results.length; i++) {
                  const result = results[i];
                  if (result.status === 'fulfilled' && result.value.data) {
                    allPilesData = [...allPilesData, ...result.value.data];
                    console.log(`Page ${i + 1}: Loaded ${result.value.data.length} piles`);
                  } else if (result.status === 'rejected') {
                    console.error(`Page ${i + 1} failed:`, result.reason);
                  }
                }

                console.log(`Successfully loaded ${allPilesData.length} of ${totalCount} piles`);
              }

              const pileData = allPilesData;

              // Extract unique blocks from ALL the loaded pile data
              const uniqueBlocks = new Set<string>();
              pileData.forEach(pile => {
                if (pile.block && pile.block.trim()) {
                  uniqueBlocks.add(pile.block.trim());
                }
              });

              console.log(`Found ${uniqueBlocks.size} unique blocks:`, Array.from(uniqueBlocks).sort());

              // Process block data
              const blockMap = new Map<string, BlockData>();

              // Initialize block data with empty counts
              const blockArray: BlockData[] = [];

              // Process each block one by one, making separate count queries for each
              const processBlocks = async () => {
                for (const blockName of uniqueBlocks) {
                  // Create basic block data structure
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

                  // Get exact count for this block directly from database
                  const { count, error: countError } = await supabase
                    .from('piles')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id)
                    .eq('block', blockName);

                  if (countError) {
                    console.error(`Error getting count for block ${blockName}:`, countError);
                  } else if (count !== null) {
                    // Set the exact count from the database
                    blockData.totalPiles = count;
                    console.log(`Block ${blockName} has ${count} piles`);
                  }

                  // Add to array
                  blockArray.push(blockData);

                  // Also add to map for statistics calculation
                  blockMap.set(blockName, blockData);
                }

                // Now calculate other statistics
                let blockEmbedmentSums: { [blockName: string]: number } = {};
                let blockDurationSums: { [blockName: string]: number } = {};
                let blockRefusalCounts: { [blockName: string]: number } = {};
                let blockToleranceCounts: { [blockName: string]: number } = {};
                let blockSlowDriveCounts: { [blockName: string]: number } = {};

                // Process statistics for each pile
                pileData.forEach(pile => {
                  if (!pile.block) return;

                  const blockName = pile.block.trim();
                  const blockData = blockMap.get(blockName);
                  if (!blockData) return;

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

                // Update all the block data with calculated statistics
                for (const blockName of uniqueBlocks) {
                  const blockData = blockMap.get(blockName);
                  if (!blockData) continue;

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
                }

                // Set the blocks state
                setBlocks(blockArray);
                setIsLoading(false);
              };

              // Execute the async function
              processBlocks().catch(error => {
                console.error("Error processing blocks:", error);
                setIsLoading(false);
              });
            }
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
          // Default to pending if we don't have complete data
          return { ...pile, status: 'pending' };
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
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  if (!user) {
    return null; // Don't render anything if user isn't logged in
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - Hidden on mobile */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col z-10">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm">
              PT
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {projectData?.project_name || "PileTrackerPro"}
            </h1>
          </div>
        </div>
        <nav className="p-4 flex-1">
          <div className="space-y-1">
            {[
              { name: 'Dashboard', icon: BarChart3, href: '/dashboard', active: false },
              { name: 'My Piles', icon: List, href: '/my-piles', active: false },
              { name: 'Pile Types', icon: MapPin, href: '/zones', active: false },
              { name: 'Blocks', icon: Box, href: '/blocks', active: true },
              { name: 'Notes', icon: FileText, href: '/notes', active: false },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => item.href && router.push(item.href as any)}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </button>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
            {[
              { name: 'Settings', icon: Settings, href: '/settings', active: false },
              { name: 'Account', icon: User, href: '#', active: false },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => item.href && router.push(item.href as any)}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </button>
            ))}
          </div>
          {/* Dark mode toggle */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Theme</span>
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-auto pt-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm">
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
      <div className="lg:pl-72">
        <main className="p-4 sm:p-6 lg:p-8 pt-8">
          <div className="max-w-7xl mx-auto">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Block Analysis</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Blocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{blocks.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Blocks with Refusal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                    {blocks.filter(b => b.refusalCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Blocks Within Tolerance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
                    {blocks.filter(b => b.toleranceCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Piles Within Tolerance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
                    {blocks.reduce((sum, block) => sum + block.toleranceCount, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Blocks with Slow Drive Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                    {blocks.filter(b => b.slowDriveTimeCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Drive Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
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
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                          <div className={`text-sm font-medium ${block.slowDriveTimeCount > 0 ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'}`}>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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