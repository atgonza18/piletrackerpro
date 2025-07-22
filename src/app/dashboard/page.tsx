"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, List, BarChart3, Settings, User, Bell, FileText, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAccountType } from "@/context/AccountTypeContext";

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
  const { user, signOut } = useAuth();
  const { isOwner, canEdit, currentProjectId, currentProjectName } = useAccountType();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("John");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [totalPiles, setTotalPiles] = useState(0);
  const [pendingPiles, setPendingPiles] = useState(0);
  const [completedPilesPercent, setCompletedPilesPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);

  useEffect(() => {
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

              // Load piles data using the same robust approach as my-piles page
              
              // First get the count
              const { count, error: countError } = await supabase
                .from('piles')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', project.id);

              if (countError) {
                console.error("Error fetching piles count:", countError);
                toast.error("Failed to load pile statistics");
              } else {
                const totalCount = count || 0;
                
                // Set total count immediately from count query
                setTotalPiles(totalCount);
                
                // Now fetch all the data using pagination (same as my-piles page)
                let allPilesData: any[] = [];
                const pageSize = 1000;
                let page = 0;
                let hasMoreData = true;
                
                // Fetch data in chunks to handle large datasets
                while (hasMoreData) {
                  const from = page * pageSize;
                  const to = from + pageSize - 1;
                  
                  const { data: paginatedData, error } = await supabase
                    .from('piles')
                    .select('*')
                    .eq('project_id', project.id)
                    .range(from, to);
                  
                  if (error) {
                    console.error("Error fetching dashboard page", page, error);
                    throw error;
                  }
                  
                  if (paginatedData && paginatedData.length > 0) {
                    allPilesData = [...allPilesData, ...paginatedData];
                    page++;
                    
                    // If we got fewer records than the page size, we've fetched all data
                    if (paginatedData.length < pageSize) {
                      hasMoreData = false;
                    }
                    
                    // Safety check - if we've fetched all records according to count
                    if (allPilesData.length >= totalCount) {
                      hasMoreData = false;
                    }
                  } else {
                    // No more data
                    hasMoreData = false;
                  }
                }
                
                if (allPilesData.length > 0) {

                  // Use the same logic as my-piles page to calculate statistics
                  const tolerance = project.embedment_tolerance || 1;
                  
                  // Function to determine pile status (same as my-piles page)
                  const getPileStatus = (pile: any) => {
                    if (!pile.embedment || !pile.design_embedment) return 'pending';
                    
                    if (Number(pile.embedment) >= Number(pile.design_embedment)) {
                      return 'accepted';
                    } else if (Number(pile.embedment) < (Number(pile.design_embedment) - tolerance)) {
                      return 'refusal';
                    } else {
                      return 'accepted'; // Within tolerance
                    }
                  };

                  // Calculate status counts using the same method as my-piles page
                  const refusals = allPilesData.filter((pile: any) => 
                    getPileStatus(pile) === 'refusal'
                  ).length;

                  // Set embedment issues to refusal count (piles with shallow embedment)
                  setPendingPiles(refusals);
                  
                  // Statistics calculated using same logic as my-piles page
                  
                  // Calculate completion percentage based on actual piles vs planned piles
                  const completionPercent = project.total_project_piles > 0 
                    ? Math.round((allPilesData.length / project.total_project_piles) * 100) 
                    : 0;
                  setCompletedPilesPercent(completionPercent);
                } else {
                  // No piles data found, set to 0
                  setTotalPiles(totalCount);
                  setPendingPiles(0);
                  setCompletedPilesPercent(0);
                }
              }
            }
          }

          // Extract user data for display
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
          console.error("Error loading project data:", error);
          toast.error("Failed to load project data");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [user, router]);

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
      // Use the same robust data fetching approach as my-piles page
      
      // First get the count
      const { count, error: countError } = await supabase
        .from('piles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectData.id);

      if (countError) {
        console.error("Error fetching piles count:", countError);
        toast.error("Failed to load pile statistics");
        return;
      }

      const totalCount = count || 0;
      
      // Set total count immediately from count query
      setTotalPiles(totalCount);
      
      // Now fetch all the data using pagination
      let allPilesData: any[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMoreData = true;
      
      // Fetch data in chunks to handle large datasets
      while (hasMoreData) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data: paginatedData, error } = await supabase
          .from('piles')
          .select('*')
          .eq('project_id', projectData.id)
          .range(from, to);
        
        if (error) {
          console.error("Error fetching dashboard refresh page", page, error);
          throw error;
        }
        
        if (paginatedData && paginatedData.length > 0) {
          allPilesData = [...allPilesData, ...paginatedData];
          page++;
          
          // If we got fewer records than the page size, we've fetched all data
          if (paginatedData.length < pageSize) {
            hasMoreData = false;
          }
          
          // Safety check - if we've fetched all records according to count
          if (allPilesData.length >= totalCount) {
            hasMoreData = false;
          }
        } else {
          // No more data
          hasMoreData = false;
        }
      }
      
      if (allPilesData.length > 0) {
        // Use the same logic as my-piles page to calculate statistics
        const tolerance = embedmentTolerance;
        
        // Function to determine pile status (same as my-piles page)
        const getPileStatus = (pile: any) => {
          if (!pile.embedment || !pile.design_embedment) return 'pending';
          
          if (Number(pile.embedment) >= Number(pile.design_embedment)) {
            return 'accepted';
          } else if (Number(pile.embedment) < (Number(pile.design_embedment) - tolerance)) {
            return 'refusal';
          } else {
            return 'accepted'; // Within tolerance
          }
        };

        // Calculate status counts using the same method as my-piles page
        const refusals = allPilesData.filter((pile: any) => 
          getPileStatus(pile) === 'refusal'
        ).length;

        // Set embedment issues to refusal count (piles with shallow embedment)
        setPendingPiles(refusals);
        
        // Calculate completion percentage based on actual piles vs planned piles
        const completionPercent = projectData.total_project_piles > 0 
          ? Math.round((allPilesData.length / projectData.total_project_piles) * 100) 
          : 0;
        setCompletedPilesPercent(completionPercent);
      } else {
        // No piles data found, set to 0
        setTotalPiles(totalCount);
        setPendingPiles(0);
        setCompletedPilesPercent(0);
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
      {/* Sidebar - Hidden on mobile */}
      <div className="fixed inset-y-0 left-0 w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col z-10">
        <div className="p-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs">
              PT
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {projectData?.project_name || "PileTrackerPro"}
            </h1>
          </div>
        </div>
        
        <nav className="p-2 flex-1">
          <div className="space-y-1">
            {[
              { name: 'Dashboard', icon: BarChart3, href: '/dashboard', active: true },
              { name: 'My Piles', icon: List, href: '/my-piles', active: false },
              { name: 'Zones', icon: MapPin, href: '/zones', active: false },
              { name: 'Notes', icon: FileText, href: '/notes', active: false },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => item.href && handleNavigation(item.href)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={14} />
                {item.name}
              </button>
            ))}
          </div>
          
          <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
            {canEdit && [
              { name: 'Settings', icon: Settings, href: '/settings', active: false },
              { name: 'Account', icon: User, href: '/settings', active: false },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => item.href && handleNavigation(item.href)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={14} />
                {item.name}
              </button>
            ))}
            
            {/* Dark mode toggle */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-slate-600 dark:text-slate-300">Theme</span>
              <ThemeToggle />
            </div>
          </div>
          
          <div className="mt-auto pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-56 h-full w-full">
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
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Project Name</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{projectData?.project_name || "Loading..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{projectData?.project_location || ""}</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Piles</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{totalPiles} / {projectData?.total_project_piles || "..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {completedPilesPercent}% of planned piles
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Embedment Issues</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-sm font-bold text-amber-500">{pendingPiles}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Piles with shallow embedment
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Geotechnical Company</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{projectData?.geotech_company || "Loading..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {projectData?.role || ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Content panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                    <CardDescription className="text-xs">Latest updates to your piles</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                        <div className="text-slate-900 dark:text-white font-medium text-xs">No recent activity</div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                          When you make changes to your piles, they&apos;ll appear here.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
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
          </div>
        </main>
      </div>
    </div>
  );
} 