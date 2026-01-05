"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAccountType } from "@/context/AccountTypeContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { PileHeatmap, HeatmapPile, PileStatus } from "@/components/PileHeatmap";
import {
  convertStatePlaneToLatLng,
  detectStatePlaneZone,
  getCoordinatesCenter,
  getCoordinateSystemName,
  LatLng,
} from "@/lib/coordinateService";
import { adminService } from "@/lib/adminService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Map,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Loader2,
  Settings,
  X,
} from "lucide-react";

// =====================================================
// Types
// =====================================================

interface ProjectData {
  id: string;
  project_name: string;
  project_location: string;
  location_lat: number | null;
  location_lng: number | null;
  coordinate_system: string | null;
  embedment_tolerance: number;
}

interface PileData {
  id: string;
  pile_number: string;
  embedment: number | null;
  design_embedment: number | null;
  pile_type: string | null;
  block: string | null;
  published: boolean;
  installation_date: string | null;
  northing: number | null;
  easting: number | null;
}

interface FilterState {
  statuses: PileStatus[];
  block: string | null;
  pileType: string | null;
}

// =====================================================
// Helper Functions
// =====================================================

function classifyPileStatus(
  embedment: number | null,
  designEmbedment: number | null,
  tolerance: number
): PileStatus {
  if (embedment === null || designEmbedment === null) return "pending";
  if (embedment >= designEmbedment) return "accepted";
  if (embedment >= designEmbedment - tolerance) return "tolerance";
  return "refusal";
}

// =====================================================
// Loading Component
// =====================================================

function HeatmapPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto mb-2" />
        <p className="text-slate-600 dark:text-slate-400">Loading heatmap...</p>
      </div>
    </div>
  );
}

// =====================================================
// Filter Panel Component
// =====================================================

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  blocks: string[];
  pileTypes: string[];
  onReset: () => void;
}

