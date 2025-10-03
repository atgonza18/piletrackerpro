"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";

interface FieldEntryFormProps {
  projectId: string | null;
}

function FieldEntryForm({ projectId }: FieldEntryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [formData, setFormData] = useState({
    inspector_name: "",
    pile_id: "",
    pile_number: "",
    pile_location: "",
    block: "",
    pile_type: "",
    pile_size: "",
    pile_status: "Pending",
    installation_date: new Date().toISOString().split('T')[0], // Default to today
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

  // Fetch project name
  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('project_name')
          .eq('id', projectId)
          .single();

        if (data) {
          setProjectName(data.project_name);
        }
      };
      fetchProject();
    }
  }, [projectId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!projectId) {
      toast.error("Invalid QR code - no project ID found");
      return;
    }

    if (!formData.inspector_name.trim()) {
      toast.error("Inspector name is required");
      return;
    }

    if (!formData.pile_id || !formData.pile_number) {
      toast.error("Pile ID and Pile Number are required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare pile data
      const pileData: any = {
        project_id: projectId,
        inspector_name: formData.inspector_name.trim(),
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
      };

      // Auto-calculate embedment if start_z and end_z are provided but embedment is not
      if (!pileData.embedment && pileData.start_z !== null && pileData.end_z !== null) {
        pileData.embedment = pileData.start_z - pileData.end_z;
      }

      // Insert pile into database
      const { data, error } = await supabase
        .from('piles')
        .insert([pileData])
        .select();

      if (error) {
        console.error("Error inserting pile:", error);
        toast.error(`Failed to create pile: ${error.message}`);
        return;
      }

      toast.success(`Pile created successfully by ${formData.inspector_name}!`);

      // Reset form but keep inspector name and installation date
      const inspectorName = formData.inspector_name;
      const installationDate = formData.installation_date;

      setFormData({
        inspector_name: inspectorName, // Keep inspector name
        pile_id: "",
        pile_number: "",
        pile_location: "",
        block: "",
        pile_type: "",
        pile_size: "",
        pile_status: "Pending",
        installation_date: installationDate, // Keep date
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

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Error creating pile:", error);
      toast.error("Failed to create pile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid QR Code</CardTitle>
            <CardDescription>
              This QR code doesn't contain a valid project ID. Please scan a valid field entry QR code.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6" />
              <CardTitle>Field Pile Entry</CardTitle>
            </div>
            <CardDescription className="text-blue-100">
              {projectName || "Loading project..."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Inspector Name - Prominent at top */}
              <div className="space-y-2 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <Label htmlFor="inspector_name" className="text-base font-semibold">
                  Inspector Name *
                </Label>
                <Input
                  id="inspector_name"
                  value={formData.inspector_name}
                  onChange={(e) => handleInputChange("inspector_name", e.target.value)}
                  placeholder="Enter your full name"
                  className="text-base"
                  required
                />
              </div>

              {/* Basic Information Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pile ID */}
                  <div className="space-y-2">
                    <Label htmlFor="pile_id">Pile ID *</Label>
                    <Input
                      id="pile_id"
                      value={formData.pile_id}
                      onChange={(e) => handleInputChange("pile_id", e.target.value)}
                      placeholder="e.g., A1.005.03"
                      required
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
                      required
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      placeholder="Auto-calculated"
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
                  <div className="space-y-2 sm:col-span-2">
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isSubmitting ? "Submitting..." : "Submit Pile Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FieldEntryContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  return <FieldEntryForm projectId={projectId} />;
}

export default function FieldEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <FieldEntryContent />
    </Suspense>
  );
}
