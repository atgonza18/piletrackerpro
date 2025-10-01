"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PileData {
  id: string;
  pile_id: string | null;
  pile_number: string;
  pile_location: string | null;
  block: string | null;
  pile_type: string | null;
  pile_size: string | null;
  pile_status: string;
  installation_date: string | null;
  start_time: string | null;
  stop_time: string | null;
  duration: string | null;
  start_z: number | null;
  end_z: number | null;
  embedment: number | null;
  design_embedment: number | null;
  gain_per_30_seconds: number | null;
  machine: number | null;
  notes: string | null;
}

interface EditPileModalProps {
  isOpen: boolean;
  onClose: () => void;
  pile: PileData | null;
  onUpdate: () => void; // Callback to refresh pile list after update
}

export function EditPileModal({ isOpen, onClose, pile, onUpdate }: EditPileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    pile_id: "",
    pile_number: "",
    pile_location: "",
    block: "",
    pile_type: "",
    pile_size: "",
    pile_status: "Pending",
    installation_date: "",
    start_time: "",
    stop_time: "",
    duration: "",
    start_z: "",
    end_z: "",
    embedment: "",
    design_embedment: "",
    gain_per_30_seconds: "",
    machine: "",
    notes: "",
  });

  // Load pile data when modal opens
  useEffect(() => {
    if (pile && isOpen) {
      setFormData({
        pile_id: pile.pile_id || "",
        pile_number: pile.pile_number || "",
        pile_location: pile.pile_location || "",
        block: pile.block || "",
        pile_type: pile.pile_type || "",
        pile_size: pile.pile_size || "",
        pile_status: pile.pile_status || "Pending",
        installation_date: pile.installation_date || "",
        start_time: pile.start_time || "",
        stop_time: pile.stop_time || "",
        duration: pile.duration || "",
        start_z: pile.start_z !== null ? String(pile.start_z) : "",
        end_z: pile.end_z !== null ? String(pile.end_z) : "",
        embedment: pile.embedment !== null ? String(pile.embedment) : "",
        design_embedment: pile.design_embedment !== null ? String(pile.design_embedment) : "",
        gain_per_30_seconds: pile.gain_per_30_seconds !== null ? String(pile.gain_per_30_seconds) : "",
        machine: pile.machine !== null ? String(pile.machine) : "",
        notes: pile.notes || "",
      });
    }
  }, [pile, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!pile) return;

    // Validation
    if (!formData.pile_id || !formData.pile_number) {
      toast.error("Pile ID and Pile Number are required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare update data
      const updateData: any = {
        pile_id: formData.pile_id.trim(),
        pile_number: formData.pile_number.trim(),
        pile_location: formData.pile_location.trim() || null,
        block: formData.block.trim() || null,
        pile_type: formData.pile_type.trim() || null,
        pile_size: formData.pile_size.trim() || null,
        pile_status: formData.pile_status,
        installation_date: formData.installation_date || null,
        start_time: formData.start_time || null,
        stop_time: formData.stop_time || null,
        duration: formData.duration || null,
        start_z: formData.start_z ? parseFloat(formData.start_z) : null,
        end_z: formData.end_z ? parseFloat(formData.end_z) : null,
        embedment: formData.embedment ? parseFloat(formData.embedment) : null,
        design_embedment: formData.design_embedment ? parseFloat(formData.design_embedment) : null,
        gain_per_30_seconds: formData.gain_per_30_seconds ? parseFloat(formData.gain_per_30_seconds) : null,
        machine: formData.machine ? parseInt(formData.machine) : null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Auto-calculate embedment if start_z and end_z are provided but embedment is not
      if (!updateData.embedment && updateData.start_z !== null && updateData.end_z !== null) {
        updateData.embedment = updateData.start_z - updateData.end_z;
      }

      // Update pile in database
      const { error } = await supabase
        .from('piles')
        .update(updateData)
        .eq('id', pile.id);

      if (error) {
        console.error("Error updating pile:", error);
        toast.error(`Failed to update pile: ${error.message}`);
        return;
      }

      toast.success("Pile updated successfully!");
      onUpdate(); // Refresh the pile list
      onClose();
    } catch (error) {
      console.error("Error updating pile:", error);
      toast.error("Failed to update pile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pile</DialogTitle>
          <DialogDescription>
            Update pile information. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Basic Information</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {/* Pile ID */}
              <div className="space-y-2">
                <Label htmlFor="pile_id">Pile ID *</Label>
                <Input
                  id="pile_id"
                  value={formData.pile_id}
                  onChange={(e) => handleInputChange("pile_id", e.target.value)}
                  placeholder="e.g., A1.005.03"
                />
              </div>

              {/* Pile Number */}
              <div className="space-y-2">
                <Label htmlFor="pile_number">Pile Number *</Label>
                <Input
                  id="pile_number"
                  value={formData.pile_number}
                  onChange={(e) => handleInputChange("pile_number", e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>

              {/* Pile Location */}
              <div className="space-y-2">
                <Label htmlFor="pile_location">Pile Location</Label>
                <Input
                  id="pile_location"
                  value={formData.pile_location}
                  onChange={(e) => handleInputChange("pile_location", e.target.value)}
                  placeholder="e.g., North Section"
                />
              </div>

              {/* Block */}
              <div className="space-y-2">
                <Label htmlFor="block">Block</Label>
                <Input
                  id="block"
                  value={formData.block}
                  onChange={(e) => handleInputChange("block", e.target.value)}
                  placeholder="e.g., A1"
                />
              </div>

              {/* Pile Type */}
              <div className="space-y-2">
                <Label htmlFor="pile_type">Pile Type</Label>
                <Input
                  id="pile_type"
                  value={formData.pile_type}
                  onChange={(e) => handleInputChange("pile_type", e.target.value)}
                  placeholder="e.g., 2A2B.INTARRAY"
                />
              </div>

              {/* Pile Size */}
              <div className="space-y-2">
                <Label htmlFor="pile_size">Pile Size</Label>
                <Input
                  id="pile_size"
                  value={formData.pile_size}
                  onChange={(e) => handleInputChange("pile_size", e.target.value)}
                  placeholder="e.g., 12x12"
                />
              </div>

              {/* Pile Status */}
              <div className="space-y-2">
                <Label htmlFor="pile_status">Pile Status</Label>
                <Select value={formData.pile_status} onValueChange={(value) => handleInputChange("pile_status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Refusal">Refusal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Machine */}
              <div className="space-y-2">
                <Label htmlFor="machine">Machine #</Label>
                <Input
                  id="machine"
                  type="number"
                  value={formData.machine}
                  onChange={(e) => handleInputChange("machine", e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
            </div>
          </div>

          {/* Installation Details Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Installation Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {/* Installation Date */}
              <div className="space-y-2">
                <Label htmlFor="installation_date">Installation Date</Label>
                <Input
                  id="installation_date"
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) => handleInputChange("installation_date", e.target.value)}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", e.target.value)}
                  placeholder="e.g., 00:15:30"
                />
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange("start_time", e.target.value)}
                />
              </div>

              {/* Stop Time */}
              <div className="space-y-2">
                <Label htmlFor="stop_time">Stop Time</Label>
                <Input
                  id="stop_time"
                  type="time"
                  value={formData.stop_time}
                  onChange={(e) => handleInputChange("stop_time", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Measurements Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Measurements</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {/* Start Z */}
              <div className="space-y-2">
                <Label htmlFor="start_z">Start Z (ft)</Label>
                <Input
                  id="start_z"
                  type="number"
                  step="0.01"
                  value={formData.start_z}
                  onChange={(e) => handleInputChange("start_z", e.target.value)}
                  placeholder="e.g., 100.5"
                />
              </div>

              {/* End Z */}
              <div className="space-y-2">
                <Label htmlFor="end_z">End Z (ft)</Label>
                <Input
                  id="end_z"
                  type="number"
                  step="0.01"
                  value={formData.end_z}
                  onChange={(e) => handleInputChange("end_z", e.target.value)}
                  placeholder="e.g., 85.3"
                />
              </div>

              {/* Embedment */}
              <div className="space-y-2">
                <Label htmlFor="embedment">Embedment (ft)</Label>
                <Input
                  id="embedment"
                  type="number"
                  step="0.01"
                  value={formData.embedment}
                  onChange={(e) => handleInputChange("embedment", e.target.value)}
                  placeholder="Auto-calculated if Start/End Z provided"
                />
              </div>

              {/* Design Embedment */}
              <div className="space-y-2">
                <Label htmlFor="design_embedment">Design Embedment (ft)</Label>
                <Input
                  id="design_embedment"
                  type="number"
                  step="0.01"
                  value={formData.design_embedment}
                  onChange={(e) => handleInputChange("design_embedment", e.target.value)}
                  placeholder="e.g., 15.0"
                />
              </div>

              {/* Gain per 30 seconds */}
              <div className="space-y-2">
                <Label htmlFor="gain_per_30_seconds">Gain/30 sec</Label>
                <Input
                  id="gain_per_30_seconds"
                  type="number"
                  step="0.01"
                  value={formData.gain_per_30_seconds}
                  onChange={(e) => handleInputChange("gain_per_30_seconds", e.target.value)}
                  placeholder="e.g., 2.5"
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Additional Information</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about this pile..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
