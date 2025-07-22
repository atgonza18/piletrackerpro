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
  const { isOwner, currentProjectId, currentProjectName } = useAccountType();
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

  if (!user) {
    return null; // Don't render anything if user isn't logged in
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - Hidden on mobile */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col z-10">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs">
              PT
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {projectData?.project_name || "PileTrackerPro"}
            </h1>
          </div>
        </div>
        
        <nav className="p-3 flex-1">
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
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={16} />
                {item.name}
              </button>
            ))}
          </div>
          
          <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
            {[
              { name: 'Settings', icon: Settings, href: '/settings', active: false },
              { name: 'Account', icon: User, href: '/settings', active: false },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => item.href && handleNavigation(item.href)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <item.icon size={16} />
                {item.name}
              </button>
            ))}
            
            {/* Dark mode toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Theme</span>
              <ThemeToggle />
            </div>
          </div>
          
          <div className="mt-auto pt-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs">
              PT
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {projectData?.project_name || "PileTrackerPro"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => handleNavigation('/notifications')}
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full overflow-hidden border-slate-200 dark:border-slate-700 h-8 w-8 p-0"
              onClick={() => handleNavigation('/settings')}
            >
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 h-full w-full flex items-center justify-center text-xs font-medium">
                {userInitials}
              </div>
            </Button>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="p-4 md:p-5 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back, {userName}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Here&apos;s an overview of your pile tracking project</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hidden md:flex items-center gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                  {notifications > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {notifications}
                    </span>
                  )}
                </Button>
                <Button 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  onClick={() => handleNavigation('/my-piles')}
                >
                  <List className="h-4 w-4" />
                  View Piles
                </Button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Project Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{projectData?.project_name || "Loading..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{projectData?.project_location || ""}</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Piles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{totalPiles} / {projectData?.total_project_piles || "..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {completedPilesPercent}% of planned piles
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Embedment Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-amber-500">{pendingPiles}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Piles with shallow embedment
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">Geotechnical Company</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{projectData?.geotech_company || "Loading..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {projectData?.role || ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Content panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                    <CardDescription className="text-sm">Latest updates to your piles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* This would be replaced with actual activity data */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                        <div className="text-slate-900 dark:text-white font-medium text-sm">No recent activity</div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                          When you make changes to your piles, they&apos;ll appear here.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                    <CardDescription className="text-sm">Common tasks you can perform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        onClick={() => handleNavigation('/my-piles')}
                      >
                        <List className="mr-2 h-4 w-4" />
                        View All Piles
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        onClick={() => handleNavigation('/settings')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Project Settings
                      </Button>
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