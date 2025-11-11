"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, List, BarChart3, Settings, User, Bell, FileText, MapPin, Box, TrendingUp, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAccountType } from "@/context/AccountTypeContext";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";

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

export default function DashboardPage() {
  const router = useRouter();
  const [notifications] = useState(3);
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { isOwner, canEdit, currentProjectId, currentProjectName } = useAccountType();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("John");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [totalPiles, setTotalPiles] = useState(0);
  const [pendingPiles, setPendingPiles] = useState(0);
  const [acceptedPiles, setAcceptedPiles] = useState(0);
  const [refusalPiles, setRefusalPiles] = useState(0);
  const [completedPilesPercent, setCompletedPilesPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);
  const [blockData, setBlockData] = useState<any[]>([]);
  const [weeklyTimelineData, setWeeklyTimelineData] = useState<any[]>([]);
  const [monthlyTimelineData, setMonthlyTimelineData] = useState<any[]>([]);
  const [timelineView, setTimelineView] = useState<'weekly' | 'monthly'>('weekly');

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

    // Load user info immediately (don't wait for pile data)
    if (user) {
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

    // Load project data
    const loadData = async () => {
      if (user) {
        console.log('Starting data load...');
        setStatsLoading(true);
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

              // Optimized pile statistics loading using SQL aggregation
              const tolerance = project.embedment_tolerance || 1;

              // Use Supabase RPC function for efficient aggregation
              console.log('Loading pile statistics for project:', project.id);

              try {
                // First get total count of piles
                const { count: totalCount } = await supabase
                  .from('piles')
                  .select('*', { count: 'exact', head: true })
                  .eq('project_id', project.id);

                console.log(`Total piles in database: ${totalCount}`);

                // Fetch all pile data for detailed charts with pagination
                const pageSize = 1000;
                const totalPages = Math.ceil((totalCount || 0) / pageSize);
                console.log(`Loading ${totalCount} piles in ${totalPages} parallel requests`);

                // Create array of page numbers
                const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

                console.log('Fetching pages in parallel...');
                // Fetch all pages in parallel
                const pagePromises = pageNumbers.map(async (pageNum) => {
                  const from = pageNum * pageSize;
                  const to = from + pageSize - 1;

                  const { data, error } = await supabase
                    .from('piles')
                    .select('embedment, design_embedment, block, pile_type, start_date, created_at')
                    .eq('project_id', project.id)
                    .range(from, to);

                  if (error) {
                    console.error(`Error fetching page ${pageNum + 1}:`, error);
                    return [];
                  }

                  return data || [];
                });

                const allPagesData = await Promise.all(pagePromises);
                const allPiles = allPagesData.flat();

                console.log(`Successfully loaded ${allPiles.length} of ${totalCount} piles`);

                if (allPiles.length > 0) {
                  // Calculate pile status distribution
                  let accepted = 0;
                  let refusals = 0;
                  let pending = 0;

                  allPiles.forEach((pile: any) => {
                    if (!pile.embedment || !pile.design_embedment) {
                      pending++;
                    } else {
                      const emb = parseFloat(pile.embedment);
                      const design = parseFloat(pile.design_embedment);

                      if (!isNaN(emb) && !isNaN(design)) {
                        if (emb >= design) {
                          accepted++;
                        } else if (emb < (design - tolerance)) {
                          refusals++;
                        } else {
                          accepted++; // Within tolerance
                        }
                      } else {
                        pending++;
                      }
                    }
                  });

                  setTotalPiles(allPiles.length);
                  setAcceptedPiles(accepted);
                  setRefusalPiles(refusals);
                  setPendingPiles(pending);

                  const completionPercent = project.total_project_piles > 0
                    ? Math.round((allPiles.length / project.total_project_piles) * 100)
                    : 0;
                  setCompletedPilesPercent(completionPercent);

                  // Calculate block-wise statistics
                  const blockStats: { [key: string]: { total: number; accepted: number; refusals: number; pending: number } } = {};

                  allPiles.forEach((pile: any) => {
                    const block = pile.block || 'Uncategorized';
                    if (!blockStats[block]) {
                      blockStats[block] = { total: 0, accepted: 0, refusals: 0, pending: 0 };
                    }
                    blockStats[block].total++;

                    if (!pile.embedment || !pile.design_embedment) {
                      blockStats[block].pending++;
                    } else {
                      const emb = parseFloat(pile.embedment);
                      const design = parseFloat(pile.design_embedment);

                      if (!isNaN(emb) && !isNaN(design)) {
                        if (emb >= design) {
                          blockStats[block].accepted++;
                        } else if (emb < (design - tolerance)) {
                          blockStats[block].refusals++;
                        } else {
                          blockStats[block].accepted++; // Within tolerance
                        }
                      } else {
                        blockStats[block].pending++;
                      }
                    }
                  });

                  // Convert to array for chart with alphanumeric sorting
                  const blockChartData = Object.entries(blockStats)
                    .map(([name, stats]) => ({
                      name,
                      ...stats
                    }))
                    .sort((a, b) => {
                      // Natural sort for alphanumeric strings (e.g., A1, A2, A10, B1)
                      return a.name.localeCompare(b.name, undefined, {
                        numeric: true,
                        sensitivity: 'base'
                      });
                    });

                  setBlockData(blockChartData);

                  // Calculate timeline data (piles installed per week and month)
                  const weeklyStats: { [key: string]: number } = {};
                  const monthlyStats: { [key: string]: number } = {};

                  allPiles.forEach((pile: any) => {
                    const date = pile.start_date || pile.created_at;
                    if (date) {
                      const d = new Date(date);

                      // Weekly calculation
                      const weekStart = new Date(d);
                      weekStart.setDate(d.getDate() - d.getDay());
                      const weekKey = weekStart.toISOString().split('T')[0];
                      weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + 1;

                      // Monthly calculation
                      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
                    }
                  });

                  // Format weekly data
                  const weeklyChartData = Object.entries(weeklyStats)
                    .map(([date, count]) => ({
                      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      rawDate: date,
                      piles: count
                    }))
                    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
                    .slice(-12); // Last 12 weeks

                  // Format monthly data
                  const monthlyChartData = Object.entries(monthlyStats)
                    .map(([date, count]) => ({
                      date: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                      rawDate: date,
                      piles: count
                    }))
                    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
                    .slice(-12); // Last 12 months

                  // Store both weekly and monthly data
                  setWeeklyTimelineData(weeklyChartData);
                  setMonthlyTimelineData(monthlyChartData);
                }
              } catch (err) {
                console.error('Unexpected error loading statistics:', err);
                setTotalPiles(0);
                setAcceptedPiles(0);
                setRefusalPiles(0);
                setPendingPiles(0);
                setCompletedPilesPercent(0);
              } finally {
                // CRITICAL: Always set statsLoading to false after loading
                setStatsLoading(false);
              }
            }
          }

          // User data already loaded at the beginning
        } catch (error) {
          console.error("Error loading project data:", error);
          toast.error("Failed to load project data");
          setStatsLoading(false); // Ensure stats loading is set to false on error
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [user, router, authLoading]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const handleNavigation = (path: string) => {
    // Use Next.js router for client-side navigation
    router.push(path as any);
  };

  const refreshDashboardData = async () => {
    if (!user || !projectData) return;

    try {
      const tolerance = embedmentTolerance;
      console.log('Refreshing dashboard data for project:', projectData.id);

      // First get total count of piles
      const { count: totalCount } = await supabase
        .from('piles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectData.id);

      console.log(`Total piles in database: ${totalCount}`);

      // Fetch all pile data for detailed charts with pagination
      const pageSize = 1000;
      const totalPages = Math.ceil((totalCount || 0) / pageSize);
      console.log(`Loading ${totalCount} piles in ${totalPages} parallel requests`);

      // Create array of page numbers
      const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

      console.log('Fetching pages in parallel...');
      // Fetch all pages in parallel
      const pagePromises = pageNumbers.map(async (pageNum) => {
        const from = pageNum * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from('piles')
          .select('embedment, design_embedment, block, pile_type, start_date, created_at')
          .eq('project_id', projectData.id)
          .range(from, to);

        if (error) {
          console.error(`Error fetching page ${pageNum + 1}:`, error);
          return [];
        }

        return data || [];
      });

      const allPagesData = await Promise.all(pagePromises);
      const allPiles = allPagesData.flat();

      console.log(`Successfully loaded ${allPiles.length} of ${totalCount} piles for refresh`);

      if (allPiles.length > 0) {
        // Calculate pile status distribution
        let accepted = 0;
        let refusals = 0;
        let pending = 0;

        allPiles.forEach((pile: any) => {
          if (!pile.embedment || !pile.design_embedment) {
            pending++;
          } else {
            const emb = parseFloat(pile.embedment);
            const design = parseFloat(pile.design_embedment);

            if (!isNaN(emb) && !isNaN(design)) {
              if (emb >= design) {
                accepted++;
              } else if (emb < (design - tolerance)) {
                refusals++;
              } else {
                accepted++; // Within tolerance
              }
            } else {
              pending++;
            }
          }
        });

        setTotalPiles(allPiles.length);
        setAcceptedPiles(accepted);
        setRefusalPiles(refusals);
        setPendingPiles(pending);

        const completionPercent = projectData.total_project_piles > 0
          ? Math.round((allPiles.length / projectData.total_project_piles) * 100)
          : 0;
        setCompletedPilesPercent(completionPercent);

        // Calculate block-wise statistics
        const blockStats: { [key: string]: { total: number; accepted: number; refusals: number; pending: number } } = {};

        allPiles.forEach((pile: any) => {
          const block = pile.block || 'Uncategorized';
          if (!blockStats[block]) {
            blockStats[block] = { total: 0, accepted: 0, refusals: 0, pending: 0 };
          }
          blockStats[block].total++;

          if (!pile.embedment || !pile.design_embedment) {
            blockStats[block].pending++;
          } else {
            const emb = parseFloat(pile.embedment);
            const design = parseFloat(pile.design_embedment);

            if (!isNaN(emb) && !isNaN(design)) {
              if (emb >= design) {
                blockStats[block].accepted++;
              } else if (emb < (design - tolerance)) {
                blockStats[block].refusals++;
              } else {
                blockStats[block].accepted++; // Within tolerance
              }
            } else {
              blockStats[block].pending++;
            }
          }
        });

        // Convert to array for chart with alphanumeric sorting
        const blockChartData = Object.entries(blockStats)
          .map(([name, stats]) => ({
            name,
            ...stats
          }))
          .sort((a, b) => {
            // Natural sort for alphanumeric strings (e.g., A1, A2, A10, B1)
            return a.name.localeCompare(b.name, undefined, {
              numeric: true,
              sensitivity: 'base'
            });
          });

        setBlockData(blockChartData);

        // Calculate timeline data (piles installed per week and month)
        const weeklyStats: { [key: string]: number } = {};
        const monthlyStats: { [key: string]: number } = {};

        allPiles.forEach((pile: any) => {
          const date = pile.start_date || pile.created_at;
          if (date) {
            const d = new Date(date);

            // Weekly calculation
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + 1;

            // Monthly calculation
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
            monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
          }
        });

        // Format weekly data
        const weeklyChartData = Object.entries(weeklyStats)
          .map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            rawDate: date,
            piles: count
          }))
          .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
          .slice(-12); // Last 12 weeks

        // Format monthly data
        const monthlyChartData = Object.entries(monthlyStats)
          .map(([date, count]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            rawDate: date,
            piles: count
          }))
          .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
          .slice(-12); // Last 12 months

        // Store both weekly and monthly data
        setWeeklyTimelineData(weeklyChartData);
        setMonthlyTimelineData(monthlyChartData);
      }
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    }
  };

  // Refresh data when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && projectData) {
        refreshDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [projectData, user, embedmentTolerance]);

  if (!user) {
    return null; // Don't render anything if user isn't logged in
  }

  return (
    <div className="min-h-screen h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden w-full">
      {/* Collapsible Sidebar - Hidden on mobile */}
      <CollapsibleSidebar
        projectName={projectData?.project_name}
        currentPage="dashboard"
      />

      {/* Main content */}
      <div className="lg:pl-16 h-full w-full">
        {/* Mobile header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between lg:hidden w-full">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs">
              PT
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {projectData?.project_name || "PileTrackerPro"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="relative h-7 w-7 p-0"
              onClick={() => handleNavigation('/notifications')}
            >
              <Bell className="h-3 w-3" />
              {notifications > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Button>
{canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full overflow-hidden border-slate-200 dark:border-slate-700 h-7 w-7 p-0"
                onClick={() => handleNavigation('/settings')}
              >
                <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 h-full w-full flex items-center justify-center text-xs font-medium">
                  {userInitials}
                </div>
              </Button>
            )}
          </div>
        </header>

        {/* Dashboard content */}
        <main className="p-3 h-full max-h-[calc(100vh-60px)] lg:max-h-screen overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Welcome back, {userName}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">Here&apos;s an overview of your pile tracking project</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hidden md:flex items-center gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 h-7 text-xs"
                >
                  <Bell className="h-3 w-3" />
                  Notifications
                  {notifications > 0 && (
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {notifications}
                    </span>
                  )}
                </Button>
                <Button 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 h-7 text-xs"
                  onClick={() => handleNavigation('/my-piles')}
                >
                  <List className="h-3 w-3" />
                  View Piles
                </Button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Accepted Piles
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{acceptedPiles}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {totalPiles > 0 ? Math.round((acceptedPiles / totalPiles) * 100) : 0}% of total
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Refusal Piles
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-purple-500 dark:text-purple-400">{refusalPiles}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {totalPiles > 0 ? Math.round((refusalPiles / totalPiles) * 100) : 0}% of total
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    N/A Piles
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{pendingPiles}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {totalPiles > 0 ? Math.round((pendingPiles / totalPiles) * 100) : 0}% of total
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{completedPilesPercent}%</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {totalPiles} / {projectData?.total_project_piles || 0} piles
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
              {/* Pile Status Distribution - Pie Chart */}
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Pile Status Distribution</CardTitle>
                  <CardDescription className="text-xs">Breakdown by status</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : totalPiles > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Accepted', value: acceptedPiles, color: '#3b82f6' },
                            { name: 'Refusal', value: refusalPiles, color: '#a855f7' },
                            { name: 'N/A', value: pendingPiles, color: '#f59e0b' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[
                            { name: 'Accepted', value: acceptedPiles, color: '#3b82f6' },
                            { name: 'Refusal', value: refusalPiles, color: '#a855f7' },
                            { name: 'N/A', value: pendingPiles, color: '#f59e0b' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                      No pile data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Installation Timeline - Line Chart */}
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Installation Timeline</CardTitle>
                      <CardDescription className="text-xs">Piles installed over time</CardDescription>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                      <button
                        onClick={() => setTimelineView('weekly')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          timelineView === 'weekly'
                            ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setTimelineView('monthly')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          timelineView === 'monthly'
                            ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (timelineView === 'weekly' ? weeklyTimelineData : monthlyTimelineData).length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={timelineView === 'weekly' ? weeklyTimelineData : monthlyTimelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          stroke="#64748b"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '12px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="piles"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                      No timeline data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Block Statistics - Bar Chart */}
            <div className="grid grid-cols-1 gap-3">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Block Performance</CardTitle>
                  <CardDescription className="text-xs">All blocks by pile count and status</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : blockData.length > 0 ? (
                    <div
                      className="w-full overflow-x-auto overflow-y-hidden scrollbar-modern"
                      style={{ maxHeight: '500px' }}
                    >
                      <style jsx>{`
                        .scrollbar-modern::-webkit-scrollbar {
                          height: 8px;
                        }
                        .scrollbar-modern::-webkit-scrollbar-track {
                          background: transparent;
                        }
                        .scrollbar-modern::-webkit-scrollbar-thumb {
                          background: rgba(148, 163, 184, 0.3);
                          border-radius: 4px;
                        }
                        .scrollbar-modern::-webkit-scrollbar-thumb:hover {
                          background: rgba(148, 163, 184, 0.5);
                        }
                        .dark .scrollbar-modern::-webkit-scrollbar-thumb {
                          background: rgba(148, 163, 184, 0.2);
                        }
                        .dark .scrollbar-modern::-webkit-scrollbar-thumb:hover {
                          background: rgba(148, 163, 184, 0.4);
                        }
                        /* For Firefox */
                        .scrollbar-modern {
                          scrollbar-width: thin;
                          scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
                        }
                        .dark .scrollbar-modern {
                          scrollbar-color: rgba(148, 163, 184, 0.2) transparent;
                        }
                      `}</style>
                      <div style={{ minWidth: Math.max(1200, blockData.length * 60) }}>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={blockData} margin={{ bottom: 80, left: 20, right: 20, top: 20 }} barGap={4} barCategoryGap="10%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10 }}
                              stroke="#64748b"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={0}
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              stroke="#64748b"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '12px'
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: '11px' }}
                            />
                            <Bar dataKey="accepted" name="Accepted" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="refusals" name="Refusal" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="pending" name="N/A" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                      No block data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                  <CardDescription className="text-xs">Common tasks you can perform</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 h-7 text-xs"
                      onClick={() => handleNavigation('/my-piles')}
                    >
                      <List className="mr-1 h-3 w-3" />
                      View All Piles
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 h-7 text-xs"
                      onClick={() => handleNavigation('/blocks')}
                    >
                      <Box className="mr-1 h-3 w-3" />
                      View Blocks
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 h-7 text-xs"
                      onClick={() => handleNavigation('/zones')}
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      View Pile Types
                    </Button>

                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 h-7 text-xs"
                        onClick={() => handleNavigation('/settings')}
                      >
                        <Settings className="mr-1 h-3 w-3" />
                        Project Settings
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 