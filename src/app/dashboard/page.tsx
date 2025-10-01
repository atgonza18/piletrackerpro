"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, List, BarChart3, Settings, User, Bell, FileText, MapPin, Box } from "lucide-react";
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
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { isOwner, canEdit, currentProjectId, currentProjectName } = useAccountType();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("John");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [totalPiles, setTotalPiles] = useState(0);
  const [pendingPiles, setPendingPiles] = useState(0);
  const [completedPilesPercent, setCompletedPilesPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1);

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
                const { data: stats, error: statsError } = await supabase
                  .rpc('get_pile_statistics', {
                    project_id_param: project.id,
                    tolerance_param: tolerance
                  })
                  .single();
                
                if (statsError) {
                  console.error('RPC function error:', statsError);
                  console.log('Using fallback method for statistics');
                  
                  // Simplified fallback - just get total count
                  const { count: totalCount, error: countError } = await supabase
                    .from('piles')
                    .select('*', { count: 'exact', head: true })
                    .eq('project_id', project.id);
                  
                  if (countError) {
                    console.error('Count query error:', countError);
                    setTotalPiles(0);
                    setPendingPiles(0);
                    setCompletedPilesPercent(0);
                  } else {
                    console.log('Total piles count:', totalCount);
                    setTotalPiles(totalCount || 0);
                    
                    // For embedment issues in fallback, we'll need to fetch minimal data
                    // Only get embedment fields, not entire records
                    const { data: embedmentData, error: embedError } = await supabase
                      .from('piles')
                      .select('embedment, design_embedment')
                      .eq('project_id', project.id)
                      .not('embedment', 'is', null)
                      .not('design_embedment', 'is', null);
                    
                    if (embedError) {
                      console.error('Embedment query error:', embedError);
                      setPendingPiles(0);
                    } else if (embedmentData) {
                      // Calculate refusals in JavaScript
                      const refusals = embedmentData.filter((pile: any) => {
                        const emb = parseFloat(pile.embedment);
                        const design = parseFloat(pile.design_embedment);
                        return !isNaN(emb) && !isNaN(design) && emb < (design - tolerance);
                      }).length;
                      
                      console.log('Calculated refusals:', refusals);
                      setPendingPiles(refusals);
                    }
                    
                    const completionPercent = project.total_project_piles > 0 
                      ? Math.round(((totalCount || 0) / project.total_project_piles) * 100) 
                      : 0;
                    setCompletedPilesPercent(completionPercent);
                  }
                } else if (stats) {
                  // RPC function succeeded
                  console.log('RPC stats received:', stats);
                  setTotalPiles(stats.total_piles || 0);
                  setPendingPiles(stats.refusal_piles || 0);
                  
                  const completionPercent = project.total_project_piles > 0 
                    ? Math.round((stats.total_piles / project.total_project_piles) * 100) 
                    : 0;
                  setCompletedPilesPercent(completionPercent);
                }
              } catch (err) {
                console.error('Unexpected error loading statistics:', err);
                setTotalPiles(0);
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
      
      // Try to use RPC function for efficient aggregation
      const { data: stats, error: statsError } = await supabase
        .rpc('get_pile_statistics', {
          project_id_param: projectData.id,
          tolerance_param: tolerance
        })
        .single();
      
      if (statsError) {
        console.error('RPC error on refresh:', statsError);
        console.log('Using fallback method for refresh');
        
        // Simplified fallback
        const { count: totalCount, error: countError } = await supabase
          .from('piles')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectData.id);
        
        if (countError) {
          console.error('Count error on refresh:', countError);
          return;
        }
        
        setTotalPiles(totalCount || 0);
        
        // Get minimal embedment data for calculations
        const { data: embedmentData, error: embedError } = await supabase
          .from('piles')
          .select('embedment, design_embedment')
          .eq('project_id', projectData.id)
          .not('embedment', 'is', null)
          .not('design_embedment', 'is', null);
        
        if (embedError) {
          console.error('Embedment query error on refresh:', embedError);
          setPendingPiles(0);
        } else if (embedmentData) {
          const refusals = embedmentData.filter((pile: any) => {
            const emb = parseFloat(pile.embedment);
            const design = parseFloat(pile.design_embedment);
            return !isNaN(emb) && !isNaN(design) && emb < (design - tolerance);
          }).length;
          
          setPendingPiles(refusals);
        }
        
        const completionPercent = projectData.total_project_piles > 0 
          ? Math.round(((totalCount || 0) / projectData.total_project_piles) * 100) 
          : 0;
        setCompletedPilesPercent(completionPercent);
      } else if (stats) {
        // RPC succeeded
        console.log('Refresh stats received:', stats);
        setTotalPiles(stats.total_piles || 0);
        setPendingPiles(stats.refusal_piles || 0);
        
        const completionPercent = projectData.total_project_piles > 0 
          ? Math.round((stats.total_piles / projectData.total_project_piles) * 100) 
          : 0;
        setCompletedPilesPercent(completionPercent);
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
              { name: 'Pile Types', icon: MapPin, href: '/zones', active: false },
              { name: 'Blocks', icon: Box, href: '/blocks', active: false },
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
                  {statsLoading ? (
                    <>
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{totalPiles} / {projectData?.total_project_piles || "..."}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {completedPilesPercent}% of planned piles
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-1 p-3">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Embedment Issues</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {statsLoading ? (
                    <>
                      <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1"></div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-amber-500">{pendingPiles}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Piles with shallow embedment
                      </p>
                    </>
                  )}
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