"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, Building2, MapPin, Settings2, Users, Database, AlertTriangle, Plus, Mail, UserPlus, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAccountType } from "@/context/AccountTypeContext";

interface ProjectSettings {
  id: string;
  project_name: string;
  project_location: string;
  total_project_piles: number;
  tracker_system: string;
  geotech_company: string;
  role: string;
  embedment_tolerance: number;
}

interface TeamMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function ProjectSettingsPage() {
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [role, setRole] = useState("");
  const [totalProjectPiles, setTotalProjectPiles] = useState("");
  const [trackerSystem, setTrackerSystem] = useState("");
  const [geotechCompany, setGeotechCompany] = useState("");
  const [embedmentTolerance, setEmbedmentTolerance] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [projectId, setProjectId] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();
  const { canEdit } = useAccountType();

  // Load project settings data
  useEffect(() => {
    const loadProjectSettings = async () => {
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        setIsLoading(true);

        // Get user's project
        const { data: userProjectData, error: userProjectError } = await supabase
          .from('user_projects')
          .select('project_id')
          .eq('user_id', user.id)
          .single();

        if (userProjectError) {
          console.error("Error fetching user project:", userProjectError);
          toast.error("Failed to load project settings");
          router.push("/dashboard");
          return;
        }

        if (!userProjectData) {
          router.push("/project-setup");
          return;
        }

        // Get project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', userProjectData.project_id)
          .single();

        if (projectError) {
          console.error("Error fetching project:", projectError);
          toast.error("Failed to load project settings");
          return;
        }

        setProjectId(projectData.id);
        setProjectName(projectData.project_name);
        setProjectLocation(projectData.project_location);
        setRole(projectData.role);
        setTotalProjectPiles(projectData.total_project_piles.toString());
        setTrackerSystem(projectData.tracker_system);
        setGeotechCompany(projectData.geotech_company);
        
        // Get embedment_tolerance if it exists, otherwise use default
        if (projectData.embedment_tolerance !== undefined && projectData.embedment_tolerance !== null) {
          setEmbedmentTolerance(projectData.embedment_tolerance.toString());
        }
      } catch (error) {
        console.error("Error loading project settings:", error);
        toast.error("Failed to load project settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectSettings();
  }, [user, router]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!projectName.trim()) {
      errors.projectName = "Project name is required";
    }

    if (!projectLocation.trim()) {
      errors.projectLocation = "Project location is required";
    }

    if (!role) {
      errors.role = "Role is required";
    }

    if (!totalProjectPiles) {
      errors.totalProjectPiles = "Total project piles is required";
    } else if (isNaN(Number(totalProjectPiles)) || Number(totalProjectPiles) <= 0) {
      errors.totalProjectPiles = "Total project piles must be a positive number";
    }

    if (!trackerSystem) {
      errors.trackerSystem = "Tracker system is required";
    }

    if (!geotechCompany.trim()) {
      errors.geotechCompany = "Geotech company is required";
    }

    if (!embedmentTolerance) {
      errors.embedmentTolerance = "Embedment tolerance is required";
    } else if (isNaN(Number(embedmentTolerance)) || Number(embedmentTolerance) <= 0) {
      errors.embedmentTolerance = "Embedment tolerance must be a positive number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user) {
      toast.error("You must be logged in to update project settings");
      return;
    }

    try {
      setIsLoading(true);

      // Check if user has permission to update
      const { data: userProjectData, error: userProjectError } = await supabase
        .from('user_projects')
        .select('is_owner')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      if (userProjectError) {
        console.error("Error checking user permissions:", userProjectError);
        toast.error("Failed to verify user permissions");
        return;
      }

      // Update project settings
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          project_name: projectName,
          project_location: projectLocation,
          role: role,
          total_project_piles: parseInt(totalProjectPiles),
          tracker_system: trackerSystem,
          geotech_company: geotechCompany,
          embedment_tolerance: parseFloat(embedmentTolerance)
        })
        .eq('id', projectId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating project settings:", updateError);
        toast.error("Failed to update project settings");
        return;
      }

      toast.success("Project settings updated successfully!");
    } catch (error) {
      console.error("Unexpected error during project settings update:", error);
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = () => {
    if (!validateForm()) {
      return;
    }

    // ... rest of the handleSubmit function logic ...
  };

  const loadTeamMembers = async () => {
    try {
      // First, check if the table exists
      const { error: tableCheckError } = await supabase
        .from('team_members')
        .select('count')
        .limit(1);

      if (tableCheckError?.code === '42P01') { // Table doesn't exist
        // Create the table
        const { error: createTableError } = await supabase.rpc('create_team_members_table');
        if (createTableError) {
          console.error('Error creating team_members table:', createTableError);
          toast.error('Failed to initialize team management');
          return;
        }
      }

      // Now load the team members
      const { data: members, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    }
  };

  const handleInviteUser = async () => {
    if (!newUserEmail || !newUserRole) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsInvitingUser(true);
    try {
      // First, check if user exists in auth
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const existingUser = users?.find(u => u.email === newUserEmail);
      
      if (!existingUser) {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: newUserEmail,
          email_confirm: true,
        });
        if (createError) throw createError;
      }

      // Add user to team members
      const { error: teamError } = await supabase
        .from('team_members')
        .insert([
          {
            project_id: projectId,
            email: newUserEmail,
            role: newUserRole,
          }
        ]);

      if (teamError) throw teamError;

      toast.success('User invited successfully');
      setNewUserEmail('');
      setNewUserRole('');
      loadTeamMembers();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to invite user');
    } finally {
      setIsInvitingUser(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadTeamMembers();
    }
  }, [projectId]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">Project Settings</h1>
          <p className="text-slate-500">
            {canEdit 
              ? "Manage your project configuration and preferences"
              : "View project configuration and preferences"}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <nav className="space-y-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-slate-700"
                    disabled={!canEdit}
                  >
                    <Building2 size={16} />
                    Project Information
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-slate-700"
                    disabled={!canEdit}
                  >
                    <MapPin size={16} />
                    Location Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-slate-700"
                    disabled={!canEdit}
                  >
                    <Settings2 size={16} />
                    Configuration
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-slate-700"
                    disabled={!canEdit}
                  >
                    <Users size={16} />
                    Team Members
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-slate-700"
                    disabled={!canEdit}
                  >
                    <Database size={16} />
                    Data Management
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Settings Forms */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="project-info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="project-info">Project Info</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="project-info">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Project Information</CardTitle>
                    <CardDescription>Basic details about your project</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="projectName">Project Name</Label>
                        <Input 
                          id="projectName" 
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className={formErrors.projectName ? "border-red-500" : ""}
                          disabled={!canEdit}
                        />
                        {formErrors.projectName && (
                          <p className="text-xs text-red-500">{formErrors.projectName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectLocation">Project Location</Label>
                        <Input 
                          id="projectLocation" 
                          value={projectLocation}
                          onChange={(e) => setProjectLocation(e.target.value)}
                          className={formErrors.projectLocation ? "border-red-500" : ""}
                          disabled={!canEdit}
                        />
                        {formErrors.projectLocation && (
                          <p className="text-xs text-red-500">{formErrors.projectLocation}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="role">Your Role</Label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="project_manager">Project Manager</SelectItem>
                            <SelectItem value="site_supervisor">Site Supervisor</SelectItem>
                            <SelectItem value="engineer">Engineer</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.role && (
                          <p className="text-xs text-red-500">{formErrors.role}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalProjectPiles">Total Project Piles</Label>
                        <Input 
                          id="totalProjectPiles" 
                          type="number"
                          value={totalProjectPiles}
                          onChange={(e) => setTotalProjectPiles(e.target.value)}
                          className={formErrors.totalProjectPiles ? "border-red-500" : ""}
                          disabled={!canEdit}
                        />
                        {formErrors.totalProjectPiles && (
                          <p className="text-xs text-red-500">{formErrors.totalProjectPiles}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="configuration">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Project Configuration</CardTitle>
                    <CardDescription>Technical settings and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="trackerSystem">Tracker System</Label>
                        <Select value={trackerSystem} onValueChange={setTrackerSystem}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tracker system" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="carlson">Carlson</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.trackerSystem && (
                          <p className="text-xs text-red-500">{formErrors.trackerSystem}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="geotechCompany">Geotech Company</Label>
                        <Input 
                          id="geotechCompany" 
                          value={geotechCompany}
                          onChange={(e) => setGeotechCompany(e.target.value)}
                          className={formErrors.geotechCompany ? "border-red-500" : ""}
                          disabled={!canEdit}
                        />
                        {formErrors.geotechCompany && (
                          <p className="text-xs text-red-500">{formErrors.geotechCompany}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embedmentTolerance">Embedment Tolerance (ft)</Label>
                      <Input 
                        id="embedmentTolerance" 
                        type="number"
                        step="0.1"
                        value={embedmentTolerance}
                        onChange={(e) => setEmbedmentTolerance(e.target.value)}
                        className={formErrors.embedmentTolerance ? "border-red-500" : ""}
                        disabled={!canEdit}
                      />
                      {formErrors.embedmentTolerance && (
                        <p className="text-xs text-red-500">{formErrors.embedmentTolerance}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum allowed deviation from design embedment
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>Manage your project team</CardDescription>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="gap-2" disabled={!canEdit}>
                          <UserPlus size={16} />
                          Invite User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                          <DialogDescription>
                            Add a new user to your project team
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="user@example.com"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              disabled={!canEdit}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={newUserRole} onValueChange={setNewUserRole}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="engineer">Engineer</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleInviteUser}
                            disabled={isInvitingUser || !canEdit}
                            className="gap-2"
                          >
                            {isInvitingUser ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Inviting...
                              </>
                            ) : (
                              <>
                                <Mail size={16} />
                                Send Invitation
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teamMembers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          No team members yet. Invite someone to get started.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {teamMembers.map((member) => (
                            <div key={member.id} className="py-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-slate-600">
                                    {member.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{member.email}</p>
                                  <p className="text-sm text-slate-500 capitalize">{member.role}</p>
                                </div>
                              </div>
                              <div className="text-sm text-slate-500">
                                Joined {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                    <CardDescription>Additional configuration options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg">
                      <AlertTriangle size={16} />
                      <p className="text-sm">Advanced settings are coming soon.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button 
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="gap-2"
                disabled={!canEdit}
              >
                <ArrowRight size={16} className="rotate-180" />
                Return to Dashboard
              </Button>
              <Button 
                onClick={handleSaveClick}
                disabled={isLoading || !canEdit}
                className="gap-2"
              >
                <Save size={16} />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 