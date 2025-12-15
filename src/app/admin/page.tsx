"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminService, AdminUser, AdminProject } from "@/lib/adminService";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Shield, Users, Building2, UserPlus, Plus, Copy, Eye, EyeOff,
  Trash2, RefreshCw, UserCheck, UserMinus, Loader2
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Create user modal states
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserAccountType, setNewUserAccountType] = useState<"epc" | "owner">("epc");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Password display modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [createdUserEmail, setCreatedUserEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Create project modal states
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLocation, setNewProjectLocation] = useState("");
  const [newProjectPiles, setNewProjectPiles] = useState("");
  const [newProjectTrackerSystem, setNewProjectTrackerSystem] = useState("software");
  const [newProjectGeotechCompany, setNewProjectGeotechCompany] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Assignment states
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState("admin");
  const [assignmentIsOwner, setAssignmentIsOwner] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Check super admin status on mount
  useEffect(() => {
    async function checkAdmin() {
      if (authLoading) return;
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        const result = await adminService.checkSuperAdmin();
        setIsSuperAdmin(result.isSuperAdmin);

        if (!result.isSuperAdmin) {
          toast.error("Access denied. Super admin privileges required.");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push("/dashboard");
      } finally {
        setIsCheckingAdmin(false);
      }
    }

    checkAdmin();
  }, [user, authLoading, router]);

  // Load data functions
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await adminService.listUsers();
      setUsers(result.users);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const result = await adminService.listProjects();
      setProjects(result.projects);
    } catch (error) {
      toast.error("Failed to load projects");
      console.error(error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Load data on admin access
  useEffect(() => {
    if (isSuperAdmin && !isCheckingAdmin) {
      loadUsers();
      loadProjects();
    }
  }, [isSuperAdmin, isCheckingAdmin]);

  // Create user handler
  const handleCreateUser = async () => {
    if (!newUserEmail) {
      toast.error("Email is required");
      return;
    }

    setIsCreatingUser(true);
    try {
      const result = await adminService.createUser({
        email: newUserEmail,
        first_name: newUserFirstName,
        last_name: newUserLastName,
        account_type: newUserAccountType,
      });

      // Close create dialog and show password
      setIsCreateUserOpen(false);
      setCreatedUserEmail(result.user.email);
      setGeneratedPassword(result.temporaryPassword);
      setShowPasswordModal(true);

      // Reset form
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserAccountType("epc");

      // Refresh users list
      loadUsers();

      toast.success("User created successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create user";
      toast.error(errorMessage);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Create project handler
  const handleCreateProject = async () => {
    if (!newProjectName || !newProjectLocation) {
      toast.error("Project name and location are required");
      return;
    }
    if (!newProjectPiles || parseInt(newProjectPiles) <= 0) {
      toast.error("Total piles must be greater than 0");
      return;
    }
    if (!newProjectGeotechCompany.trim()) {
      toast.error("Geotech company is required");
      return;
    }

    setIsCreatingProject(true);
    try {
      await adminService.createProject({
        project_name: newProjectName,
        project_location: newProjectLocation,
        total_project_piles: newProjectPiles ? parseInt(newProjectPiles) : 0,
        tracker_system: newProjectTrackerSystem,
        geotech_company: newProjectGeotechCompany,
      });

      setIsCreateProjectOpen(false);
      setNewProjectName("");
      setNewProjectLocation("");
      setNewProjectPiles("");
      setNewProjectGeotechCompany("");

      loadProjects();
      toast.success("Project created successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create project";
      toast.error(errorMessage);
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Assign user to project handler
  const handleAssignUser = async () => {
    if (!selectedUserId || !selectedProjectId || !assignmentRole) {
      toast.error("Please select a user, project, and role");
      return;
    }

    setIsAssigning(true);
    try {
      const result = await adminService.assignUserToProject({
        user_id: selectedUserId,
        project_id: selectedProjectId,
        role: assignmentRole,
        is_owner: assignmentIsOwner,
      });

      loadUsers();
      loadProjects();
      toast.success(result.updated ? "Assignment updated!" : "User assigned to project!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to assign user";
      toast.error(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove user from project handler
  const handleRemoveFromProject = async (userId: string, projectId: string) => {
    try {
      await adminService.removeUserFromProject({ user_id: userId, project_id: projectId });
      loadUsers();
      loadProjects();
      toast.success("User removed from project");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove user";
      toast.error(errorMessage);
    }
  };

  // Grant/revoke super admin handler
  const handleToggleSuperAdmin = async (userId: string, currentlySuper: boolean) => {
    try {
      if (currentlySuper) {
        await adminService.revokeSuperAdmin(userId);
        toast.success("Super admin privileges revoked");
      } else {
        await adminService.grantSuperAdmin(userId);
        toast.success("Super admin privileges granted");
      }
      loadUsers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update super admin status";
      toast.error(errorMessage);
    }
  };

  // Copy password to clipboard
  const copyPassword = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    toast.success("Password copied to clipboard");
  };

  // Copy credentials to clipboard
  const copyCredentials = async () => {
    const credentials = `Email: ${createdUserEmail}\nPassword: ${generatedPassword}`;
    await navigator.clipboard.writeText(credentials);
    toast.success("Credentials copied to clipboard");
  };

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
          <span className="text-slate-600">Verifying access...</span>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <CollapsibleSidebar projectName="Admin Panel" currentPage="admin" />

      <div
        className="transition-all duration-300 ease-in-out"
        style={{ paddingLeft: 'var(--sidebar-width, 64px)' }}
      >
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Super Admin Panel
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  System-wide administrative controls
                </p>
              </div>
            </div>

            {/* Main content with tabs */}
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full max-w-lg grid-cols-3">
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Users ({users.length})
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Projects ({projects.length})
                </TabsTrigger>
                <TabsTrigger value="assignments" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assignments
                </TabsTrigger>
              </TabsList>

              {/* Users Tab Content */}
              <TabsContent value="users">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Create and manage system users</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoadingUsers}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button size="sm" onClick={() => setIsCreateUserOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Account Type</TableHead>
                            <TableHead>Projects</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.email}</TableCell>
                              <TableCell>{u.first_name} {u.last_name}</TableCell>
                              <TableCell>
                                <Badge variant={u.account_type === 'epc' ? 'default' : 'secondary'}>
                                  {u.account_type === 'epc' ? 'EPC' : "Owner's Rep"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {u.projects.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {u.projects.map((p) => (
                                      <Badge key={p.project_id} variant="outline" className="text-xs">
                                        {p.project_name}
                                        {p.is_owner && <span className="ml-1 text-amber-500">*</span>}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-sm">No projects</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {u.is_super_admin && (
                                    <Badge className="bg-amber-500">Super Admin</Badge>
                                  )}
                                  {u.email_confirmed && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleSuperAdmin(u.id, u.is_super_admin)}
                                  disabled={u.id === user?.id}
                                  title={u.id === user?.id ? "Cannot modify your own status" : undefined}
                                >
                                  {u.is_super_admin ? (
                                    <UserMinus className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Projects Tab Content */}
              <TabsContent value="projects">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Project Management</CardTitle>
                      <CardDescription>Create and view all projects</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadProjects} disabled={isLoadingProjects}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button size="sm" onClick={() => setIsCreateProjectOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Total Piles</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.project_name}</TableCell>
                              <TableCell>{p.project_location}</TableCell>
                              <TableCell>{p.total_project_piles}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{p.user_count} users</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {new Date(p.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Assignments Tab Content */}
              <TabsContent value="assignments">
                <Card>
                  <CardHeader>
                    <CardTitle>User-Project Assignments</CardTitle>
                    <CardDescription>Assign or remove users from projects</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Tip:</strong> Set &quot;Project Owner&quot; to <strong>Yes</strong> for at least one user per project. Only project owners can edit project settings (name, location, weather config, etc.).
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Project</Label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.project_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={assignmentRole} onValueChange={setAssignmentRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="engineer">Engineer</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="owner_rep">Owner&apos;s Rep</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Project Owner</Label>
                        <Select
                          value={assignmentIsOwner ? "yes" : "no"}
                          onValueChange={(v) => setAssignmentIsOwner(v === "yes")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAssignUser} disabled={isAssigning}>
                        {isAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign User
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (selectedUserId && selectedProjectId) {
                            handleRemoveFromProject(selectedUserId, selectedProjectId);
                          } else {
                            toast.error("Please select a user and project");
                          }
                        }}
                        disabled={!selectedUserId || !selectedProjectId}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Project
                      </Button>
                    </div>

                    {/* Current assignments for selected user */}
                    {selectedUserId && (
                      <div className="mt-6 pt-6 border-t">
                        <h3 className="font-medium mb-3">
                          Current Assignments for {users.find(u => u.id === selectedUserId)?.email}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {users.find(u => u.id === selectedUserId)?.projects.map((p) => (
                            <Badge key={p.project_id} variant="secondary" className="py-1 px-3">
                              {p.project_name} ({p.role})
                              {p.is_owner && <span className="ml-1 text-amber-500">Owner</span>}
                              <button
                                className="ml-2 text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveFromProject(selectedUserId, p.project_id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {users.find(u => u.id === selectedUserId)?.projects.length === 0 && (
                            <span className="text-slate-400 text-sm">No project assignments</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Create User Modal */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with a random password. No email confirmation required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>After creating:</strong> Go to Assignments tab to assign this user to a project. Set them as Project Owner if they need to edit project settings.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select value={newUserAccountType} onValueChange={(v: "epc" | "owner") => setNewUserAccountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="epc">EPC (Full Access)</SelectItem>
                  <SelectItem value="owner">Owner&apos;s Rep (Read Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Display Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              Save these credentials - the password will only be shown once!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-sm">
                {createdUserEmail}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md font-mono text-sm">
                  {showPassword ? generatedPassword : "••••••••••••••••"}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                The user should change this password after their first login.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={copyCredentials}>
              <Copy className="h-4 w-4 mr-2" />
              Copy All Credentials
            </Button>
            <Button onClick={() => setShowPasswordModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Modal */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project. After creation, assign a user as <strong>Project Owner</strong> in the Assignments tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Important:</strong> After creating the project, go to Assignments tab and assign a user with &quot;Project Owner = Yes&quot; so they can edit project settings.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="My Construction Project"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectLocation">Location *</Label>
              <Input
                id="projectLocation"
                placeholder="City, State"
                value={newProjectLocation}
                onChange={(e) => setNewProjectLocation(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalPiles">Total Piles *</Label>
                <Input
                  id="totalPiles"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={newProjectPiles}
                  onChange={(e) => setNewProjectPiles(e.target.value)}
                />
                <p className="text-xs text-slate-500">Must be greater than 0</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trackerSystem">Tracker System *</Label>
                <Select value={newProjectTrackerSystem} onValueChange={setNewProjectTrackerSystem}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="geotechCompany">Geotech Company *</Label>
              <Input
                id="geotechCompany"
                placeholder="Company Name"
                value={newProjectGeotechCompany}
                onChange={(e) => setNewProjectGeotechCompany(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreatingProject}>
              {isCreatingProject && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
