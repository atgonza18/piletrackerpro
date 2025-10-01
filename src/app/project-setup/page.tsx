"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function ProjectSetupPage() {
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [role, setRole] = useState("");
  const [totalProjectPiles, setTotalProjectPiles] = useState("");
  const [trackerSystem, setTrackerSystem] = useState("");
  const [geotechCompany, setGeotechCompany] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Redirect if not logged in or if project setup is already completed
  useEffect(() => {
    console.log('Project setup page loaded, user:', user);

    // Wait for auth to finish loading before making decisions
    if (authLoading) {
      return;
    }

    // Check if we have the flag indicating the user needs project setup
    const needsProjectSetup = typeof window !== 'undefined' ? localStorage.getItem('needs_project_setup') : null;
    console.log('Needs project setup flag:', needsProjectSetup);

    if (!user) {
      console.log('No user found, redirecting to auth page');
      // Only redirect if we don't have the flag
      if (!needsProjectSetup) {
        router.push("/auth");
      }
      return;
    }

    // Check if user has already completed project setup
    const checkProjectSetup = async () => {
      if (user) {
        console.log('Checking if user has already completed project setup...');
        const { data: userProject, error } = await supabase
          .from('user_projects')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking user projects:', error);
          return;
        }
        
        console.log('User project check result:', userProject);
        
        if (userProject) {
          // User already has a project, redirect to dashboard
          console.log('User already has a project, redirecting to dashboard');
          localStorage.removeItem('needs_project_setup');
          router.push("/dashboard");
        } else {
          console.log('User needs to complete project setup');
        }
      }
    };
    
    checkProjectSetup();
  }, [user, router, authLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset form errors
    setFormErrors({});
    
    // Validate form
    if (!projectName) {
      setFormErrors(prev => ({ ...prev, projectName: "Project name is required" }));
      return;
    }
    
    if (!projectLocation) {
      setFormErrors(prev => ({ ...prev, projectLocation: "Project location is required" }));
      return;
    }
    
    if (!role) {
      setFormErrors(prev => ({ ...prev, role: "Role is required" }));
      return;
    }
    
    if (!totalProjectPiles) {
      setFormErrors(prev => ({ ...prev, totalProjectPiles: "Total project piles is required" }));
      return;
    }
    
    if (!trackerSystem) {
      setFormErrors(prev => ({ ...prev, trackerSystem: "Tracker system is required" }));
      return;
    }
    
    if (!geotechCompany) {
      setFormErrors(prev => ({ ...prev, geotechCompany: "Geotech company is required" }));
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 1. Create the project first
      const { data: projectData, error: projectError } = await supabase.from('projects').insert({
        project_name: projectName,
        name: projectName, // For backward compatibility with existing code
        project_location: projectLocation,
        total_project_piles: parseInt(totalProjectPiles),
        tracker_system: trackerSystem,
        geotech_company: geotechCompany,
        role: role
      }).select().single();
      
      if (projectError) {
        console.error("Error creating project:", projectError.message);
        toast.error("Failed to create project. Please try again.");
        setIsLoading(false);
        return;
      }
      
      // 2. Associate the user with the project
      const { error: userProjectError } = await supabase.from('user_projects').insert({
        user_id: user?.id,
        project_id: projectData.id,
        role: role,
        is_owner: true
      });
      
      if (userProjectError) {
        console.error("Error associating user with project:", userProjectError.message);
        toast.error("Failed to complete project setup. Please try again.");
        
        // Try to delete the project if user association fails
        await supabase.from('projects').delete().eq('id', projectData.id);
        
        setIsLoading(false);
        return;
      }
      
      toast.success("Project setup completed successfully!");
      
      // Clear the needs_project_setup flag
      localStorage.removeItem('needs_project_setup');
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Unexpected error during project setup:", error);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-2xl font-bold text-slate-900">Project Setup</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your project information to set up your dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5 px-6">
            <div className="space-y-2.5">
              <Label htmlFor="projectName" className="text-sm font-medium text-slate-700">
                Project Name
              </Label>
              <Input 
                id="projectName" 
                placeholder="Enter project name"
                className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                  formErrors.projectName ? "border-red-500" : ""
                }`}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              {formErrors.projectName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.projectName}</p>
              )}
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="projectLocation" className="text-sm font-medium text-slate-700">
                Project Location
              </Label>
              <Input 
                id="projectLocation" 
                placeholder="Enter project location"
                className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                  formErrors.projectLocation ? "border-red-500" : ""
                }`}
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
              />
              {formErrors.projectLocation && (
                <p className="text-xs text-red-500 mt-1">{formErrors.projectLocation}</p>
              )}
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="role" className="text-sm font-medium text-slate-700">
                Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger 
                  id="role"
                  className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 ${
                    formErrors.role ? "border-red-500" : ""
                  }`}
                  style={{ color: role ? "#0f172a" : "#94a3b8" }}
                >
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="field_engineer">Field Engineer</SelectItem>
                  <SelectItem value="site_engineer">Site Engineer</SelectItem>
                  <SelectItem value="geotechnical_engineer">Geotechnical Engineer</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>
              )}
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="totalProjectPiles" className="text-sm font-medium text-slate-700">
                Total Project Piles
              </Label>
              <Input 
                id="totalProjectPiles" 
                type="number"
                min="1"
                placeholder="Enter total number of piles"
                className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                  formErrors.totalProjectPiles ? "border-red-500" : ""
                }`}
                value={totalProjectPiles}
                onChange={(e) => setTotalProjectPiles(e.target.value)}
              />
              {formErrors.totalProjectPiles && (
                <p className="text-xs text-red-500 mt-1">{formErrors.totalProjectPiles}</p>
              )}
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="trackerSystem" className="text-sm font-medium text-slate-700">
                Tracker System
              </Label>
              <Select value={trackerSystem} onValueChange={setTrackerSystem}>
                <SelectTrigger 
                  id="trackerSystem"
                  className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 ${
                    formErrors.trackerSystem ? "border-red-500" : ""
                  }`}
                  style={{ color: trackerSystem ? "#0f172a" : "#94a3b8" }}
                >
                  <SelectValue placeholder="Select tracker system" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                  <SelectItem value="manual">Manual Records</SelectItem>
                  <SelectItem value="software">Specialized Software</SelectItem>
                  <SelectItem value="none">None (New System)</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.trackerSystem && (
                <p className="text-xs text-red-500 mt-1">{formErrors.trackerSystem}</p>
              )}
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="geotechCompany" className="text-sm font-medium text-slate-700">
                Geotech Company
              </Label>
              <Input 
                id="geotechCompany" 
                placeholder="Enter geotech company name"
                className={`h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 ${
                  formErrors.geotechCompany ? "border-red-500" : ""
                }`}
                value={geotechCompany}
                onChange={(e) => setGeotechCompany(e.target.value)}
              />
              {formErrors.geotechCompany && (
                <p className="text-xs text-red-500 mt-1">{formErrors.geotechCompany}</p>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col px-6 pb-6">
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Continue to Dashboard <ArrowRight size={16} className="ml-2" />
                </div>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 