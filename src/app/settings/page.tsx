"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, Building2, MapPin, Settings2, Users, Database, AlertTriangle, Plus, Mail, UserPlus, Info, Upload, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAccountType } from "@/context/AccountTypeContext";
import { sendInvitationEmail, sendInvitationEmailViaAPI } from "@/lib/emailService";
import { PileLookupUploadModal } from "@/components/PileLookupUploadModal";
import { geocodeAddress } from "@/lib/weatherService";

interface ProjectSettings {
  id: string;
  project_name: string;
  project_location: string;
  location_lat: number | null;
  location_lng: number | null;
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
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [role, setRole] = useState("");
  const [totalProjectPiles, setTotalProjectPiles] = useState("");
  const [trackerSystem, setTrackerSystem] = useState("");
  const [geotechCompany, setGeotechCompany] = useState("");
  const [embedmentTolerance, setEmbedmentTolerance] = useState("1");
  const [dailyPileGoal, setDailyPileGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [projectId, setProjectId] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [isPilePlotModalOpen, setIsPilePlotModalOpen] = useState(false);
  const [pileLookupCount, setPileLookupCount] = useState<number>(0);

  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { canEdit } = useAccountType();

  // Load project settings data
  useEffect(() => {
    const loadProjectSettings = async () => {
      // Wait for auth to finish loading before making decisions
      if (authLoading) {
        return;
      }

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
        setLocationLat(projectData.location_lat);
        setLocationLng(projectData.location_lng);
        setRole(projectData.role);
        setTotalProjectPiles(projectData.total_project_piles.toString());
        setTrackerSystem(projectData.tracker_system);
        setGeotechCompany(projectData.geotech_company);

        // Get embedment_tolerance if it exists, otherwise use default
        if (projectData.embedment_tolerance !== undefined && projectData.embedment_tolerance !== null) {
          setEmbedmentTolerance(projectData.embedment_tolerance.toString());
        }

        // Get daily_pile_goal if it exists
        if (projectData.daily_pile_goal !== undefined && projectData.daily_pile_goal !== null) {
          setDailyPileGoal(projectData.daily_pile_goal.toString());
        }

        // Load pile lookup count (pass projectId directly since state isn't updated yet)
        loadPileLookupCount(projectData.id);
      } catch (error) {
        console.error("Error loading project settings:", error);
        toast.error("Failed to load project settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectSettings();
  }, [user, router, authLoading]);

  const loadPileLookupCount = async (pId?: string) => {
    const idToUse = pId || projectId;
    if (!idToUse) return;

    try {
      const { count, error } = await supabase
        .from('pile_lookup_data')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', idToUse);

      if (error) {
        console.error('Error loading pile lookup count:', error);
        return;
      }

      setPileLookupCount(count || 0);
    } catch (error) {
      console.error('Error loading pile lookup count:', error);
    }
  };

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
          location_lat: locationLat,
          location_lng: locationLng,
          role: role,
          total_project_piles: parseInt(totalProjectPiles),
          tracker_system: trackerSystem,
          geotech_company: geotechCompany,
          embedment_tolerance: parseFloat(embedmentTolerance),
          daily_pile_goal: dailyPileGoal ? parseInt(dailyPileGoal) : null
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
      toast.error("Please fix the errors in the form before saving");
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
          location_lat: locationLat,
          location_lng: locationLng,
          role: role,
          total_project_piles: parseInt(totalProjectPiles),
          tracker_system: trackerSystem,
          geotech_company: geotechCompany,
          embedment_tolerance: parseFloat(embedmentTolerance),
          daily_pile_goal: dailyPileGoal ? parseInt(dailyPileGoal) : null
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

  const handleGeocodeLocation = async () => {
    if (!projectLocation.trim()) {
      toast.error("Please enter a project location first");
      return;
    }

    setIsGeocoding(true);
    try {
      const coords = await geocodeAddress(projectLocation);

      if (coords) {
        setLocationLat(coords.lat);
        setLocationLng(coords.lng);
        toast.success(`Location geocoded successfully! (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
      } else {
        toast.error("Could not geocode this address. Please try a more specific location or enter coordinates manually.");
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
      toast.error("Failed to geocode location");
    } finally {
      setIsGeocoding(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      // Load existing team members from user_projects
      // First try with profiles join, fall back to basic query if it fails
      let existingMembers: Array<{
        id: string;
        user_id: string;
        role: string;
        created_at: string;
        is_owner: boolean;
        profiles?: { email: string } | null;
      }> | null = null;

      // Try to join with profiles view (requires db_migration_profiles_view.sql)
      const { data: membersWithProfiles, error: profilesError } = await supabase
        .from('user_projects')
        .select(`
          id,
          user_id,
          role,
          created_at,
          is_owner,
          profiles:user_id (
            email
          )
        `)
        .eq('project_id', projectId);

      if (!profilesError) {
        existingMembers = membersWithProfiles;
      } else {
        // Fall back to basic query without profiles join
        const { data: basicMembers, error: basicError } = await supabase
          .from('user_projects')
          .select('id, user_id, role, created_at, is_owner')
          .eq('project_id', projectId);

        if (basicError) throw basicError;
        existingMembers = basicMembers;
      }

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

      // Load accepted invitations to get emails for team members
      const { data: acceptedInvitations } = await supabase
        .from('project_invitations')
        .select('email, accepted_by')
        .eq('project_id', projectId)
        .eq('status', 'accepted');

      // Create a map of user_id to email from accepted invitations
      const userEmailMap = new Map<string, string>();
      (acceptedInvitations || []).forEach(inv => {
        if (inv.accepted_by && inv.email) {
          userEmailMap.set(inv.accepted_by, inv.email);
        }
      });

      // Format team members for display
      const formattedMembers = (existingMembers || []).map(member => {
        // Try to get email from: 1) profiles join, 2) accepted invitations, 3) current user
        let email = 'Team Member';

        if (member.profiles && typeof member.profiles === 'object' && 'email' in member.profiles) {
          email = member.profiles.email;
        } else if (userEmailMap.has(member.user_id)) {
          email = userEmailMap.get(member.user_id)!;
        } else if (member.user_id === user?.id && user?.email) {
          email = user.email;
        }

        return {
          id: member.id,
          email,
          role: member.role,
          created_at: member.created_at,
          is_owner: member.is_owner,
          type: 'member'
        };
      });

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

      // Try Supabase Edge Function first (uses Resend)
      let emailSent = false;
      let emailResult = await sendInvitationEmail({
        to_email: newUserEmail.toLowerCase(),
        from_name: inviterName,
        project_name: projectName || 'PileTrackerPro Project',
        role: newUserRole,
        invitation_link: invitationLink
      });

      if (emailResult.success) {
        emailSent = true;
      } else {
        // Fallback to Web3Forms if Edge Function fails
        emailResult = await sendInvitationEmailViaAPI({
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
            <div className="mt-2 p-4 bg-slate-100 border border-slate-300 rounded-lg text-slate-700">
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
                          placeholder="e.g., 123 Main St, City, State"
                          disabled={!canEdit}
                        />
                        {formErrors.projectLocation && (
                          <p className="text-xs text-red-500">{formErrors.projectLocation}</p>
                        )}
                      </div>
                    </div>

                    {/* Weather Location Configuration */}
                    <div className="border-t pt-6 mt-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-slate-600" />
                            Weather Location Configuration
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            Set precise coordinates for weather data tracking. Weather conditions will be recorded for each pile installation.
                          </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="locationLat" className="text-xs text-slate-600">Latitude</Label>
                              <Input
                                id="locationLat"
                                type="number"
                                step="0.000001"
                                value={locationLat?.toString() || ""}
                                onChange={(e) => setLocationLat(e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="e.g., 40.712776"
                                disabled={!canEdit}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="locationLng" className="text-xs text-slate-600">Longitude</Label>
                              <Input
                                id="locationLng"
                                type="number"
                                step="0.000001"
                                value={locationLng?.toString() || ""}
                                onChange={(e) => setLocationLng(e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="e.g., -74.005974"
                                disabled={!canEdit}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {locationLat && locationLng ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">✓ Weather location configured</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">⚠️ No coordinates set - weather features disabled</span>
                              )}
                            </div>
                            <Button
                              type="button"
                              onClick={handleGeocodeLocation}
                              disabled={isGeocoding || !projectLocation.trim() || !canEdit}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              {isGeocoding ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600" />
                                  Geocoding...
                                </>
                              ) : (
                                <>
                                  <MapPin className="h-4 w-4" />
                                  Auto-Fill from Address
                                </>
                              )}
                            </Button>
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <p className="font-medium mb-1">About Weather Tracking:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Weather data will be automatically associated with each pile installation</li>
                              <li>Historical weather lookups use the installation date from pile records</li>
                              <li>Data sourced from Open-Meteo (free, no API key required)</li>
                              <li>Coordinates can be entered manually or auto-filled from the project address</li>
                            </ul>
                          </div>
                        </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <div className="space-y-2">
                        <Label htmlFor="dailyPileGoal">Daily Production Goal (piles)</Label>
                        <Input
                          id="dailyPileGoal"
                          type="number"
                          min="1"
                          value={dailyPileGoal}
                          onChange={(e) => setDailyPileGoal(e.target.value)}
                          placeholder="e.g., 50"
                          disabled={!canEdit}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Target number of piles to install per day. Update as schedule changes.
                        </p>
                      </div>
                    </div>

                    {/* Pile Plot Plan Section */}
                    <div className="border-t pt-6 mt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                              Pile Plot Plan
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              Upload your pile plot reference data for automatic Pile Type and Design Embedment lookups during CSV imports
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Current Status
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {pileLookupCount > 0
                                  ? `${pileLookupCount} pile reference${pileLookupCount !== 1 ? 's' : ''} loaded`
                                  : 'No pile plot plan uploaded yet'}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              pileLookupCount > 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                            }`}>
                              {pileLookupCount > 0 ? 'Active' : 'Not Configured'}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => setIsPilePlotModalOpen(true)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              disabled={!canEdit}
                            >
                              <Upload className="h-4 w-4" />
                              {pileLookupCount > 0 ? 'Replace' : 'Upload'} Pile Plot Plan
                            </Button>
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <p className="font-medium">Supported formats: CSV, XLSX</p>
                            <p>Required columns: TAG/Name, Pile Type, Design Embedment</p>
                            <p className="text-amber-600 dark:text-amber-400">
                              ⚠️ Uploading a new file will replace existing pile plot data
                            </p>
                          </div>
                        </div>
                      </div>
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

      {/* Pile Plot Upload Modal */}
      <PileLookupUploadModal
        isOpen={isPilePlotModalOpen}
        onClose={() => {
          setIsPilePlotModalOpen(false);
          loadPileLookupCount(); // Reload count after upload
        }}
        projectId={projectId}
      />
    </div>
  );
} 