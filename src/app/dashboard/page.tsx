"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { List, Settings, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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
  const [userName, setUserName] = useState("John");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [totalPiles] = useState(0);
  const [pendingPiles] = useState(0);
  const [completedPilesPercent] = useState(0);

  useEffect(() => {
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
            }
          }

          const metadata = user.user_metadata;
          const firstName = metadata?.first_name || "";
          
          setUserName(firstName || user.email?.split("@")[0] || "User");
        } catch (error) {
          console.error("Error loading project data:", error);
          toast.error("Failed to load project data");
        }
      }
    };
    
    loadData();
  }, [user, router]);

  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="lg:pl-72">
        <main className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, {userName}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Here is an overview of your pile tracking project</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="hidden md:flex items-center gap-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                  {notifications > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium">
                      {notifications}
                    </span>
                  )}
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                  onClick={() => handleNavigation('/my-piles')}
                >
                  <List className="h-4 w-4" />
                  View Piles
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Project Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{projectData?.project_name || "Loading..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{projectData?.project_location || ""}</p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Piles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalPiles} / {projectData?.total_project_piles || "..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {completedPilesPercent}% of planned piles
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Embedment Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{pendingPiles}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Piles with shallow embedment
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Geotechnical Company</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{projectData?.geotech_company || "Loading..."}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {projectData?.role || ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest updates to your piles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                        <div className="text-slate-900 dark:text-white font-medium">No recent activity</div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                          When you make changes to your piles, they will appear here.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks you can perform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        onClick={() => handleNavigation('/my-piles')}
                      >
                        <List className="mr-2 h-4 w-4" />
                        View All Piles
                      </Button>

                      <Button
                        variant="outline"
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