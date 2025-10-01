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

interface ZoneData {
  name: string;
  totalPiles: number;
  refusalCount: number;
  toleranceCount: number; // Piles below design embedment but within tolerance
  slowDriveTimeCount: number;
  averageDriveTime: number;
  averageEmbedment: number;
  designEmbedment: number | null;
}

export default function PileTypesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(3);
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("User");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [pileTypes, setPileTypes] = useState<ZoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zonePiles, setZonePiles] = useState<any[]>([]);
  const [isZonePilesModalOpen, setIsZonePilesModalOpen] = useState(false);
  const [isLoadingPiles, setIsLoadingPiles] = useState(false);

  // Configuration values
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);
  const [driveTimeThreshold, setDriveTimeThreshold] = useState(10);

  // Filtering
  const [filteredPileTypes, setFilteredPileTypes] = useState<ZoneData[]>([]);
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
              
              // Load embedment tolerance from project settings if available
              if (project.embedment_tolerance !== undefined && project.embedment_tolerance !== null) {
                setEmbedmentTolerance(project.embedment_tolerance);
              }

              // Load pile data for pile type statistics
              const { data: pileData, error: pileError } = await supabase
                .from('piles')
                .select('*')
                .eq('project_id', project.id)
                .not('pile_type', 'is', null);

              if (pileError) {
                throw pileError;
              }

              // Process zone data
              const zoneMap = new Map<string, ZoneData>();

              // First gather all unique pileTypes
              const uniquePileTypes = new Set<string>();
              pileData.forEach(pile => {
                if (pile.pile_type) {
                  uniquePileTypes.add(pile.pile_type.trim());
                }
              });
              
              // Initialize zone data with empty counts
              const zoneArray: ZoneData[] = [];
              
              // Process each zone one by one, making separate count queries for each
              const processPileTypes = async () => {
                for (const zoneName of uniquePileTypes) {
                  // Create basic zone data structure
                  const zoneData: ZoneData = {
                    name: zoneName,
                    totalPiles: 0,
                    refusalCount: 0,
                    toleranceCount: 0,
                    slowDriveTimeCount: 0,
                    averageDriveTime: 0,
                    averageEmbedment: 0,
                    designEmbedment: null
                  };
                  
                  // Get exact count for this zone directly from database
                  const { count, error: countError } = await supabase
                    .from('piles')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id)
                    .eq('pile_type', zoneName);
                    
                  if (countError) {
                    console.error(`Error getting count for pile type ${zoneName}:`, countError);
                  } else if (count !== null) {
                    // Set the exact count from the database
                    zoneData.totalPiles = count;
                    console.log(`Zone ${zoneName} has ${count} piles`);
                  }
                  
                  // Add to array
                  zoneArray.push(zoneData);
                  
                  // Also add to map for statistics calculation
                  zoneMap.set(zoneName, zoneData);
                }
                
                // Now calculate other statistics
                let zoneEmbedmentSums: { [zoneName: string]: number } = {};
                let zoneDurationSums: { [zoneName: string]: number } = {};
                let zoneRefusalCounts: { [zoneName: string]: number } = {};
                let zoneToleranceCounts: { [zoneName: string]: number } = {};
                let zoneSlowDriveCounts: { [zoneName: string]: number } = {};
                
                // Process statistics for each pile
                pileData.forEach(pile => {
                  if (!pile.pile_type) return;
                  
                  const zoneName = pile.pile_type.trim();
                  const zoneData = zoneMap.get(zoneName);
                  if (!zoneData) return;
                  
                  // Parse duration
                  const duration = parseDuration(pile.duration);
                  
                  // Track total duration for calculating average later
                  zoneDurationSums[zoneName] = (zoneDurationSums[zoneName] || 0) + duration;
                  
                  // Count slow drive time piles
                  if (duration > driveTimeThreshold) {
                    zoneSlowDriveCounts[zoneName] = (zoneSlowDriveCounts[zoneName] || 0) + 1;
                  }

                  // Update embedment data
                  if (pile.embedment && pile.design_embedment) {
                    // Set design embedment (should be the same for all piles in pile type)
                    zoneData.designEmbedment = pile.design_embedment;
                    
                    // Track total embedment for calculating average later
                    zoneEmbedmentSums[zoneName] = (zoneEmbedmentSums[zoneName] || 0) + pile.embedment;
                    
                    // Check embedment against design values
                    if (pile.embedment < (pile.design_embedment - embedmentTolerance)) {
                      // Count refusal piles (below tolerance)
                      zoneRefusalCounts[zoneName] = (zoneRefusalCounts[zoneName] || 0) + 1;
                    } else if (pile.embedment < pile.design_embedment) {
                      // Count piles below design embedment but within tolerance
                      zoneToleranceCounts[zoneName] = (zoneToleranceCounts[zoneName] || 0) + 1;
                    }
                  }
                });
                
                // Update all the zone data with calculated statistics
                for (const zoneName of uniquePileTypes) {
                  const zoneData = zoneMap.get(zoneName);
                  if (!zoneData) continue;
                  
                  // Set refusal and tolerance counts
                  zoneData.refusalCount = zoneRefusalCounts[zoneName] || 0;
                  zoneData.toleranceCount = zoneToleranceCounts[zoneName] || 0;
                  zoneData.slowDriveTimeCount = zoneSlowDriveCounts[zoneName] || 0;
                  
                  // Calculate averages if we have data
                  if (zoneData.totalPiles > 0) {
                    if (zoneDurationSums[zoneName]) {
                      zoneData.averageDriveTime = zoneDurationSums[zoneName] / zoneData.totalPiles;
                    }
                    
                    if (zoneEmbedmentSums[zoneName]) {
                      zoneData.averageEmbedment = zoneEmbedmentSums[zoneName] / zoneData.totalPiles;
                    }
                  }
                }
                
                // Set the pileTypes state
                setPileTypes(zoneArray);
                setIsLoading(false);
              };
              
              // Execute the async function
              processPileTypes().catch(error => {
                console.error("Error processing pileTypes:", error);
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
          console.error("Error loading zone data:", error);
          toast.error("Failed to load zone data");
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

  // Filter and sort pileTypes
  useEffect(() => {
    let filtered = [...pileTypes];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(zone => 
        zone.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply tab filter
    if (selectedTab === "refusal") {
      filtered = filtered.filter(zone => zone.refusalCount > 0);
    } else if (selectedTab === "drivetime") {
      filtered = filtered.filter(zone => zone.slowDriveTimeCount > 0);
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
    
    setFilteredPileTypes(filtered);
  }, [pileTypes, searchQuery, selectedTab, sortBy, sortOrder]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };
  
  const handleViewPilesInZone = async (zoneName: string) => {
    if (!projectData) return;
    
    try {
      setSelectedZone(zoneName);
      setIsLoadingPiles(true);
      setIsZonePilesModalOpen(true);
      
      // Fetch piles for the selected zone
      const { data: pileData, error } = await supabase
        .from('piles')
        .select('*')
        .eq('project_id', projectData.id)
        .eq('pile_type', zoneName);
      
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
      
      setZonePiles(processedPileData || []);
    } catch (error) {
      console.error(`Error loading piles for pile type ${zoneName}:`, error);
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
              { name: 'Pile Types', icon: MapPin, href: '/pileTypes', active: true },
              { name: 'Blocks', icon: Box, href: '/blocks', active: false },
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
            Pile Types
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pile Type Analysis</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Analyze pile performance by pile type to identify patterns and issues
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search pileTypes..."
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
                    <SelectItem value="name">Pile Type Name</SelectItem>
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
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pile Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{pileTypes.length}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Pile Types with Refusal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                    {pileTypes.filter(z => z.refusalCount > 0).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Pile Types Within Tolerance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
                    {pileTypes.filter(z => z.toleranceCount > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Piles Within Tolerance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
                    {pileTypes.reduce((sum, zone) => sum + zone.toleranceCount, 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Pile Types with Slow Drive Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                    {pileTypes.filter(z => z.slowDriveTimeCount > 0).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Drive Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(pileTypes.reduce((sum, zone) => sum + zone.averageDriveTime, 0) / (pileTypes.length || 1))} min
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="mb-6" onValueChange={setSelectedTab}>
              <TabsList className="bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  All Pile Types
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
            ) : filteredPileTypes.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPin className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No pileTypes found</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                    {searchQuery 
                      ? "No pileTypes match your search criteria. Try different search terms."
                      : selectedTab !== "all" 
                        ? `No pileTypes with ${
                            selectedTab === "refusal" 
                              ? "refusal" 
                              : selectedTab === "tolerance"
                                ? "tolerance" 
                                : "drive time"
                          } issues found.`
                        : "No pileTypes have been defined yet. Pile Types are imported from your CSV data."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPileTypes.map(zone => (
                  <Card key={zone.name} className="bg-white dark:bg-slate-800 overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                          {zone.name}
                        </CardTitle>
                        <div className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          {zone.totalPiles} piles
                        </div>
                      </div>
                      <CardDescription>
                        Design Embedment: {zone.designEmbedment ? `${formatNumber(zone.designEmbedment)} ft` : "N/A"}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Refusal Gauge */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-2">
                            <CircularProgressbar
                              value={zone.totalPiles > 0 ? (zone.refusalCount / zone.totalPiles) * 100 : 0}
                              text={`${zone.totalPiles > 0 ? Math.round((zone.refusalCount / zone.totalPiles) * 100) : 0}%`}
                              styles={buildStyles({
                                textSize: '1.5rem',
                                pathColor: zone.refusalCount > 0 ? '#f59e0b' : '#10b981',
                                textColor: zone.refusalCount > 0 ? '#f59e0b' : '#10b981',
                                trailColor: '#e2e8f0'
                              })}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Refusal</div>
                          <div className={`text-sm font-medium ${zone.refusalCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'}`}>
                            {zone.refusalCount} of {zone.totalPiles}
                          </div>
                        </div>
                        
                        {/* Tolerance Gauge */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-2">
                            <CircularProgressbar
                              value={zone.totalPiles > 0 ? (zone.toleranceCount / zone.totalPiles) * 100 : 0}
                              text={`${zone.totalPiles > 0 ? Math.round((zone.toleranceCount / zone.totalPiles) * 100) : 0}%`}
                              styles={buildStyles({
                                textSize: '1.5rem',
                                pathColor: zone.toleranceCount > 0 ? '#6366f1' : '#10b981',
                                textColor: zone.toleranceCount > 0 ? '#6366f1' : '#10b981',
                                trailColor: '#e2e8f0'
                              })}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Tolerance</div>
                          <div className={`text-sm font-medium ${zone.toleranceCount > 0 ? 'text-indigo-600 dark:text-indigo-500' : 'text-green-600 dark:text-green-500'}`}>
                            {zone.toleranceCount} of {zone.totalPiles}
                          </div>
                        </div>
                        
                        {/* Drive Time Gauge */}
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-2">
                            <CircularProgressbar
                              value={zone.totalPiles > 0 ? (zone.slowDriveTimeCount / zone.totalPiles) * 100 : 0}
                              text={`${zone.totalPiles > 0 ? Math.round((zone.slowDriveTimeCount / zone.totalPiles) * 100) : 0}%`}
                              styles={buildStyles({
                                textSize: '1.5rem',
                                pathColor: zone.slowDriveTimeCount > 0 ? '#3b82f6' : '#10b981',
                                textColor: zone.slowDriveTimeCount > 0 ? '#3b82f6' : '#10b981',
                                trailColor: '#e2e8f0'
                              })}
                            />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Drive Time</div>
                          <div className={`text-sm font-medium ${zone.slowDriveTimeCount > 0 ? 'text-blue-600 dark:text-blue-500' : 'text-green-600 dark:text-green-500'}`}>
                            {zone.slowDriveTimeCount} of {zone.totalPiles}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg. Drive Time</div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatNumber(zone.averageDriveTime)} min
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg. Embedment</div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatNumber(zone.averageEmbedment)} ft
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-4"
                        onClick={() => handleViewPilesInZone(zone.name)}
                      >
                        View Piles in Zone
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Zone Piles Modal */}
      <Dialog 
        open={isZonePilesModalOpen} 
        onOpenChange={(open) => {
          setIsZonePilesModalOpen(open);
          if (!open) setSelectedZone(null);
        }}
      >
        <DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
              Piles in Pile Type: {selectedZone}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingPiles ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : zonePiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No piles found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                No piles were found in pile type {selectedZone}
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
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{zonePiles.length}</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Accepted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-500">
                      {zonePiles.filter(pile => pile.status === 'accepted').length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Tolerance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-500">
                      {zonePiles.filter(pile => pile.status === 'tolerance').length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white dark:bg-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Refusal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
                      {zonePiles.filter(pile => pile.status === 'refusal').length}
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
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Block</th>
                        <th className="py-3 px-4 text-left font-medium text-slate-500 dark:text-slate-400">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {zonePiles.map((pile, index) => (
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
                          <td className="py-3 px-4 text-slate-900 dark:text-white">{pile.block || 'N/A'}</td>
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
                  onClick={() => setIsZonePilesModalOpen(false)}
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