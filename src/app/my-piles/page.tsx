"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, Plus, List, BarChart3, Settings, User, Bell, Filter, Download, Search, Info, X, Check, Clock, AlertTriangle, Link2, CheckCircle2, MoreHorizontal, Edit2, FileText, Trash2, ChevronLeft, ChevronRight, CalendarIcon, AlertCircle, Pencil, Save, Moon, Sun, FileUp, FileDown, RefreshCw, Eye, Home, MapPin, Loader2, ChevronDown, Building2, Grid } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { hasCompletedProjectSetup, supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CSVUploadModal } from "@/components/CSVUploadModal";
import { DeleteAllPilesButton } from "@/components/DeleteAllPilesButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from 'xlsx';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAccountType } from "@/context/AccountTypeContext";

interface PileData {
  id: string;
  pile_number: string;
  pile_location: string;
  pile_type: string;
  pile_status: string;
  installation_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  block: string | null;
  design_embedment: number | null;
  duration: string | null;
  embedment: number | null;
  end_z: number | null;
  gain_per_30_seconds: number | null;
  machine: number | null;
  pile_color: string | null;
  pile_id: string | null;
  pile_size: string | null;
  start_date: string | null;
  start_time: string | null;
  start_z: number | null;
  stop_time: string | null;
  zone: string | null;
}

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

