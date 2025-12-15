"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface DeleteAllPilesButtonProps {
  projectId: string;
  onDeleteSuccess: () => void;
}

export function DeleteAllPilesButton({ projectId, onDeleteSuccess }: DeleteAllPilesButtonProps) {
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAllPiles = async () => {
    if (!projectId) {
      toast.error("Project ID is required");
      return;
    }

    try {
      setIsDeletingAll(true);
      
      // First, get the count of piles to be deleted
      const { count } = await supabase
        .from('piles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      console.log(`Attempting to delete ${count} piles for project ${projectId}`);
      
      // Delete all piles for the current project
      const { error, count: deletedCount } = await supabase
        .from('piles')
        .delete()
        .eq('project_id', projectId)
        .select('count');
      
      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      console.log(`Successfully deleted ${deletedCount} piles`);
      
      toast.success(`Successfully deleted ${count} piles`);
      setIsDeleteAllDialogOpen(false);
      onDeleteSuccess();
    } catch (error) {
      console.error("Error deleting all piles:", error);
      toast.error("Failed to delete all piles. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsDeleteAllDialogOpen(true)}
        className="gap-1.5"
      >
        <Trash2 size={16} />
        Delete All
      </Button>

      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">Delete All Piles</DialogTitle>
            <DialogDescription className="pt-4 text-center">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <span className="block text-slate-600 dark:text-slate-400">
                Are you absolutely sure you want to delete all piles? This action cannot be undone and will permanently remove all pile data from the database.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteAllDialogOpen(false)}
              disabled={isDeletingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllPiles}
              disabled={isDeletingAll}
              className="gap-2"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete All Piles
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 