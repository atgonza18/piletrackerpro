"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LogOut, Plus, List, BarChart3, Settings, User, Bell, FileText, Search, X, AlertTriangle, Check, Clock, MapPin, Pencil, Trash2, Save, Box } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface PileData {
  id: string;
  pile_number: string;
  pile_location: string;
  pile_type: string;
  pile_status: string;
  installation_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  block: string | null;
  design_embedment: number | null;
  duration: string | null;
  embedment: number | null;
  end_z: number | null;
  gain_per_30_seconds: number | null;
  machine: number | null;
  pile_color: string | null;
  pile_id: string | null;
  pile_size: string | null;
  start_date: string | null;
  start_time: string | null;
  start_z: number | null;
  stop_time: string | null;
  zone: string | null;
}

export default function NotesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(3);
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [userInitials, setUserInitials] = useState("JD");
  const [userName, setUserName] = useState("Jane");
  
  const [piles, setPiles] = useState<PileData[]>([]);
  const [filteredPiles, setFilteredPiles] = useState<PileData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [embedmentTolerance, setEmbedmentTolerance] = useState(1); // Default tolerance
  const [selectedPile, setSelectedPile] = useState<PileData | null>(null);
  const [pileToDelete, setPileToDelete] = useState<PileData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedNote, setEditedNote] = useState("");

  useEffect(() => {
    // Check if user is logged in, if not redirect to auth page
    if (!user && !authLoading) {
      router.push("/auth");
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, router, authLoading]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get the user's project
      const { data: userProjectData } = await supabase
        .from('user_projects')
        .select('project_id')
        .eq('user_id', user.id)
        .single();
      
      if (!userProjectData) {
        toast.error("Project not found");
        return;
      }

      // Get project data to load embedment tolerance
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', userProjectData.project_id)
        .single();

      if (projectData && projectData.embedment_tolerance !== undefined && projectData.embedment_tolerance !== null) {
        setEmbedmentTolerance(projectData.embedment_tolerance);
      }
      
      // Fetch all piles with notes for this project
      const { data: pilesData, error } = await supabase
        .from('piles')
        .select('*')
        .eq('project_id', userProjectData.project_id)
        .not('notes', 'is', null)
        .not('notes', 'eq', '');
      
      if (error) {
        throw error;
      }
      
      if (pilesData) {
        setPiles(pilesData);
        setFilteredPiles(pilesData);
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
      console.error("Error loading notes data:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Filter piles based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPiles(piles);
      return;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const results = piles.filter(pile => {
      return (
        (pile.pile_id && pile.pile_id.toLowerCase().includes(lowercaseQuery)) ||
        (pile.pile_number && pile.pile_number.toLowerCase().includes(lowercaseQuery)) ||
        (pile.notes && pile.notes.toLowerCase().includes(lowercaseQuery)) ||
        (pile.zone && pile.zone.toLowerCase().includes(lowercaseQuery)) ||
        (pile.block && pile.block.toLowerCase().includes(lowercaseQuery))
      );
    });
    
    setFilteredPiles(results);
  }, [searchQuery, piles]);

  // Function to determine pile status based on embedment and manual override
  const getPileStatus = (pile: PileData) => {
    // If a manual status is set, use that instead of calculating
    if (pile.pile_status) {
      return pile.pile_status;
    }
    
    // If missing embedment data, consider it N/A
    if (!pile.embedment || !pile.design_embedment) return 'na';
    
    if (Number(pile.embedment) >= Number(pile.design_embedment)) {
      return 'accepted';
    } else if (Number(pile.embedment) < (Number(pile.design_embedment) - embedmentTolerance)) {
      return 'refusal';
    } else {
      return 'accepted'; // Within tolerance
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50">
            <Check className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'refusal':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Refusal
          </Badge>
        );
      case 'na':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50">
            <Clock className="h-3 w-3 mr-1" />
            N/A
          </Badge>
        );
      case 'complete':
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50">
            <Check className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'issue':
      case 'problem':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Issue
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  const handleEditNote = async () => {
    if (!selectedPile || !user) return;
    
    try {
      const { error } = await supabase
        .from('piles')
        .update({ notes: editedNote })
        .eq('id', selectedPile.id);
        
      if (error) throw error;
      
      // Update local state
      setPiles(prevPiles => 
        prevPiles.map(pile => 
          pile.id === selectedPile.id 
            ? { ...pile, notes: editedNote }
            : pile
        )
      );
      setFilteredPiles(prevPiles => 
        prevPiles.map(pile => 
          pile.id === selectedPile.id 
            ? { ...pile, notes: editedNote }
            : pile
        )
      );
      
      toast.success("Note updated successfully");
      setIsEditDialogOpen(false);
      setSelectedPile(null);
      setEditedNote("");
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async () => {
    if (!pileToDelete || !user) return;
    
    try {
      const { error } = await supabase
        .from('piles')
        .update({ notes: null })
        .eq('id', pileToDelete.id);
        
      if (error) throw error;
      
      // Update local state to remove the pile from the notes view
      setPiles(prevPiles => prevPiles.filter(pile => pile.id !== pileToDelete.id));
      setFilteredPiles(prevPiles => prevPiles.filter(pile => pile.id !== pileToDelete.id));
      
      toast.success("Note deleted successfully");
      setIsDeleteDialogOpen(false);
      setPileToDelete(null);
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Collapsible Sidebar - Hidden on mobile */}
      <CollapsibleSidebar
        projectName="PileTrackerPro"
        currentPage="notes"
      />

      {/* Main content */}
      <div
        className="transition-all duration-300 ease-in-out max-lg:!pl-0"
        style={{ paddingLeft: 'var(--sidebar-width, 0px)' }}
      >
        {/* Mobile header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white flex items-center justify-center font-bold text-sm">
              PT
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">PileTrackerPro</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => router.push('/notifications' as any)}
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full overflow-hidden border-slate-200 dark:border-slate-700"
              onClick={() => router.push('/settings' as any)}
            >
              <div className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 h-full w-full flex items-center justify-center text-xs font-medium">
                {userInitials}
              </div>
            </Button>
          </div>
        </header>

        {/* Notes content */}
        <main className="p-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Pile Notes</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">View and manage piles with added notes</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search notes..."
                    className="pl-9 w-full md:w-64 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button 
                  className="bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-2"
                  onClick={() => router.push('/my-piles')}
                >
                  <List className="h-4 w-4" />
                  View All Piles
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600"></div>
              </div>
            ) : filteredPiles.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-3 mb-4">
                    <FileText className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No notes found</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                    {searchQuery ? "No piles matched your search criteria." : "You haven't added notes to any piles yet."}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      className="mt-4 border-slate-200 dark:border-slate-700"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPiles.map((pile) => (
                  <Card 
                    key={pile.id} 
                    className="border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-2 flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {pile.pile_id || pile.pile_number || "Unnamed Pile"}
                          {pile.design_embedment && pile.embedment && 
                           Number(pile.embedment) < Number(pile.design_embedment) && (
                            <span className="inline-flex" title="Embedment issue">
                              <AlertTriangle size={16} className="text-amber-500 dark:text-amber-400" />
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-2 mt-1">
                          {pile.zone && <span>Zone: {pile.zone}</span>}
                          {pile.zone && pile.block && <span>•</span>}
                          {pile.block && <span>Block: {pile.block}</span>}
                        </CardDescription>
                      </div>
                      <div>
                        {getStatusBadge(getPileStatus(pile))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-700 dark:text-slate-200 text-sm border border-slate-100 dark:border-slate-600">
                        {pile.notes || "No notes added yet."}
                      </div>
                      
                      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-300">Date:</p>
                          <p>{formatDate(pile.start_date)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-300">Embedment:</p>
                          <p>{pile.embedment ? `${pile.embedment} ft` : "N/A"}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Clock size={12} />
                          {format(new Date(pile.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPile(pile);
                              setEditedNote(pile.notes || "");
                              setIsEditDialogOpen(true);
                            }}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                          >
                            <Pencil size={14} className="mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPileToDelete(pile);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={14} className="mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Note Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-xl shadow-xl border-none overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <Pencil size={18} className="text-slate-600 mr-2" />
              Edit Note
            </DialogTitle>
            <div className="text-slate-500 text-sm">
              Edit note for pile {selectedPile?.pile_id || selectedPile?.pile_number}
            </div>
          </DialogHeader>
          <div className="mt-4">
            <Label htmlFor="edit-notes" className="text-sm font-medium flex items-center">
              <Pencil size={14} className="mr-1.5 text-slate-500" />
              Notes
            </Label>
            <Textarea
              id="edit-notes"
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              placeholder="Enter notes about this pile..."
              className="mt-1.5 transition-all duration-200 focus:border-slate-400"
              rows={5}
            />
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="transition-all duration-200 hover:bg-slate-100">
              Cancel
            </Button>
            <Button onClick={handleEditNote} className="transition-all duration-200">
              <Save size={16} className="mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl shadow-xl border-none overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center text-xl">
              <AlertTriangle size={18} className="text-red-600 mr-2" />
              Delete Note
            </DialogTitle>
            <div className="text-slate-500 text-sm">
              Are you sure you want to delete this note? This action cannot be undone.
            </div>
          </DialogHeader>
          <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-100 text-red-800 transition-all duration-200 hover:bg-red-100">
            <h4 className="font-medium mb-1 flex items-center">
              <FileText size={14} className="mr-1.5" />
              Note Information:
            </h4>
            <p>Pile ID: {pileToDelete?.pile_id || pileToDelete?.pile_number}</p>
            {pileToDelete?.zone && <p>Zone: {pileToDelete.zone}</p>}
            {pileToDelete?.block && <p>Block: {pileToDelete.block}</p>}
            <div className="mt-2 text-sm">
              <p className="font-medium">Note Content:</p>
              <p className="mt-1">{pileToDelete?.notes}</p>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="transition-all duration-200 hover:bg-slate-100">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteNote} className="transition-all duration-200">
              <Trash2 size={16} className="mr-2" />
              Delete Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 