export default function MyPilesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(3);
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("Jane");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [piles, setPiles] = useState<PileData[]>([]);
  const [filteredPiles, setFilteredPiles] = useState<PileData[]>([]);
  const [totalPiles, setTotalPiles] = useState(0);
  const [acceptedPiles, setAcceptedPiles] = useState(0);
  const [refusalPiles, setRefusalPiles] = useState(0);
  const [pendingPiles, setPendingPiles] = useState(0);
  const [duplicatePileIds, setDuplicatePileIds] = useState<Set<string>>(new Set());
  const [isDeleteDuplicatesDialogOpen, setIsDeleteDuplicatesDialogOpen] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
  const [selectedPiles, setSelectedPiles] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [blockFilter, setBlockFilter] = useState("all");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueBlocks, setUniqueBlocks] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Configuration values
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);
  const [gainThreshold, setGainThreshold] = useState(6);
  
  // CSV Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // For the pile detail popup
  const [selectedPile, setSelectedPile] = useState<PileData | null>(null);
  const [isPileDetailOpen, setIsPileDetailOpen] = useState(false);
  
  // Add new state variables at the top of the component
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pileToDelete, setPileToDelete] = useState<PileData | null>(null);
  const [isAddNotesDialogOpen, setIsAddNotesDialogOpen] = useState(false);
  const [pileToAddNotes, setPileToAddNotes] = useState<PileData | null>(null);
  const [noteContent, setNoteContent] = useState("");
  
  // Status editing state
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Generate a unique color for each duplicate pile ID
  const getDuplicateColor = (pileId: string) => {
    // Predefined set of visually distinct colors with good contrast
    const distinctColors = [
      { bg: 'hsl(0, 85%, 90%)', border: 'hsl(0, 85%, 70%)', text: 'hsl(0, 85%, 30%)' },
      { bg: 'hsl(120, 85%, 90%)', border: 'hsl(120, 85%, 70%)', text: 'hsl(120, 85%, 30%)' },
      { bg: 'hsl(240, 85%, 90%)', border: 'hsl(240, 85%, 70%)', text: 'hsl(240, 85%, 30%)' },
      { bg: 'hsl(60, 85%, 90%)', border: 'hsl(60, 85%, 70%)', text: 'hsl(60, 85%, 30%)' },
      { bg: 'hsl(300, 85%, 90%)', border: 'hsl(300, 85%, 70%)', text: 'hsl(300, 85%, 30%)' },
      { bg: 'hsl(180, 85%, 90%)', border: 'hsl(180, 85%, 70%)', text: 'hsl(180, 85%, 30%)' },
      { bg: 'hsl(30, 85%, 90%)', border: 'hsl(30, 85%, 70%)', text: 'hsl(30, 85%, 30%)' },
      { bg: 'hsl(270, 85%, 90%)', border: 'hsl(270, 85%, 70%)', text: 'hsl(270, 85%, 30%)' },
      { bg: 'hsl(150, 85%, 90%)', border: 'hsl(150, 85%, 70%)', text: 'hsl(150, 85%, 30%)' },
      { bg: 'hsl(330, 85%, 90%)', border: 'hsl(330, 85%, 70%)', text: 'hsl(330, 85%, 30%)' }
    ];
    
    // Generate a consistent index for each pile ID
    let hash = 0;
    for (let i = 0; i < pileId.length; i++) {
      hash = pileId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use the hash to select a color from our predefined set
    const colorIndex = Math.abs(hash) % distinctColors.length;
    return distinctColors[colorIndex];
  };
  
  // Map of pile IDs to their assigned colors for duplicates
  const [duplicateColors, setDuplicateColors] = useState<Record<string, { bg: string, border: string, text: string }>>({});
  
  // Update duplicate colors whenever the duplicate set changes
  useEffect(() => {
    const colors: Record<string, { bg: string, border: string, text: string }> = {};
    duplicatePileIds.forEach(pileId => {
      colors[pileId] = getDuplicateColor(pileId);
    });
    setDuplicateColors(colors);
  }, [duplicatePileIds]);

  // Format time to standard 12-hour format
  const formatTimeToStandard = (timeString: string | null) => {
    if (!timeString) return "N/A";
    
    try {
      // Parse time string (could be in various formats)
      let hours = 0;
      let minutes = 0;
      
      // Try to extract hours and minutes
      if (timeString.includes(':')) {
        const parts = timeString.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
      } else {
        // If it's just a number, treat as hours
        hours = parseInt(timeString, 10);
      }
      
      // Convert to 12-hour format
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      
      // Format the time string
      return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (err) {
      console.error("Error formatting time:", err);
      return timeString; // Return original if parsing fails
    }
  };

  // Parse duration string to minutes
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
  
  // Get drive time classification
  const getDriveTimeClass = (duration: number): { colorClass: string; bgClass: string; borderClass: string; textClass: string; label: string } => {
    if (duration <= 5) {
      return { 
        colorClass: 'text-green-700',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        textClass: 'text-green-700',
        label: 'Optimal' 
      };
    } else if (duration <= 10) {
      return { 
        colorClass: 'text-amber-700',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        textClass: 'text-amber-700',
        label: 'Suboptimal' 
      };
    } else {
      return { 
        colorClass: 'text-red-700',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200',
        textClass: 'text-red-700',
        label: 'Bad' 
      };
    }
  };

  useEffect(() => {
    // Check if user is logged in, if not redirect to auth page
    if (!user) {
      router.push("/auth");
      return;
    }

    // Load user and project data
    const loadData = async () => {
      if (user) {
        // 1. Check if user has completed project setup
        const completed = await hasCompletedProjectSetup(user.id);
        if (!completed) {
          router.push("/project-setup");
          return;
        }

        // 2. Load user's project data
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
              
              // Get piles data - first get the count
              const { count, error: countError } = await supabase
                .from('piles')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id);

              if (countError) {
                throw countError;
              }

              const totalCount = count || 0;
              console.log("Total piles in database:", totalCount);
              
              // Set total count immediately from count query
              setTotalPiles(totalCount);
              
              // Now fetch all the data
              let allPilesData: PileData[] = [];
              const pageSize = 1000; // Reduced page size for more reliable fetching
              let page = 0;
              let hasMoreData = true;
              
              // Fetch data in chunks to handle large datasets
              while (hasMoreData) {
                const from = page * pageSize;
                const to = from + pageSize - 1;
                
                console.log(`Refreshing page ${page+1}: rows ${from} to ${to}`);
                
                const { data: paginatedData, error } = await supabase
                  .from('piles')
                  .select('*')
                  .eq('project_id', project.id)
                  .range(from, to);
                
                if (error) {
                  console.error("Error refreshing page", page, error);
                  throw error;
                }
                
                if (paginatedData && paginatedData.length > 0) {
                  console.log(`Received ${paginatedData.length} records for refresh page ${page+1}`);
                  allPilesData = [...allPilesData, ...paginatedData];
                  page++;
                  
                  // If we got fewer records than the page size, we've fetched all data
                  if (paginatedData.length < pageSize) {
                    console.log("Received fewer records than page size, finished refresh pagination");
                    hasMoreData = false;
                  }
                  
                  // Safety check - if we've fetched all records according to count
                  if (allPilesData.length >= totalCount) {
                    console.log("Fetched all records according to count, finished refresh pagination");
                    hasMoreData = false;
                  }
                } else {
                  // No more data
                  console.log("No more data received, finished refresh pagination");
                  hasMoreData = false;
                }
              }
              
              console.log(`Refreshed a total of ${allPilesData.length} piles out of ${totalCount} total`);
              
              if (allPilesData.length > 0) {
                setPiles(allPilesData);
                // Don't reset filtered piles directly here - let the useEffect do it
                // to preserve filters like showDuplicatesOnly
                
                // Extract unique blocks
                const blocks = Array.from(new Set(
                  allPilesData
                    .map((pile: PileData) => pile.block)
                    .filter(block => block !== null && block !== "") as string[]
                )).sort();
                setUniqueBlocks(blocks);
                
                // Calculate status counts based on embedment criteria
                const accepted = allPilesData.filter((pile: PileData) => 
                  getPileStatus(pile) === 'accepted'
                ).length;
                
                const refusals = allPilesData.filter((pile: PileData) => 
                  getPileStatus(pile) === 'refusal'
                ).length;
                
                const pending = allPilesData.filter((pile: PileData) => 
                  getPileStatus(pile) === 'pending'
                ).length;
                
                setAcceptedPiles(accepted);
                setRefusalPiles(refusals);
                setPendingPiles(pending);
              }
            }
          }
        } catch (error) {
          console.error("Error loading project data:", error);
          toast.error("Failed to load project data");
        } finally {
          setIsLoading(false);
        }

        // 3. Extract user data
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
      }
    };
    
    loadData();
  }, [user, router]);

  useEffect(() => {
    // Find duplicate pile IDs
    const findDuplicates = () => {
      const pileIdCounts: Record<string, number> = {};
      const duplicates = new Set<string>();
      
      piles.forEach(pile => {
        if (pile.pile_id) {
          pileIdCounts[pile.pile_id] = (pileIdCounts[pile.pile_id] || 0) + 1;
          if (pileIdCounts[pile.pile_id] > 1) {
            duplicates.add(pile.pile_id);
          }
        }
      });
      
      setDuplicatePileIds(duplicates);
    };
    
    findDuplicates();
  }, [piles]);

  // Sort and group duplicate pile IDs together
  const sortAndGroupDuplicates = (piles: PileData[]) => {
    // Create a map of pile IDs to count occurrences
    const pileIdCounts: Record<string, number> = {};
    piles.forEach(pile => {
      if (pile.pile_id) {
        pileIdCounts[pile.pile_id] = (pileIdCounts[pile.pile_id] || 0) + 1;
      }
    });
    
    // Sort piles - first by whether they have duplicates, then by pile ID
    return [...piles].sort((a, b) => {
      const aId = a.pile_id || '';
      const bId = b.pile_id || '';
      
      // If both are duplicates or both are not duplicates, sort by pile ID
      const aIsDuplicate = pileIdCounts[aId] > 1;
      const bIsDuplicate = pileIdCounts[bId] > 1;
      
      if (aIsDuplicate && bIsDuplicate) {
        // Both are duplicates, sort by pile ID to group them
        return aId.localeCompare(bId);
      } else if (aIsDuplicate) {
        // Only a is a duplicate, it comes first
        return -1;
      } else if (bIsDuplicate) {
        // Only b is a duplicate, it comes first
        return 1;
      } else {
        // Neither are duplicates, sort by pile ID
        return aId.localeCompare(bId);
      }
    });
  };

  // Filter piles based on search query, status filter, and duplicates filter
  useEffect(() => {
    let filtered = [...piles];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(pile => getPileStatus(pile) === statusFilter);
    }
    
    // Apply block filter
    if (blockFilter !== "all") {
      filtered = filtered.filter(pile => pile.block === blockFilter);
    }
    
    // Apply date filter
    if (startDate) {
      filtered = filtered.filter(pile => {
        if (!pile.start_date) return false;
        const pileDate = new Date(pile.start_date);
        return pileDate >= startDate;
      });
    }
    
    if (endDate) {
      filtered = filtered.filter(pile => {
        if (!pile.start_date) return false;
        const pileDate = new Date(pile.start_date);
        // Add one day to endDate to include the end date in the filter
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        return pileDate < endDatePlusOne;
      });
    }
    
    // Apply duplicates filter
    if (showDuplicatesOnly) {
      filtered = filtered.filter(pile => pile.pile_id && duplicatePileIds.has(pile.pile_id));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pile => 
        (pile.pile_number && pile.pile_number.toLowerCase().includes(query)) ||
        (pile.pile_id && pile.pile_id.toLowerCase().includes(query)) ||
        (pile.zone && pile.zone.toLowerCase().includes(query)) ||
        (pile.block && pile.block.toLowerCase().includes(query)) ||
        (pile.pile_type && pile.pile_type.toLowerCase().includes(query)) ||
        (pile.pile_size && pile.pile_size.toLowerCase().includes(query)) ||
        (pile.pile_color && pile.pile_color.toLowerCase().includes(query)) ||
        (pile.notes && pile.notes.toLowerCase().includes(query))
      );
    }
    
    // Sort and group duplicates
    filtered = sortAndGroupDuplicates(filtered);
    
    setFilteredPiles(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [piles, searchQuery, statusFilter, blockFilter, startDate, endDate, embedmentTolerance, duplicatePileIds, showDuplicatesOnly]);

  // Update statistics based on filtered piles
  useEffect(() => {
    // Count piles by status within the filtered set
    const accepted = filteredPiles.filter(pile => 
      getPileStatus(pile) === 'accepted'
    ).length;
    
    const refusals = filteredPiles.filter(pile => 
      getPileStatus(pile) === 'refusal'
    ).length;
    
    const pending = filteredPiles.filter(pile => 
      getPileStatus(pile) === 'pending'
    ).length;
    
    // Update the stats with filtered counts
    setAcceptedPiles(accepted);
    setRefusalPiles(refusals);
    setPendingPiles(pending);
  }, [filteredPiles]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Function to determine pile status based on embedment
  const getPileStatus = (pile: PileData) => {
    if (!pile.embedment || !pile.design_embedment) return 'pending';
    
    if (Number(pile.embedment) >= Number(pile.design_embedment)) {
      return 'accepted';
    } else if (Number(pile.embedment) < (Number(pile.design_embedment) - embedmentTolerance)) {
      return 'refusal';
    } else {
      return 'accepted'; // Within tolerance
    }
  };
  
  // Function to get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} />
            Accepted
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
  
  const refreshPilesData = async () => {
    if (!projectData) return;
    
    setIsLoading(true);
    try {
      // First get the count
      const { count, error: countError } = await supabase
        .from('piles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectData.id);

      if (countError) {
        throw countError;
      }

      const totalCount = count || 0;
      console.log("Total piles in database (refresh):", totalCount);
      
      // Set total count immediately from count query
      setTotalPiles(totalCount);
      
      // Now fetch all the data
      let allPilesData: PileData[] = [];
      const pageSize = 1000; // Reduced page size for more reliable fetching
      let page = 0;
      let hasMoreData = true;
      
      // Fetch data in chunks to handle large datasets
      while (hasMoreData) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        console.log(`Refreshing page ${page+1}: rows ${from} to ${to}`);
        
        const { data: paginatedData, error } = await supabase
          .from('piles')
          .select('*')
          .eq('project_id', projectData.id)
          .range(from, to);
        
        if (error) {
          console.error("Error refreshing page", page, error);
          throw error;
        }
        
        if (paginatedData && paginatedData.length > 0) {
          console.log(`Received ${paginatedData.length} records for refresh page ${page+1}`);
          allPilesData = [...allPilesData, ...paginatedData];
          page++;
          
          // If we got fewer records than the page size, we've fetched all data
          if (paginatedData.length < pageSize) {
            console.log("Received fewer records than page size, finished refresh pagination");
            hasMoreData = false;
          }
          
          // Safety check - if we've fetched all records according to count
          if (allPilesData.length >= totalCount) {
            console.log("Fetched all records according to count, finished refresh pagination");
            hasMoreData = false;
          }
        } else {
          // No more data
          console.log("No more data received, finished refresh pagination");
          hasMoreData = false;
        }
      }
      
      console.log(`Refreshed a total of ${allPilesData.length} piles out of ${totalCount} total`);
      
      if (allPilesData.length > 0) {
        setPiles(allPilesData);
        // Don't reset filtered piles directly here - let the useEffect do it
        // to preserve filters like showDuplicatesOnly
        
        // Extract unique blocks
        const blocks = Array.from(new Set(
          allPilesData
            .map((pile: PileData) => pile.block)
            .filter(block => block !== null && block !== "") as string[]
        )).sort();
        setUniqueBlocks(blocks);
        
        // Calculate status counts based on embedment criteria
        const accepted = allPilesData.filter((pile: PileData) => 
          getPileStatus(pile) === 'accepted'
        ).length;
        
        const refusals = allPilesData.filter((pile: PileData) => 
          getPileStatus(pile) === 'refusal'
        ).length;
        
        const pending = allPilesData.filter((pile: PileData) => 
          getPileStatus(pile) === 'pending'
        ).length;
        
        setAcceptedPiles(accepted);
        setRefusalPiles(refusals);
        setPendingPiles(pending);
      }
    } catch (error) {
      console.error("Error refreshing pile data:", error);
      toast.error("Failed to refresh pile data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCSVUploadComplete = () => {
    refreshPilesData();
    setIsUploadModalOpen(false);
  };

  // Function to open pile detail dialog
  const openPileDetail = (pile: PileData) => {
    setSelectedPile(pile);
    // Set the initial selected status based on either:
    // 1. The pile's manual status if it exists, or
    // 2. The calculated status based on embedment
    setSelectedStatus(pile.pile_status || getPileStatus(pile));
    setIsEditingStatus(false);
    // Add a slight delay before opening the dialog for a smoother interaction feel
    setTimeout(() => {
      setIsPileDetailOpen(true);
    }, 150);
  };

  // Function to handle pile deletion
  const handleDeletePile = async () => {
    if (!pileToDelete || !projectData) return;
    
    try {
      const { error } = await supabase
        .from('piles')
        .delete()
        .eq('id', pileToDelete.id);
        
      if (error) throw error;
      
      // Update local state to remove the deleted pile
      setPiles(prevPiles => prevPiles.filter(pile => pile.id !== pileToDelete.id));
      setFilteredPiles(prevPiles => prevPiles.filter(pile => pile.id !== pileToDelete.id));
      
      // Update total piles count
      setTotalPiles(prev => prev - 1);
      
      // Update status counts
      const status = getPileStatus(pileToDelete);
      if (status === 'accepted') {
        setAcceptedPiles(prev => prev - 1);
      } else if (status === 'refusal') {
        setRefusalPiles(prev => prev - 1);
      } else {
        setPendingPiles(prev => prev - 1);
      }
      
      toast.success("Pile deleted successfully");
      setIsDeleteDialogOpen(false);
      setPileToDelete(null);
    } catch (error) {
      console.error("Error deleting pile:", error);
      toast.error("Failed to delete pile");
    }
  };
  
  // Function to handle saving notes
  const handleSaveNotes = async () => {
    if (!pileToAddNotes || !projectData) return;
    
    try {
      const { error } = await supabase
        .from('piles')
        .update({ notes: noteContent })
        .eq('id', pileToAddNotes.id);
        
      if (error) throw error;
      
      toast.success("Notes saved successfully");
      refreshPilesData();
      setIsAddNotesDialogOpen(false);
      setPileToAddNotes(null);
      setNoteContent("");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };
  
  // Function to handle status update
  const handleStatusUpdate = async () => {
    if (!selectedPile || !projectData) return;
    
    try {
      const { error } = await supabase
        .from('piles')
        .update({ pile_status: selectedStatus })
        .eq('id', selectedPile.id);
        
      if (error) throw error;
      
      toast.success("Pile status updated successfully");
      
      // Update the selected pile in the local state to reflect changes
      if (selectedPile) {
        setSelectedPile({
          ...selectedPile,
          pile_status: selectedStatus
        });
      }
      
      // Exit editing mode
      setIsEditingStatus(false);
      
      // Refresh data to update UI
      refreshPilesData();
    } catch (error) {
      console.error("Error updating pile status:", error);
      toast.error("Failed to update pile status");
    }
  };
  
  const exportToExcel = () => {
    if (!filteredPiles.length) {
      toast.error("No data to export");
      return;
    }

    try {
      // Create a clean version of the data with better formatted fields
      const cleanData = filteredPiles.map(pile => {
        // Calculate status based on our rules
        const status = getPileStatus(pile);
        
        // Format times and dates
        const formattedStartTime = pile.start_time ? formatTimeToStandard(pile.start_time) : "";
        const formattedStopTime = pile.stop_time ? formatTimeToStandard(pile.stop_time) : "";
        const formattedStartDate = pile.start_date ? formatDate(pile.start_date) : "";
        
        // Calculate drive time in minutes
        const driveTimeMinutes = pile.duration ? parseDuration(pile.duration) : "";
        const driveTimeRating = typeof driveTimeMinutes === 'number' ? getDriveTimeClass(driveTimeMinutes).label : "";
        
        // Return clean object with readable field names
        return {
          "Pile ID": pile.pile_id || "",
          "Block": pile.block || "",
          "Zone": pile.zone || "",
          "Status": status.charAt(0).toUpperCase() + status.slice(1), // Capitalize status
          "Design Embedment (ft)": pile.design_embedment || "",
          "Actual Embedment (ft)": pile.embedment || "",
          "Duration": pile.duration || "",
          "Drive Time (min)": driveTimeMinutes || "",
          "Drive Time Rating": driveTimeRating || "",
          "Machine": pile.machine || "",
          "Start Date": formattedStartDate,
          "Start Time": formattedStartTime,
          "Stop Time": formattedStopTime,
          "Start Z": pile.start_z || "",
          "End Z": pile.end_z || "",
          "Gain per 30s": pile.gain_per_30_seconds || "",
          "Notes": pile.notes || ""
        };
      });

      // Create worksheet with the clean data
      const worksheet = XLSX.utils.json_to_sheet(cleanData);
      
      // Create workbook and add the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Piles");
      
      // Generate filename with project name and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const projectName = projectData?.project_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'project';
      const filename = `${projectName}_piles_${timestamp}.xlsx`;
      
      // Write to file and download
      XLSX.writeFile(workbook, filename);
      toast.success(`${filteredPiles.length} piles exported successfully`);
    } catch (error) {
      console.error("Error exporting piles:", error);
      toast.error("Failed to export piles");
    }
  };

  // Function to find and delete duplicate piles
  const handleDeleteDuplicates = async () => {
    if (!projectData) return;
    
    try {
      setIsDeletingDuplicates(true);
      
      // Get all piles with duplicates
      const pilesWithDuplicates = piles.filter(pile => 
        pile.pile_id && duplicatePileIds.has(pile.pile_id)
      );
      
      // Group piles by pile_id
      const pilesByPileId = pilesWithDuplicates.reduce((acc, pile) => {
        if (!pile.pile_id) return acc;
        if (!acc[pile.pile_id]) {
          acc[pile.pile_id] = [];
        }
        acc[pile.pile_id].push(pile);
        return acc;
      }, {} as Record<string, PileData[]>);
      
      // For each pile_id, find duplicates and keep one
      const pilesToDelete: PileData[] = [];
      
      Object.entries(pilesByPileId).forEach(([pileId, piles]) => {
        // Group piles by their key values
        const pilesByValues = piles.reduce((acc, pile) => {
          const key = `${pile.embedment}_${pile.gain_per_30_seconds}_${pile.start_time}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(pile);
          return acc;
        }, {} as Record<string, PileData[]>);
        
        // For each group of identical piles, keep the first one and mark others for deletion
        Object.values(pilesByValues).forEach(group => {
          if (group.length > 1) {
            // Keep the first pile, mark the rest for deletion
            pilesToDelete.push(...group.slice(1));
          }
        });
      });
      
      if (pilesToDelete.length === 0) {
        toast.info("No duplicate piles found to delete");
        setIsDeleteDuplicatesDialogOpen(false);
        return;
      }
      
      // Delete the duplicate piles
      const { error } = await supabase
        .from('piles')
        .delete()
        .in('id', pilesToDelete.map(pile => pile.id));
        
      if (error) throw error;
      
      // Update local state
      setPiles(prevPiles => 
        prevPiles.filter(pile => !pilesToDelete.some(toDelete => toDelete.id === pile.id))
      );
      setFilteredPiles(prevPiles => 
        prevPiles.filter(pile => !pilesToDelete.some(toDelete => toDelete.id === pile.id))
      );
      
      // Update counts
      setTotalPiles(prev => prev - pilesToDelete.length);
      
      // Update status counts
      pilesToDelete.forEach(pile => {
        const status = getPileStatus(pile);
        if (status === 'accepted') {
          setAcceptedPiles(prev => prev - 1);
        } else if (status === 'refusal') {
          setRefusalPiles(prev => prev - 1);
        } else {
          setPendingPiles(prev => prev - 1);
        }
      });
      
      toast.success(`Successfully deleted ${pilesToDelete.length} duplicate piles`);
      setIsDeleteDuplicatesDialogOpen(false);
    } catch (error) {
      console.error("Error deleting duplicate piles:", error);
      toast.error("Failed to delete duplicate piles");
    } finally {
      setIsDeletingDuplicates(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPiles.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('piles')
        .delete()
        .in('id', Array.from(selectedPiles));

      if (error) throw error;

      // Update local state
      setPiles(piles.filter(pile => !selectedPiles.has(pile.id)));
      setFilteredPiles(filteredPiles.filter(pile => !selectedPiles.has(pile.id)));
      setSelectedPiles(new Set());
      setIsBulkDeleteDialogOpen(false);
      
      toast.success(`Successfully deleted ${selectedPiles.size} piles`);
    } catch (error) {
      console.error('Error deleting piles:', error);
      toast.error('Failed to delete piles');
    }
  };

  const togglePileSelection = (pileId: string) => {
    setSelectedPiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pileId)) {
        newSet.delete(pileId);
      } else {
        newSet.add(pileId);
      }
      return newSet;
    });
  };

  const toggleAllPilesSelection = () => {
    const currentPagePiles = filteredPiles
      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      .map(pile => pile.id);
    
    setSelectedPiles(prev => {
      const newSet = new Set(prev);
      const allSelected = currentPagePiles.every(id => newSet.has(id));
      
      if (allSelected) {
        currentPagePiles.forEach(id => newSet.delete(id));
      } else {
        currentPagePiles.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  };

  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [selectedPileForActions, setSelectedPileForActions] = useState<PileData | null>(null);

  const openActionsModal = (pile: PileData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPileForActions(pile);
    setIsActionsModalOpen(true);
  };

  const [isNotesViewModalOpen, setIsNotesViewModalOpen] = useState(false);
  const [selectedPileForNotes, setSelectedPileForNotes] = useState<PileData | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const openNotesModal = (pile: PileData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPileForNotes(pile);
    setEditingNoteContent(pile.notes || "");
    setIsNotesViewModalOpen(true);
  };

  const handleEditNotes = async () => {
    if (!selectedPileForNotes) return;

    try {
      const { error } = await supabase
        .from('piles')
        .update({ notes: editingNoteContent })
        .eq('id', selectedPileForNotes.id);

      if (error) throw error;

      // Update local state
      setPiles(piles.map(pile => 
        pile.id === selectedPileForNotes.id 
          ? { ...pile, notes: editingNoteContent }
          : pile
      ));
      setFilteredPiles(filteredPiles.map(pile => 
        pile.id === selectedPileForNotes.id 
          ? { ...pile, notes: editingNoteContent }
          : pile
      ));

      setIsEditingNotes(false);
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const handleDeleteAllPiles = async () => {
    if (!user || !projectData) return;
    
    try {
      setIsDeletingAll(true);
      
      // Delete all piles for the current project
      const { error } = await supabase
        .from('piles')
        .delete()
        .eq('project_id', projectData.id);
      
      if (error) {
        throw error;
      }
      
      // Reset states
      setPiles([]);
      setFilteredPiles([]);
      setTotalPiles(0);
      setAcceptedPiles(0);
      setRefusalPiles(0);
      setPendingPiles(0);
      setDuplicatePileIds(new Set());
      setSelectedPiles(new Set());
      
      toast.success("All piles have been deleted successfully");
      setIsDeleteAllDialogOpen(false);
    } catch (error) {
      console.error("Error deleting all piles:", error);
      toast.error("Failed to delete all piles. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const { canEdit } = useAccountType();

  if (!user) {
    return null; // Don't render anything if user isn't logged in
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
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
              { name: 'My Piles', icon: List, href: '/my-piles', active: true },
              { name: 'Zones', icon: MapPin, href: '/zones', active: false },
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

      {/* Main content */}
      <div className="lg:pl-72">
        
        {/* My Piles content */}
        <main className="p-4 sm:p-6 lg:p-8 pt-8">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Piles</h2>
                <p className="text-slate-500 mt-1">
                  {projectData ? `Project: ${projectData.project_name} | ${filteredPiles.length} of ${totalPiles} piles shown` : 'Loading project data...'}
                </p>
                {!canEdit && (
                  <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                    <p className="flex items-center gap-2">
                      <Info size={16} />
                      You have view-only access as an Owner's Representative
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {selectedPiles.size > 0 && canEdit && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedPiles.size})
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={exportToExcel}>
                  <Download size={16} />
                  Export
                </Button>
                {canEdit && (
                  <Button 
                    size="sm" 
                    className="gap-1.5"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    <Plus size={16} />
                    Upload CSV Data
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteAllDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <Trash2 size={16} />
                    Delete All
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Total Piles
                  {(statusFilter !== "all" || blockFilter !== "all" || showDuplicatesOnly || searchQuery) && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">(Filtered)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold">{filteredPiles.length}</div>
                  <div className="ml-2 text-sm text-slate-500">
                    {(statusFilter !== "all" || blockFilter !== "all" || showDuplicatesOnly || searchQuery) 
                      ? `of ${totalPiles} total piles`
                      : projectData?.total_project_piles && totalPiles < projectData.total_project_piles
                        ? `${projectData.total_project_piles - totalPiles} remaining to add`
                        : `${totalPiles} piles in database`}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Accepted Piles
                  {(statusFilter !== "all" || blockFilter !== "all" || showDuplicatesOnly || searchQuery) && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">(Filtered)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold">{acceptedPiles}</div>
                  <div className="ml-2 text-sm text-slate-500">
                    {filteredPiles.length > 0
                      ? `${Math.round((acceptedPiles / filteredPiles.length) * 100)}% accepted`
                      : "No piles in filter"}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Refusal Piles
                  {(statusFilter !== "all" || blockFilter !== "all" || showDuplicatesOnly || searchQuery) && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">(Filtered)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold">{refusalPiles}</div>
                  <div className="ml-2 text-sm text-slate-500">
                    {filteredPiles.length > 0
                      ? `${Math.round((refusalPiles / filteredPiles.length) * 100)}% refusal`
                      : "No refusal piles in filter"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* Search and quick filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    placeholder="Search piles..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {/* Primary filters */}
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] border-slate-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="refusal">Refusal</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={blockFilter} onValueChange={setBlockFilter}>
                    <SelectTrigger className="w-[140px] border-slate-200">
                      <SelectValue placeholder="Block" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Blocks</SelectItem>
                      {uniqueBlocks.map(block => (
                        <SelectItem key={block} value={block}>{block}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Date Range Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`border-slate-200 ${startDate || endDate ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate && endDate ? (
                          `${format(startDate, 'MM/dd/yyyy')} - ${format(endDate, 'MM/dd/yyyy')}`
                        ) : startDate ? (
                          `From ${format(startDate, 'MM/dd/yyyy')}`
                        ) : endDate ? (
                          `Until ${format(endDate, 'MM/dd/yyyy')}`
                        ) : (
                          'Date Range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Start Date</label>
                              {startDate && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2" 
                                  onClick={() => setStartDate(null)}
                                >
                                  <X size={12} />
                                </Button>
                              )}
                            </div>
                            <ReactDatePicker
                              selected={startDate}
                              onChange={(date: Date | null) => setStartDate(date)}
                              selectsStart
                              startDate={startDate || undefined}
                              endDate={endDate || undefined}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                              placeholderText="Select start date"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">End Date</label>
                              {endDate && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2" 
                                  onClick={() => setEndDate(null)}
                                >
                                  <X size={12} />
                                </Button>
                              )}
                            </div>
                            <ReactDatePicker
                              selected={endDate}
                              onChange={(date: Date | null) => setEndDate(date)}
                              selectsEnd
                              startDate={startDate || undefined}
                              endDate={endDate || undefined}
                              minDate={startDate || undefined}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                              placeholderText="Select end date"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setStartDate(null);
                              setEndDate(null);
                            }}
                          >
                            Clear
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              // Close the popover by simulating a click outside
                              const event = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                              });
                              document.dispatchEvent(event);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showDuplicatesOnly}
                      onCheckedChange={setShowDuplicatesOnly}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <Label className="text-sm font-medium">Show Duplicates</Label>
                    {showDuplicatesOnly && duplicatePileIds.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDeleteDuplicatesDialogOpen(true)}
                        className="ml-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 border border-red-400/20"
                      >
                        <Trash2 size={14} className="mr-1" />
                        <span className="font-medium">Delete Duplicates</span>
                        <span className="ml-1 px-1.5 py-0.5 bg-red-400/20 rounded-full text-xs font-medium">
                          {duplicatePileIds.size}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Active filters display */}
              {(searchQuery || statusFilter !== "all" || blockFilter !== "all" || showDuplicatesOnly || startDate || endDate) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-500">Active filters:</span>
                  
                  {searchQuery && (
                    <div className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                      <span>Search: {searchQuery}</span>
                      <button onClick={() => setSearchQuery("")} className="hover:text-blue-900">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  {statusFilter !== "all" && (
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded">
                      <span>Status: {statusFilter}</span>
                      <button onClick={() => setStatusFilter("all")} className="hover:text-green-900">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  {blockFilter !== "all" && (
                    <div className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded">
                      <span>Block: {blockFilter}</span>
                      <button onClick={() => setBlockFilter("all")} className="hover:text-purple-900">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded">
                      <span>
                        Date: {startDate ? format(startDate, 'MM/dd/yyyy') : 'Any'} 
                        {' - '} 
                        {endDate ? format(endDate, 'MM/dd/yyyy') : 'Any'}
                      </span>
                      <button 
                        onClick={() => {
                          setStartDate(null);
                          setEndDate(null);
                        }} 
                        className="hover:text-indigo-900"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  {showDuplicatesOnly && (
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded">
                      <span>Duplicates only</span>
                      <button onClick={() => setShowDuplicatesOnly(false)} className="hover:text-amber-900">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setBlockFilter("all");
                      setShowDuplicatesOnly(false);
                      setStartDate(null);
                      setEndDate(null);
                    }}
                    className="ml-auto text-xs"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Piles table */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-300">Loading pile data...</p>
            </div>
          ) : filteredPiles.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center mb-4 text-slate-400">
                <Info size={48} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No piles found</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Start by adding your first pile to the project"
                }
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Upload CSV Data
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
              {/* Compact table without horizontal scrolling */}
              <div className="overflow-x-auto">
                <div className="min-w-full inline-block align-middle">
                  <div className="relative max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200 border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-8">
                            {canEdit && (
                              <Checkbox 
                                checked={filteredPiles
                                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                  .every(pile => selectedPiles.has(pile.id))}
                                onCheckedChange={toggleAllPilesSelection}
                                className="data-[state=checked]:bg-blue-600"
                              />
                            )}
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-20">ID</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16">Zone</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12">Block</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12 hidden md:table-cell">Mach</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16">Design</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16">Embed</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16 hidden lg:table-cell">Duration</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12 hidden xl:table-cell">Start Z</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12 hidden xl:table-cell">End Z</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12">Gain</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16 hidden lg:table-cell">Color</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-20">Date</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16 hidden md:table-cell">Start</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16 hidden lg:table-cell">Stop</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12">Notes</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-16">Status</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide w-12">Act</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800/90 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredPiles
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((pile) => (
                          <tr 
                            key={pile.id} 
                            className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-blue-900/30 cursor-pointer transition-all duration-200 ease-in-out hover:shadow-sm relative row-click-effect group"
                            onClick={() => openPileDetail(pile)}
                            style={{
                              transform: "translateZ(0)", // Force hardware acceleration for smoother animations
                            }}
                          >
                            <td className="px-2 py-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {canEdit && (
                                <Checkbox 
                                  checked={selectedPiles.has(pile.id)}
                                  onCheckedChange={() => togglePileSelection(pile.id)}
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              )}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                              <span className="group-hover:text-blue-600 transition-colors duration-200 block truncate max-w-[80px]" title={String(pile.pile_id || pile.pile_number)}>
                                {pile.pile_id && duplicatePileIds.has(pile.pile_id) && showDuplicatesOnly ? (
                                  <div className="flex items-center">
                                    <span 
                                      className="flex gap-1 items-center px-1 py-0.5 rounded border transition-all duration-300 hover:shadow-md relative group text-xs"
                                      style={{
                                        backgroundColor: duplicateColors[pile.pile_id]?.bg as string || 'rgba(251, 191, 36, 0.1)',
                                        borderColor: duplicateColors[pile.pile_id]?.border as string || 'rgba(251, 191, 36, 0.3)',
                                        color: duplicateColors[pile.pile_id]?.text as string || 'rgb(180, 83, 9)'
                                      }}
                                    >
                                      <AlertTriangle size={10} className="text-amber-700" />
                                      <span className="truncate">{pile.pile_id || pile.pile_number}</span>
                                    </span>
                                  </div>
                                ) : (
                                  pile.pile_id || pile.pile_number
                                )}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                              <span className="truncate block max-w-[60px]" title={pile.zone || "N/A"}>
                                {pile.zone || "N/A"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                              <span className="truncate block max-w-[48px]" title={pile.block || "N/A"}>
                                {pile.block || "N/A"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden md:table-cell">
                              <span className="truncate block max-w-[48px]" title={pile.machine || "N/A"}>
                                {pile.machine || "N/A"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                              <span className="truncate block max-w-[60px]" title={pile.design_embedment ? `${String(pile.design_embedment)} ft` : "N/A"}>
                                {pile.design_embedment ? `${pile.design_embedment}` : "N/A"}
                              </span>
                            </td>
                            <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${
                              pile.embedment && pile.design_embedment && 
                              Number(pile.embedment) < (Number(pile.design_embedment) - embedmentTolerance) 
                                ? 'relative' 
                                : 'text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300'
                            }`}>
                              {pile.embedment && pile.design_embedment && 
                               Number(pile.embedment) < (Number(pile.design_embedment) - embedmentTolerance) ? (
                                <div className="group">
                                  <div className="flex items-center gap-1 px-1 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded text-xs">
                                    <AlertTriangle size={10} className="text-orange-500" />
                                    <span className="truncate">{pile.embedment || "N/A"}</span>
                                  </div>
                                  <div className="absolute z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1 px-2 -mt-1 left-16 w-48">
                                    Embedment below tolerance ({embedmentTolerance}ft) of design value.
                                  </div>
                                </div>
                              ) : (
                                <span className="truncate block max-w-[60px]" title={pile.embedment ? String(pile.embedment) : "N/A"}>{pile.embedment || "N/A"}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden lg:table-cell">
                              <span className="truncate block max-w-[60px]" title={pile.duration || "N/A"}>{pile.duration || "N/A"}</span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden xl:table-cell">
                              <span className="truncate block max-w-[48px]" title={pile.start_z ? String(pile.start_z) : "N/A"}>{pile.start_z || "N/A"}</span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden xl:table-cell">
                              <span className="truncate block max-w-[48px]" title={pile.end_z ? String(pile.end_z) : "N/A"}>{pile.end_z || "N/A"}</span>
                            </td>
                            <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${Number(pile.gain_per_30_seconds) < gainThreshold ? 'relative' : ''}`}>
                              {Number(pile.gain_per_30_seconds) < gainThreshold ? (
                                <div className="group">
                                  <div className="flex items-center gap-1 px-1 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                                    <AlertTriangle size={10} className="text-red-500" />
                                    <span className="truncate">{pile.gain_per_30_seconds || "N/A"}</span>
                                  </div>
                                  <div className="absolute z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1 px-2 -mt-1 left-16 w-48">
                                    Low gain rate (less than {gainThreshold}). May indicate driving issues.
                                  </div>
                                </div>
                              ) : (
                                <span className="truncate block max-w-[48px]" title={pile.gain_per_30_seconds ? String(pile.gain_per_30_seconds) : "N/A"}>{pile.gain_per_30_seconds || "N/A"}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden lg:table-cell">
                              <span className="truncate block max-w-[60px]" title={pile.pile_color || "N/A"}>{pile.pile_color || "N/A"}</span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                              <span className="truncate block max-w-[80px]" title={pile.start_date ? formatDate(pile.start_date) : "N/A"}>
                                {pile.start_date ? formatDate(pile.start_date) : "N/A"}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden md:table-cell">
                              <span className="truncate block max-w-[60px]" title={formatTimeToStandard(pile.start_time)}>
                                {formatTimeToStandard(pile.start_time)}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 hidden lg:table-cell">
                              <span className="truncate block max-w-[60px]" title={formatTimeToStandard(pile.stop_time)}>
                                {formatTimeToStandard(pile.stop_time)}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                              {pile.notes && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-5 px-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 transition-all duration-200 hover:shadow-sm flex items-center gap-1"
                                  onClick={(e) => openNotesModal(pile, e)}
                                >
                                  <FileText size={10} className="text-blue-600" />
                                </Button>
                              )}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                getPileStatus(pile) === 'accepted' ? 'bg-green-100 text-green-800' :
                                getPileStatus(pile) === 'refusal' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {getPileStatus(pile) === 'accepted' && <Check size={8} />}
                                {getPileStatus(pile) === 'refusal' && <AlertTriangle size={8} />}
                                {getPileStatus(pile) === 'pending' && <Clock size={8} />}
                                <span className="hidden sm:inline">
                                  {getPileStatus(pile) === 'accepted' && 'OK'}
                                  {getPileStatus(pile) === 'refusal' && 'REF'}
                                  {getPileStatus(pile) === 'pending' && 'PEN'}
                                </span>
                              </span>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-700 hover:text-blue-700 h-6 w-6 p-0 flex items-center justify-center"
                                onClick={(e) => openActionsModal(pile, e)}
                                disabled={!canEdit}
                              >
                                <MoreHorizontal size={12} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Pagination */}
              <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-base text-slate-600 dark:text-slate-300">
                  Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredPiles.length)}</span> to{" "}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredPiles.length)}</span> of{" "}
                  <span className="font-medium">{filteredPiles.length}</span> piles
                </p>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(filteredPiles.length / itemsPerPage)) }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrentPage = pageNum === currentPage;
                      
                      return (
                        <Button 
                          key={pageNum}
                          variant={isCurrentPage ? "default" : "outline"}
                          size="sm"
                          className={`w-9 h-9 p-0 ${isCurrentPage ? 'pointer-events-none' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    {Math.ceil(filteredPiles.length / itemsPerPage) > 5 && (
                      <>
                        <span className="text-slate-500">...</span>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="w-9 h-9 p-0"
                          onClick={() => setCurrentPage(Math.ceil(filteredPiles.length / itemsPerPage))}
                        >
                          {Math.ceil(filteredPiles.length / itemsPerPage)}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredPiles.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(filteredPiles.length / itemsPerPage) || filteredPiles.length <= itemsPerPage}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* CSV Upload Modal */}
      {projectData && (
        <CSVUploadModal 
          isOpen={isUploadModalOpen}
          onClose={handleCSVUploadComplete}
          projectId={projectData.id}
        />
      )}

      {/* Pile Detail Dialog */}
      <Dialog open={isPileDetailOpen} onOpenChange={setIsPileDetailOpen}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden bg-white dark:bg-slate-800 rounded-xl shadow-xl border-none max-h-[90vh]">
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-6 py-4 transition-all duration-200">
            <DialogHeader className="mb-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center max-w-[70%] overflow-hidden">
                  <span className="text-blue-600 dark:text-blue-400 mr-2 shrink-0">#</span>
                  <span className="truncate">{selectedPile?.pile_id || selectedPile?.pile_number}</span>
                </DialogTitle>
                {selectedPile?.pile_id && duplicatePileIds.has(selectedPile.pile_id) && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 transition-all duration-200 hover:shadow-sm flex items-center gap-1.5"
                        >
                          <AlertTriangle size={14} className="text-amber-500" />
                          Duplicate Pile ID
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[800px] p-0" 
                        side="left" 
                        align="center" 
                        sideOffset={8}
                        alignOffset={-8}
                      >
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" />
                            Duplicate Piles Comparison
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Showing all piles with ID: {selectedPile.pile_id}
                          </p>
                        </div>
                        <div className="p-4">
                          <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Pile #</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Embedment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Gain/30s</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Start Time</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {piles
                                .filter(pile => pile.pile_id === selectedPile.pile_id)
                                .map((pile) => (
                                  <tr 
                                    key={pile.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                      pile.id === selectedPile.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                  >
                                    <td className="px-4 py-3 text-sm">
                                      {pile.pile_number || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {formatDate(pile.start_date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {pile.embedment || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {pile.gain_per_30_seconds || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {formatTimeToStandard(pile.start_time)}
                                    </td>
                                    <td className="px-4 py-3">
                                      {getStatusBadge(getPileStatus(pile))}
                                    </td>
                                    <td className="px-4 py-3">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPileToDelete(pile);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                                      >
                                        <Trash2 size={14} />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {piles.filter(pile => pile.pile_id === selectedPile.pile_id).length} duplicate piles found
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
                {selectedPile ? (
                  selectedPile.pile_status ? (
                    // Display manual status with edit button if not in edit mode
                    !isEditingStatus ? (
                      <div className="flex items-center gap-2">
                        {selectedPile.pile_status === 'accepted' ? (
                          <span className="flex items-center text-green-600 dark:text-green-400 gap-1.5 font-medium">
                            <CheckCircle2 size={14} />
                            Accepted
                          </span>
                        ) : selectedPile.pile_status === 'refusal' ? (
                          <span className="flex items-center text-red-600 dark:text-red-400 gap-1.5 font-medium">
                            <X size={14} />
                            Refusal
                          </span>
                        ) : (
                          <span className="flex items-center text-slate-600 dark:text-slate-300 gap-1.5 font-medium">
                            <Clock size={14} />
                            Pending
                          </span>
                        )}
                        {canEdit && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => setIsEditingStatus(true)}
                          >
                            <Pencil size={14} className="mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    ) : (
                      // Status edit mode
                      <div className="flex items-center gap-2">
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-32 h-8 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            <SelectItem value="accepted" className="text-green-600 dark:text-green-400 focus:text-white focus:bg-green-600 dark:focus:bg-green-700">Accepted</SelectItem>
                            <SelectItem value="refusal" className="text-red-600 dark:text-red-400 focus:text-white focus:bg-red-600 dark:focus:bg-red-700">Refusal</SelectItem>
                            <SelectItem value="pending" className="text-amber-600 dark:text-amber-400 focus:text-white focus:bg-amber-600 dark:focus:bg-amber-700">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-700 dark:text-blue-400"
                          onClick={handleStatusUpdate}
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                          onClick={() => setIsEditingStatus(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )
                  ) : (
                    // Show calculated status with edit button if not in edit mode
                    !isEditingStatus ? (
                      <div className="flex items-center gap-2">
                        {getPileStatus(selectedPile) === 'accepted' ? (
                          <span className="flex items-center text-green-600 dark:text-green-400 gap-1.5 font-medium">
                            <CheckCircle2 size={14} />
                            Accepted
                          </span>
                        ) : getPileStatus(selectedPile) === 'refusal' ? (
                          <span className="flex items-center text-red-600 dark:text-red-400 gap-1.5 font-medium">
                            <X size={14} />
                            Refusal
                          </span>
                        ) : (
                          <span className="flex items-center text-slate-600 dark:text-slate-300 gap-1.5 font-medium">
                            <Clock size={14} />
                            Pending
                          </span>
                        )}
                        {canEdit && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => setIsEditingStatus(true)}
                          >
                            <Pencil size={14} className="mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    ) : (
                      // Status edit mode
                      <div className="flex items-center gap-2">
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-32 h-8 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            <SelectItem value="accepted" className="text-green-600 dark:text-green-400 focus:text-white focus:bg-green-600 dark:focus:bg-green-700">Accepted</SelectItem>
                            <SelectItem value="refusal" className="text-red-600 dark:text-red-400 focus:text-white focus:bg-red-600 dark:focus:bg-red-700">Refusal</SelectItem>
                            <SelectItem value="pending" className="text-amber-600 dark:text-amber-400 focus:text-white focus:bg-amber-600 dark:focus:bg-amber-700">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-700 dark:text-blue-400"
                          onClick={handleStatusUpdate}
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                          onClick={() => setIsEditingStatus(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )
                  )
                ) : null}
              </div>
            </DialogHeader>
          </div>
          
          {selectedPile && (
            <div className="p-5 pt-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {/* Main content grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Primary details */}
                <div>
                  <div className="space-y-4">
                    {/* Drive Time Dial */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center">
                        Pile Duration Rating
                        <span className="inline-block ml-1.5 group relative cursor-help">
                          <Info size={14} className="text-slate-400 dark:text-slate-500" />
                          <div className="absolute z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1.5 px-2.5 -mt-1 left-6 w-48">
                            Optimal: ≤5 min<br />
                            Suboptimal: 5-10 min<br />
                            Bad: &gt;10 min
                          </div>
                        </span>
                      </h3>
                      
                      <div className="relative flex flex-col items-center">
                        <div 
                          className={`p-2 rounded-full transition-all duration-200 shadow-md ${
                            !selectedPile.duration ? 'border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50' :  // Gray for unknown
                            parseDuration(selectedPile.duration) <= 5 ? 'border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : // Green for optimal
                            parseDuration(selectedPile.duration) <= 10 ? 'border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20' : // Amber for suboptimal
                            'border-2 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20' // Red for bad
                          }`}
                        >
                          <CircularProgressbar
                            value={selectedPile.duration ? Math.min(parseDuration(selectedPile.duration) * 10, 100) : 0}
                            text={`${selectedPile.duration || "?"} min`}
                            className="w-28 h-28"
                            styles={{
                              path: {
                                stroke: `${
                                  !selectedPile.duration ? '#94a3b8' :  // Gray for unknown
                                  parseDuration(selectedPile.duration) <= 5 ? '#22c55e' : // Green for optimal
                                  parseDuration(selectedPile.duration) <= 10 ? '#f59e0b' : // Amber for suboptimal
                                  '#ef4444' // Red for bad
                                }`,
                                strokeLinecap: 'round',
                                transition: 'stroke-dashoffset 0.5s ease 0s',
                              },
                              trail: {
                                stroke: '#e2e8f0',
                                strokeLinecap: 'round',
                              },
                              text: {
                                fill: '#475569',
                                fontSize: '14px',
                                fontWeight: 'bold',
                              },
                            }}
                          />
                        </div>
                        <div className="mt-4 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            !selectedPile.duration ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600' :
                            parseDuration(selectedPile.duration) <= 5 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-400 dark:border-green-600' :
                            parseDuration(selectedPile.duration) <= 10 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-400 dark:border-amber-600' :
                            'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-400 dark:border-red-600'
                          }`}>
                            {!selectedPile.duration ? 'Unknown' :
                             parseDuration(selectedPile.duration) <= 5 ? 'Optimal' :
                             parseDuration(selectedPile.duration) <= 10 ? 'Suboptimal' :
                             'Bad'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Embedment Section */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Embedment Metrics</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                          <div className="text-xs text-slate-500 dark:text-slate-400">Design Embedment</div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.design_embedment ? `${selectedPile.design_embedment} ft` : "N/A"}</div>
                        </div>
                        
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                          <div className="text-xs text-slate-500 dark:text-slate-400">Actual Embedment</div>
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center">
                            {selectedPile.embedment ? `${selectedPile.embedment} ft` : "N/A"}
                            {selectedPile.embedment && selectedPile.design_embedment && 
                             Number(selectedPile.embedment) < Number(selectedPile.design_embedment) && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400 flex items-center" title="Below design">
                                <AlertTriangle size={14} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                          <div className="text-xs text-slate-500 dark:text-slate-400">Gain per 30 seconds</div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {selectedPile.gain_per_30_seconds ? `${selectedPile.gain_per_30_seconds} ft` : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right column - Additional details */}
                <div className="space-y-4">
                  {/* Location and identification */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Location & Identification</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Zone</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 break-words">{selectedPile.zone || "N/A"}</div>
                      </div>
                      
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Block</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 break-words">{selectedPile.block || "N/A"}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Machine</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.machine || "N/A"}</div>
                      </div>
                      
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Pile Color</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.pile_color || "N/A"}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Time information */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Time Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Start Date</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.start_date ? new Date(selectedPile.start_date).toLocaleDateString() : "N/A"}</div>
                      </div>
                      
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Duration</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.duration ? `${selectedPile.duration} min` : "N/A"}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Start Time</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.start_time || "N/A"}</div>
                      </div>
                      
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Stop Time</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.stop_time || "N/A"}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Z Measurements</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Start Z</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.start_z || "N/A"}</div>
                      </div>
                      
                      <div className="space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600">
                        <div className="text-xs text-slate-500 dark:text-slate-400">End Z</div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPile.end_z || "N/A"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-3 flex justify-between">
            {canEdit && (
              <Button variant="destructive" size="sm" onClick={handleDeletePile} className="transition-all duration-200">
                <Trash2 size={14} className="mr-1.5" />
                Delete Pile
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsPileDetailOpen(false)} className="px-4 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-600 ml-2">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl shadow-xl border-none overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <AlertCircle size={18} className="text-red-600 mr-2" />
              Delete Pile
            </DialogTitle>
            <div className="text-slate-500 text-sm">
              Are you sure you want to delete this pile? This action cannot be undone.
            </div>
          </DialogHeader>
          <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-100 text-red-800 transition-all duration-200 hover:bg-red-100">
            <h4 className="font-medium mb-1 flex items-center">
              <FileText size={14} className="mr-1.5" />
              Pile Information:
            </h4>
            <p>ID: {pileToDelete?.pile_id || pileToDelete?.pile_number}</p>
            {pileToDelete?.zone && <p>Zone: {pileToDelete.zone}</p>}
            {pileToDelete?.block && <p>Block: {pileToDelete.block}</p>}
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="transition-all duration-200 hover:bg-slate-100">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePile} className="transition-all duration-200">
              <Trash2 size={16} className="mr-2" />
              Delete Pile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Notes Dialog */}
      <Dialog open={isAddNotesDialogOpen} onOpenChange={setIsAddNotesDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-xl shadow-xl border-none overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <FileText size={18} className="text-blue-600 mr-2" />
              Add Notes
            </DialogTitle>
            <div className="text-slate-500 text-sm">
              Add notes for pile {pileToAddNotes?.pile_id || pileToAddNotes?.pile_number}
            </div>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="notes" className="text-sm font-medium flex items-center">
              <Pencil size={14} className="mr-1.5 text-slate-500" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter notes about this pile..."
              className="mt-1.5 transition-all duration-200 focus:border-blue-300"
              rows={5}
            />
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsAddNotesDialogOpen(false)} className="transition-all duration-200 hover:bg-slate-100">
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} className="transition-all duration-200">
              <Save size={16} className="mr-2" />
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Duplicates Dialog */}
      <Dialog open={isDeleteDuplicatesDialogOpen} onOpenChange={setIsDeleteDuplicatesDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl shadow-xl border-none overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <AlertCircle size={18} className="text-red-600 mr-2" />
              Delete Duplicate Piles
            </DialogTitle>
            <div className="text-slate-500 text-sm">
              This will delete all duplicate piles that have matching values (embedment, gain/30 seconds, start time) while keeping one record for each pile ID. This action cannot be undone.
            </div>
          </DialogHeader>
          <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-100 text-red-800 transition-all duration-200 hover:bg-red-100">
            <h4 className="font-medium mb-1 flex items-center">
              <AlertTriangle size={14} className="mr-1.5" />
              Warning:
            </h4>
            <p>This action will permanently delete all duplicate piles that have identical values. Make sure you have backed up any important data before proceeding.</p>
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDuplicatesDialogOpen(false)} className="transition-all duration-200 hover:bg-slate-100">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDuplicates} 
              className="transition-all duration-200"
              disabled={isDeletingDuplicates}
            >
              {isDeletingDuplicates ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete Duplicates
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Piles</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPiles.size} selected piles? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Actions Modal */}
      <Dialog open={isActionsModalOpen} onOpenChange={setIsActionsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pile Actions</DialogTitle>
            <DialogDescription>
              Actions for pile {selectedPileForActions?.pile_id || selectedPileForActions?.pile_number}
              {!canEdit && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  <p className="flex items-center gap-2">
                    <Info size={14} />
                    You have view-only access as an Owner's Representative
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (selectedPileForActions) {
                  openPileDetail(selectedPileForActions);
                  setIsActionsModalOpen(false);
                }
              }}
            >
              <Eye size={14} className="mr-2" />
              View Details
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedPileForActions) {
                      setPileToAddNotes(selectedPileForActions);
                      setNoteContent(selectedPileForActions.notes || "");
                      setIsAddNotesDialogOpen(true);
                      setIsActionsModalOpen(false);
                    }
                  }}
                >
                  <FileText size={14} className="mr-2" />
                  Add Notes
                </Button>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedPileForActions) {
                      setPileToDelete(selectedPileForActions);
                      setIsDeleteDialogOpen(true);
                      setIsActionsModalOpen(false);
                    }
                  }}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes View/Edit Modal */}
      <Dialog open={isNotesViewModalOpen} onOpenChange={setIsNotesViewModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pile Notes</DialogTitle>
            <DialogDescription>
              Notes for pile {selectedPileForNotes?.pile_id || selectedPileForNotes?.pile_number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isEditingNotes ? (
              <div className="space-y-4">
                <Textarea
                  value={editingNoteContent}
                  onChange={(e) => setEditingNoteContent(e.target.value)}
                  className="min-h-[150px]"
                  placeholder="Enter notes..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingNotes(false);
                      setEditingNoteContent(selectedPileForNotes?.notes || "");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleEditNotes}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedPileForNotes?.notes || "No notes available"}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit2 size={14} className="mr-2" />
                    Edit Notes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete All Confirmation Dialog */}
      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">Delete All Piles</DialogTitle>
            <DialogDescription className="pt-4">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-center text-slate-600 dark:text-slate-400">
                Are you absolutely sure you want to delete all piles? This action cannot be undone and will permanently remove all pile data from the database.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteAllDialogOpen(false)}
              disabled={isDeletingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllPiles}
              disabled={isDeletingAll}
              className="gap-2"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete All Piles
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 