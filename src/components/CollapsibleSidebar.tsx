"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BarChart3, List, MapPin, Box, FileText, Settings, User, BookOpen, Activity, Shield, ChevronDown, Building2, Map } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAccountType } from "@/context/AccountTypeContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { supabase } from "@/lib/supabase";

interface NavItem {
  name: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
}

interface CollapsibleSidebarProps {
  projectName?: string;
  currentPage: string;
}

interface ProjectOption {
  id: string;
  project_name: string;
}

export function CollapsibleSidebar({ projectName = "PileTrackerPro", currentPage }: CollapsibleSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const { canEdit } = useAccountType();
  const { signOut, user } = useAuth();

  // Check if user is super admin and load all projects
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) return;
      try {
        const result = await adminService.checkSuperAdmin();
        setIsSuperAdmin(result.isSuperAdmin);

        if (result.isSuperAdmin) {
          // Load all projects for super admin
          const { data: projects } = await supabase
            .from('projects')
            .select('id, project_name')
            .order('project_name');

          if (projects) {
            setAllProjects(projects);
          }

          // Check if there's a selected project in localStorage
          const storedProjectId = localStorage.getItem('selectedProjectId');
          if (storedProjectId) {
            setSelectedProjectId(storedProjectId);
          }
        }
      } catch {
        // Not a super admin or error - just don't show admin link
        setIsSuperAdmin(false);
      }
    };
    checkSuperAdmin();
  }, [user]);

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    localStorage.setItem('selectedProjectId', projectId);
    setSelectedProjectId(projectId);
    setShowProjectDropdown(false);
    const project = allProjects.find(p => p.id === projectId);
    toast.success(`Switched to: ${project?.project_name}`);
    window.location.reload();
  };

  // Clear project selection (go back to user's own project)
  const handleClearProjectSelection = () => {
    localStorage.removeItem('selectedProjectId');
    setSelectedProjectId(null);
    setShowProjectDropdown(false);
    toast.success('Switched back to your project');
    window.location.reload();
  };

  // Update CSS variable when sidebar expands/collapses
  useEffect(() => {
    const sidebarWidth = isExpanded ? '224px' : '64px'; // w-56 = 224px, w-16 = 64px
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  }, [isExpanded]);

  // Close dropdown when clicking outside or when sidebar collapses
  useEffect(() => {
    if (!isExpanded) {
      setShowProjectDropdown(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showProjectDropdown) {
        setShowProjectDropdown(false);
      }
    };
    if (showProjectDropdown) {
      // Delay to prevent immediate close on the button click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProjectDropdown]);

  const handleNavigation = (path: string) => {
    router.push(path as any);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const mainNavItems: NavItem[] = [
    { name: 'Dashboard', icon: BarChart3, href: '/dashboard', active: currentPage === 'dashboard' },
    { name: 'My Piles', icon: List, href: '/my-piles', active: currentPage === 'my-piles' },
    { name: 'Production', icon: Activity, href: '/production', active: currentPage === 'production' },
    { name: 'Pile Types', icon: MapPin, href: '/zones', active: currentPage === 'zones' },
    { name: 'Blocks', icon: Box, href: '/blocks', active: currentPage === 'blocks' },
    { name: 'Heatmap', icon: Map, href: '/heatmap', active: currentPage === 'heatmap' },
    { name: 'Notes', icon: FileText, href: '/notes', active: currentPage === 'notes' },
    { name: 'SOP', icon: BookOpen, href: '/sop', active: currentPage === 'sop' },
  ];

  const settingsNavItems: NavItem[] = canEdit ? [
    { name: 'Settings', icon: Settings, href: '/settings', active: currentPage === 'settings' },
    { name: 'Account', icon: User, href: '/settings', active: false },
  ] : [];

  // Admin nav item for super admins only
  const adminNavItem: NavItem | null = isSuperAdmin ? {
    name: 'Admin',
    icon: Shield,
    href: '/admin',
    active: currentPage === 'admin'
  } : null;

  return (
    <div
      className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col z-10 transition-all duration-300 ease-in-out overflow-visible ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-700 min-h-14 flex flex-col justify-center overflow-visible">
        <div className="flex items-center gap-2 min-w-max">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            PT
          </div>
          <h1
            className={`text-base font-bold text-slate-900 dark:text-white truncate transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            {selectedProjectId ? allProjects.find(p => p.id === selectedProjectId)?.project_name || projectName : projectName}
          </h1>
        </div>

        {/* Super Admin Project Selector */}
        {isSuperAdmin && isExpanded && allProjects.length > 0 && (
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowProjectDropdown(!showProjectDropdown);
              }}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Building2 size={12} />
                <span className="truncate">
                  {selectedProjectId
                    ? allProjects.find(p => p.id === selectedProjectId)?.project_name || 'Select Project'
                    : 'All Projects'}
                </span>
              </div>
              <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Project Dropdown - Rendered outside header to avoid clipping */}
      {isSuperAdmin && showProjectDropdown && allProjects.length > 0 && (
        <div
          className="fixed left-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-[9999] max-h-64 overflow-y-auto w-52"
          style={{ top: '90px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedProjectId && (
            <button
              onClick={handleClearProjectSelection}
              className="w-full px-3 py-2.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-medium"
            >
              ← Back to My Project
            </button>
          )}
          {allProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project.id)}
              className={`w-full px-3 py-2.5 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 truncate ${
                selectedProjectId === project.id
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 font-medium'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {project.project_name}
            </button>
          ))}
        </div>
      )}

      {/* Main Navigation */}
      <nav className="p-2 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`flex items-center gap-2 w-full px-2 py-2 text-sm rounded-lg transition-all ${
                item.active
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              } ${!isExpanded ? 'justify-center' : ''}`}
              title={!isExpanded ? item.name : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span
                className={`transition-all duration-300 whitespace-nowrap ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                {item.name}
              </span>
            </button>
          ))}
        </div>

        {/* Admin Section - Super Admins Only */}
        {adminNavItem && (
          <div className="mt-4 pt-2 border-t border-amber-200 dark:border-amber-800 space-y-1">
            <button
              onClick={() => handleNavigation(adminNavItem.href)}
              className={`flex items-center gap-2 w-full px-2 py-2 text-sm rounded-lg transition-all ${
                adminNavItem.active
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 font-medium'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              } ${!isExpanded ? 'justify-center' : ''}`}
              title={!isExpanded ? adminNavItem.name : undefined}
            >
              <adminNavItem.icon size={18} className="flex-shrink-0" />
              <span
                className={`transition-all duration-300 whitespace-nowrap ${
                  isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                {adminNavItem.name}
              </span>
            </button>
          </div>
        )}

        {/* Settings Section */}
        {settingsNavItems.length > 0 && (
          <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
            {settingsNavItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex items-center gap-2 w-full px-2 py-2 text-sm rounded-lg transition-all ${
                  item.active
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100 font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                } ${!isExpanded ? 'justify-center' : ''}`}
                title={!isExpanded ? item.name : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span
                  className={`transition-all duration-300 whitespace-nowrap ${
                    isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
                  }`}
                >
                  {item.name}
                </span>
              </button>
            ))}

            {/* Dark mode toggle */}
            <div className={`flex items-center gap-2 px-2 py-2 ${!isExpanded ? 'justify-center' : 'justify-between'}`}>
              {isExpanded && (
                <span className="text-xs text-slate-600 dark:text-slate-300 transition-opacity duration-300">
                  Theme
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="mt-auto pt-2">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full px-2 py-2 text-sm rounded-lg transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${
              !isExpanded ? 'justify-center' : ''
            }`}
            title={!isExpanded ? 'Log Out' : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span
              className={`transition-all duration-300 whitespace-nowrap ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'
              }`}
            >
              Log Out
            </span>
          </button>

          {/* Creator Credit */}
          <div
            className={`px-2 py-2 text-center transition-all duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Created by Aaron Gonzalez
            </p>
          </div>
        </div>
      </nav>
    </div>
  );
}
