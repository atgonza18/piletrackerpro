"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  project_name: string;
  project_location: string;
}

interface ProjectSelectorProps {
  onProjectSelect: (projectId: string) => void;
}

export function ProjectSelector({ onProjectSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Select onValueChange={onProjectSelect} disabled={loading}>
      <SelectTrigger className="w-full h-11 border-slate-200 bg-white text-black focus:border-blue-500 focus:ring-blue-500">
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
        {projects.length === 0 && !loading ? (
          <div className="p-3 text-center text-gray-500 text-sm">
            No projects available
          </div>
        ) : (
          projects.map((project) => (
            <SelectItem 
              key={project.id} 
              value={project.id}
              className="cursor-pointer text-black hover:bg-blue-50 focus:bg-blue-50 focus:text-black"
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
  );
} 