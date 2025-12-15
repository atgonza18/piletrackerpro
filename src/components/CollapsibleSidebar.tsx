"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BarChart3, List, MapPin, Box, FileText, Settings, User, BookOpen, Activity, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAccountType } from "@/context/AccountTypeContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";

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

export function CollapsibleSidebar({ projectName = "PileTrackerPro", currentPage }: CollapsibleSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { canEdit } = useAccountType();
  const { signOut, user } = useAuth();

  // Check if user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) return;
      try {
        const result = await adminService.checkSuperAdmin();
        setIsSuperAdmin(result.isSuperAdmin);
      } catch {
        // Not a super admin or error - just don't show admin link
        setIsSuperAdmin(false);
      }
    };
    checkSuperAdmin();
  }, [user]);

  // Update CSS variable when sidebar expands/collapses
  useEffect(() => {
    const sidebarWidth = isExpanded ? '224px' : '64px'; // w-56 = 224px, w-16 = 64px
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
  }, [isExpanded]);

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
      className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col z-10 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-700 h-14 flex items-center overflow-hidden">
        <div className="flex items-center gap-2 min-w-max">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            PT
          </div>
          <h1
            className={`text-base font-bold text-slate-900 dark:text-white truncate transition-opacity duration-300 ${
              isExpanded ? 'opacity-100' : 'opacity-0 w-0'
            }`}
          >
            {projectName}
          </h1>
        </div>
      </div>

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