function FilterPanel({ filters, onFiltersChange, blocks, pileTypes, onReset }: FilterPanelProps) {
  const allStatuses: PileStatus[] = ["accepted", "tolerance", "refusal", "pending"];

  const toggleStatus = (status: PileStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const statusConfig: Record<PileStatus, { label: string; color: string; icon: React.ReactNode }> = {
    accepted: { label: "Accepted", color: "bg-green-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    tolerance: { label: "Tolerance", color: "bg-indigo-500", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    refusal: { label: "Refusal", color: "bg-amber-500", icon: <AlertCircle className="w-3.5 h-3.5" /> },
    pending: { label: "Pending", color: "bg-gray-400", icon: <Clock className="w-3.5 h-3.5" /> },
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">Filters</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Status filters */}
      <div className="space-y-2">
        <Label className="text-xs text-slate-500">Status</Label>
        <div className="flex flex-wrap gap-2">
          {allStatuses.map((status) => {
            const config = statusConfig[status];
            const isActive = filters.statuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${config.color}`} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Block filter */}
      {blocks.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Block</Label>
          <Select
            value={filters.block || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, block: value === "all" ? null : value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Blocks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Blocks</SelectItem>
              {blocks.map((block) => (
                <SelectItem key={block} value={block}>
                  {block}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Pile Type filter */}
      {pileTypes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Pile Type</Label>
          <Select
            value={filters.pileType || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, pileType: value === "all" ? null : value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {pileTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Stats Card Component
// =====================================================

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Main Page Content
// =====================================================

function HeatmapPageContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { canEdit } = useAccountType();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [heatmapPiles, setHeatmapPiles] = useState<HeatmapPile[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [coordinateSystem, setCoordinateSystem] = useState<string | null>(null);
  const [isAdminViewing, setIsAdminViewing] = useState(false);
  const [noCoordinatesWarning, setNoCoordinatesWarning] = useState(false);
  const [totalPilesLoaded, setTotalPilesLoaded] = useState(0);
  const [pilesWithCoords, setPilesWithCoords] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    statuses: ["accepted", "tolerance", "refusal", "pending"],
    block: null,
    pileType: null,
  });

  // Extract unique blocks and pile types for filters
  const { blocks, pileTypes } = useMemo(() => {
    const blockSet = new Set<string>();
    const typeSet = new Set<string>();
    heatmapPiles.forEach((pile) => {
      if (pile.block) blockSet.add(pile.block);
      if (pile.pile_type) typeSet.add(pile.pile_type);
    });
    return {
      blocks: Array.from(blockSet).sort(),
      pileTypes: Array.from(typeSet).sort(),
    };
  }, [heatmapPiles]);

  // Filtered piles
  const filteredPiles = useMemo(() => {
    return heatmapPiles.filter((pile) => {
      if (!filters.statuses.includes(pile.status)) return false;
      if (filters.block && pile.block !== filters.block) return false;
      if (filters.pileType && pile.pile_type !== filters.pileType) return false;
      return true;
    });
  }, [heatmapPiles, filters]);

  // Stats
  const stats = useMemo(() => {
    const counts = { accepted: 0, tolerance: 0, refusal: 0, pending: 0 };
    filteredPiles.forEach((pile) => counts[pile.status]++);
    return counts;
  }, [filteredPiles]);

  // Reset filters
  const resetFilters = () => {
    setFilters({
      statuses: ["accepted", "tolerance", "refusal", "pending"],
      block: null,
      pileType: null,
    });
  };

  // Load data function (extracted for refresh capability)
  const loadData = useCallback(async (showRefreshToast = false) => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth");
      return;
    }

    try {
      if (showRefreshToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Check for super admin override
      const overrideProjectId = localStorage.getItem("selectedProjectId");
      let project: ProjectData | null = null;
      let pilesData: PileData[] = [];

      if (overrideProjectId) {
        // Super admin viewing
        setIsAdminViewing(true);

        try {
          const adminData = await adminService.getProjectData(overrideProjectId);
          project = adminData.project as ProjectData;

          // Fetch all piles via admin API
          const { count: totalCount } = await adminService.getPileCount(overrideProjectId);
          const pageSize = 1000;
          const totalPages = Math.ceil(totalCount / pageSize);

          for (let page = 0; page < totalPages; page++) {
            const { piles } = await adminService.getPiles(overrideProjectId, page, pageSize);
            pilesData = [...pilesData, ...piles];
          }
        } catch (adminError) {
          console.error("Admin API error:", adminError);
          toast.error("Failed to load project data");
          setIsLoading(false);
          return;
        }
      } else {
        // Normal user flow
        setIsAdminViewing(false);

        const { data: userProjectData } = await supabase
          .from("user_projects")
          .select("project_id")
          .eq("user_id", user.id)
          .single();

        if (!userProjectData) {
          toast.error("No project found");
          router.push("/project-setup");
          return;
        }

        const { data: projectResult } = await supabase
          .from("projects")
          .select("*")
          .eq("id", userProjectData.project_id)
          .single();

        project = projectResult as ProjectData;

        // Fetch all piles in batches (Supabase default limit is 1000)
        const pageSize = 1000;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          let pileQuery = supabase
            .from("piles")
            .select("*")
            .eq("project_id", project.id)
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (!canEdit) {
            pileQuery = pileQuery.eq("published", true);
          }

          const { data: pileResult } = await pileQuery;

          if (pileResult && pileResult.length > 0) {
            pilesData = [...pilesData, ...pileResult];
            hasMore = pileResult.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        }

        console.log(`Fetched ${pilesData.length} total piles in ${page} batches`);
      }

      if (!project) {
        toast.error("Project not found");
        setIsLoading(false);
        return;
      }

      setProjectData(project);

      // Determine coordinate system
      let epsgCode = project.coordinate_system;
      if (!epsgCode && project.location_lat && project.location_lng) {
        epsgCode = detectStatePlaneZone(project.location_lat, project.location_lng);
      }
      setCoordinateSystem(epsgCode);

      if (!epsgCode) {
        toast.error("Could not determine coordinate system. Please configure in Settings.");
        setIsLoading(false);
        return;
      }

      // Track total piles loaded
      setTotalPilesLoaded(pilesData.length);

      // Filter piles with valid coordinates (northing/easting from CSV upload)
      const pilesHavingCoords = pilesData.filter(
        (p) => p.northing !== null && p.easting !== null
      );

      // Track piles with coordinates
      setPilesWithCoords(pilesHavingCoords.length);
      console.log(`Total piles: ${pilesData.length}, With coordinates: ${pilesHavingCoords.length}`);

      if (pilesHavingCoords.length === 0) {
        setNoCoordinatesWarning(true);
        toast.error("No pile coordinates found. Upload CSV with Northing/Easting columns.");
        setIsLoading(false);
        return;
      }

      // Convert coordinates and build heatmap data
      const tolerance = project.embedment_tolerance || 1;
      const convertedPiles: HeatmapPile[] = [];
      const validCoords: LatLng[] = [];

      for (const pile of pilesHavingCoords) {
        const coords = convertStatePlaneToLatLng(
          pile.easting!,
          pile.northing!,
          epsgCode
        );

        if (!coords) continue;

        validCoords.push(coords);

        // Determine status from pile data
        const status = classifyPileStatus(pile.embedment, pile.design_embedment, tolerance);

        convertedPiles.push({
          id: pile.id,
          pile_tag: pile.pile_number,
          lat: coords.lat,
          lng: coords.lng,
          status,
          actual_embedment: pile.embedment,
          design_embedment: pile.design_embedment,
          block: pile.block,
          pile_type: pile.pile_type,
          installation_date: pile.installation_date,
        });
      }

      setHeatmapPiles(convertedPiles);

      // Log status breakdown for verification
      const statusBreakdown = convertedPiles.reduce((acc, pile) => {
        acc[pile.status] = (acc[pile.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`Heatmap Status Breakdown:`, statusBreakdown);
      console.log(`  Accepted: ${statusBreakdown.accepted || 0}`);
      console.log(`  Tolerance: ${statusBreakdown.tolerance || 0}`);
      console.log(`  Refusal: ${statusBreakdown.refusal || 0}`);
      console.log(`  Pending: ${statusBreakdown.pending || 0}`);
      console.log(`  Total on map: ${convertedPiles.length}`);

      // Calculate center
      const center = getCoordinatesCenter(validCoords);
      if (center) {
        setMapCenter(center);
      } else if (project.location_lat && project.location_lng) {
        setMapCenter({ lat: project.location_lat, lng: project.location_lng });
      }

      console.log(`Loaded ${convertedPiles.length} piles with coordinates`);
    } catch (error) {
      console.error("Error loading heatmap data:", error);
      toast.error("Failed to load heatmap data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      if (showRefreshToast) {
        toast.success("Heatmap data refreshed");
      }
    }
  }, [user, authLoading, canEdit, router]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mapbox token
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  if (isLoading) {
    return <HeatmapPageLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Pile Heatmap</h1>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <CollapsibleSidebar currentPage="heatmap" />

        {/* Main Content */}
        <main className="flex-1 lg:ml-16">
          <div className="p-4 lg:p-6">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                    Pile Heatmap
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    3D visualization of pile status across the project site
                    {coordinateSystem && (
                      <span className="ml-2 text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                        {getCoordinateSystemName(coordinateSystem)}
                      </span>
                    )}
                    {totalPilesLoaded > 0 && (
                      <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                        Showing {pilesWithCoords.toLocaleString()} of {totalPilesLoaded.toLocaleString()} piles
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="h-8"
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                  {isAdminViewing && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                      Admin View
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatsCard
                title="Accepted"
                value={stats.accepted}
                icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                color="bg-green-100 dark:bg-green-900/30"
              />
              <StatsCard
                title="Tolerance"
                value={stats.tolerance}
                icon={<AlertTriangle className="w-4 h-4 text-indigo-600" />}
                color="bg-indigo-100 dark:bg-indigo-900/30"
              />
              <StatsCard
                title="Refusal"
                value={stats.refusal}
                icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
                color="bg-amber-100 dark:bg-amber-900/30"
              />
              <StatsCard
                title="Pending"
                value={stats.pending}
                icon={<Clock className="w-4 h-4 text-gray-600" />}
                color="bg-gray-100 dark:bg-gray-800"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Filter Panel */}
              <div className="lg:col-span-1">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  blocks={blocks}
                  pileTypes={pileTypes}
                  onReset={resetFilters}
                />

                {/* Coordinate System Info */}
                {!coordinateSystem && (
                  <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Settings className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          Coordinate System Not Set
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                          Configure in Settings → Configuration for accurate pile positioning.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {noCoordinatesWarning && (
                  <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-medium text-red-800 dark:text-red-200">
                          No Coordinates Found
                        </p>
                        <p className="text-red-700 dark:text-red-300 mt-1">
                          Upload CSV with Northing/Easting columns via My Piles.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Map */}
              <div className="lg:col-span-3">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardContent className="p-0">
                    <div className="h-[500px] lg:h-[600px]">
                      {mapCenter && filteredPiles.length > 0 ? (
                        <PileHeatmap
                          piles={filteredPiles}
                          center={mapCenter}
                          mapboxToken={mapboxToken}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <div className="text-center p-8">
                            <Map className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-600 dark:text-slate-300 mb-2">
                              {noCoordinatesWarning
                                ? "No pile coordinates available"
                                : filteredPiles.length === 0
                                ? "No piles match the current filters"
                                : "Unable to display map"}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {noCoordinatesWarning
                                ? "Upload CSV with Northing/Easting columns via My Piles"
                                : filteredPiles.length === 0
                                ? "Try adjusting your filters"
                                : "Check your configuration"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =====================================================
// Main Export
// =====================================================

export default function HeatmapPage() {
  return (
    <Suspense fallback={<HeatmapPageLoading />}>
      <HeatmapPageContent />
    </Suspense>
  );
}
