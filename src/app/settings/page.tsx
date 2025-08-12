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
import { sendInvitationEmail, sendInvitationEmailViaAPI } from "@/lib/emailService";

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

      // Check if user has edit permissions
      if (!canEdit) {
        toast.error("You don't have permission to access project settings as an Owner's Representative");
        router.push("/dashboard");
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

  const handleSaveClick = async () => {
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

  const loadTeamMembers = async () => {
    try {
      // Load existing team members from user_projects
      const { data: existingMembers, error: membersError } = await supabase
        .from('user_projects')
        .select(`
          *,
          user:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('project_id', projectId);

      if (membersError) throw membersError;

      // Load pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (invitationsError && invitationsError.code !== '42P01') {
        console.error('Error loading invitations:', invitationsError);
      }

      // Format team members for display
      const formattedMembers = (existingMembers || []).map(member => ({
        id: member.id,
        email: member.user?.email || 'Unknown',
        role: member.role,
        created_at: member.created_at,
        is_owner: member.is_owner,
        type: 'member'
      }));

      // Add pending invitations to the list
      const formattedInvitations = (invitations || []).map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        created_at: inv.created_at,
        type: 'invitation',
        expires_at: inv.expires_at
      }));

      setTeamMembers([...formattedMembers, ...formattedInvitations]);
    } catch (error) {
      console.error('Error loading team members:', error);
      // Don't show error toast for normal operation
    }
  };

  const handleInviteUser = async () => {
    if (!newUserEmail || !newUserRole) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsInvitingUser(true);
    try {
      // Check if there's already a pending invitation
      const { data: existingInvitation, error: inviteCheckError } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('project_id', projectId)
        .eq('email', newUserEmail.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        toast.error('An invitation has already been sent to this email');
        setIsInvitingUser(false);
        return;
      }

      // Generate a secure invitation token
      const generateToken = () => {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const invitationToken = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Invitation expires in 7 days

      // Create invitation record
      const { data: invitation, error: inviteError } = await supabase
        .from('project_invitations')
        .insert([
          {
            email: newUserEmail.toLowerCase(),
            project_id: projectId,
            role: newUserRole,
            invited_by: user?.id,
            token: invitationToken,
            expires_at: expiresAt.toISOString(),
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (inviteError) {
        if (inviteError.code === '23505') { // Unique constraint violation
          toast.error('An invitation has already been sent to this email for this project');
        } else {
          throw inviteError;
        }
        setIsInvitingUser(false);
        return;
      }

      // Generate invitation link
      const invitationLink = `${window.location.origin}/auth?invitation=${invitationToken}`;

      // Try to send email using our email service
      const inviterName = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email?.split('@')[0] || 'Team Admin';
      
      // First try Web3Forms (if configured)
      let emailSent = false;
      let emailResult = await sendInvitationEmailViaAPI({
        to_email: newUserEmail.toLowerCase(),
        from_name: inviterName,
        project_name: projectName || 'PileTrackerPro Project',
        role: newUserRole,
        invitation_link: invitationLink
      });

      if (emailResult.success) {
        emailSent = true;
      } else {
        // Try EmailJS as fallback
        emailResult = await sendInvitationEmail({
          to_email: newUserEmail.toLowerCase(),
          from_name: inviterName,
          project_name: projectName || 'PileTrackerPro Project',
          role: newUserRole,
          invitation_link: invitationLink
        });
        
        if (emailResult.success) {
          emailSent = true;
        }
      }

      if (emailSent) {
        toast.success(
          <div>
            <p>✅ Invitation sent successfully!</p>
            <p className="text-sm mt-1">An email has been sent to {newUserEmail}</p>
            <p className="text-xs mt-2 opacity-75">They have 7 days to accept the invitation</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        // Fall back to copying link if email couldn't be sent
        await navigator.clipboard.writeText(invitationLink);
        toast.warning(
          <div>
            <p>⚠️ Invitation created but email not sent</p>
            <p className="text-sm mt-1">Link copied to clipboard - please send it to {newUserEmail}</p>
            <p className="text-xs mt-2 opacity-75">To enable automatic emails, see EMAIL_SETUP.md</p>
          </div>,
          { duration: 8000 }
        );
      }
      
      console.log('Invitation link:', invitationLink);

      setNewUserEmail('');
      setNewUserRole('');
      
      // Refresh team members list to show pending invitations
      loadTeamMembers();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to create invitation');
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
                        <Input 
                          id="trackerSystem" 
                          value={trackerSystem}
                          onChange={(e) => setTrackerSystem(e.target.value)}
                          placeholder="Enter tracker system"
                          className={formErrors.trackerSystem ? "border-red-500" : ""}
                          disabled={!canEdit}
                        />
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
                          {teamMembers.map((member: any) => (
                            <div key={member.id} className="py-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${member.type === 'invitation' ? 'bg-yellow-100' : 'bg-slate-100'} flex items-center justify-center`}>
                                  <span className={`text-sm font-medium ${member.type === 'invitation' ? 'text-yellow-600' : 'text-slate-600'}`}>
                                    {member.email.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {member.email}
                                    {member.type === 'invitation' && (
                                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Pending Invitation</span>
                                    )}
                                  </p>
                                  <p className="text-sm text-slate-500 capitalize">
                                    {member.role}
                                    {member.is_owner && ' (Owner)'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-slate-500">
                                {member.type === 'invitation' ? (
                                  <span>Expires {new Date(member.expires_at).toLocaleDateString()}</span>
                                ) : (
                                  <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                                )}
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