"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Project {
  id: string;
  project_name: string;
  project_location: string;
}

interface ProjectSelectorProps {
  onProjectSelect: (projectId: string) => void;
  onNewProjectCreated?: (projectId: string) => void;
}

export function ProjectSelector({ onProjectSelect, onNewProjectCreated }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    location: "",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('id, project_name, project_location')
          .order('project_name', { ascending: true });

        if (error) throw error;
        
        if (data) {
          console.log('Fetched projects:', data);
          setProjects(data);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    // Reset form errors
    setFormErrors({});
    
    // Validate form
    if (!newProject.name.trim()) {
      setFormErrors(prev => ({ ...prev, name: "Project name is required" }));
      return;
    }
    
    if (!newProject.location.trim()) {
      setFormErrors(prev => ({ ...prev, location: "Project location is required" }));
      return;
    }

    try {
      setCreating(true);
      
      // Create the project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_name: newProject.name.trim(),
          name: newProject.name.trim(), // For backward compatibility with existing code
          project_location: newProject.location.trim(),
          // Set default values for required fields
          total_project_piles: 0,
          tracker_system: 'none',
          geotech_company: 'TBD',
          role: 'admin',
          // Add embedment_tolerance if it exists in the database
          embedment_tolerance: 1.0
        })
        .select()
        .single();
      
      if (projectError) {
        console.error("Error creating project:", projectError);
        console.error("Error details:", {
          message: projectError.message,
          code: projectError.code,
          details: projectError.details,
          hint: projectError.hint
        });
        toast.error(`Failed to create project: ${projectError.message || 'Unknown error'}`);
        return;
      }
      
      // Add the new project to the local projects list
      setProjects(prev => [...prev, {
        id: projectData.id,
        project_name: projectData.project_name,
        project_location: projectData.project_location
      }]);
      
      // Close modal and reset form
      setShowCreateModal(false);
      setNewProject({ name: "", location: "" });
      
      // Select the newly created project
      onProjectSelect(projectData.id);
      
      // Notify parent component if callback is provided
      if (onNewProjectCreated) {
        onNewProjectCreated(projectData.id);
      }
      
      toast.success("Project created successfully!");
    } catch (error) {
      console.error("Unexpected error creating project:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleSelectChange = (value: string) => {
    if (value === "__CREATE_NEW__") {
      setShowCreateModal(true);
    } else {
      onProjectSelect(value);
    }
  };

  return (
    <>
      <Select onValueChange={handleSelectChange} disabled={loading}>
        <SelectTrigger className="w-full h-11 border-slate-200 bg-white text-black focus:border-slate-500 focus:ring-slate-500">
          <SelectValue 
            placeholder={loading ? "Loading projects..." : "Select a project"} 
            className="text-black placeholder:text-gray-600"
          />
        </SelectTrigger>
        <SelectContent 
          className="bg-white border-slate-200 max-h-[200px] overflow-y-auto"
          position="popper"
          sideOffset={4}
          align="start"
        >
          {/* Create New Project Option */}
          <SelectItem 
            value="__CREATE_NEW__"
            className="cursor-pointer text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-600 border-b border-slate-100"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Create New Project</span>
            </div>
          </SelectItem>
          
          {/* Existing Projects */}
          {projects.length === 0 && !loading ? (
            <div className="p-3 text-center text-gray-500 text-sm">
              No existing projects
            </div>
          ) : (
            projects.map((project) => (
              <SelectItem 
                key={project.id} 
                value={project.id}
                className="cursor-pointer text-black hover:bg-slate-100 focus:bg-slate-100 focus:text-black"
              >
                <div>
                  <div className="font-medium text-black">{project.project_name}</div>
                  <div className="text-xs text-gray-600">{project.project_location}</div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Create New Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">Create New Project</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-medium text-slate-700">
                Project Name
              </Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                className={`h-11 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-slate-900 placeholder:text-slate-400 ${
                  formErrors.name ? "border-red-500" : ""
                }`}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-location" className="text-sm font-medium text-slate-700">
                Project Location
              </Label>
              <Input
                id="project-location"
                placeholder="Enter project location"
                value={newProject.location}
                onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                className={`h-11 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-slate-900 placeholder:text-slate-400 ${
                  formErrors.location ? "border-red-500" : ""
                }`}
              />
              {formErrors.location && (
                <p className="text-xs text-red-500">{formErrors.location}</p>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setNewProject({ name: "", location: "" });
                setFormErrors({});
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={creating}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
            >
              {creating ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </div>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 