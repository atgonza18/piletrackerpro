"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Map, { NavigationControl, ScaleControl, MapRef } from "react-map-gl/mapbox";
import DeckGL from "@deck.gl/react";
import { MapViewState } from "@deck.gl/core";
import { ColumnLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import Supercluster from "supercluster";
import {
  X,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  Box,
  PanelTop,
  Compass,
  Maximize,
  Minimize,
  Camera,
  Mountain,
  Palette,
  Focus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import "mapbox-gl/dist/mapbox-gl.css";

// =====================================================
// Types
// =====================================================

export type PileStatus = "accepted" | "tolerance" | "refusal" | "pending";

export interface HeatmapPile {
  id: string;
  pile_tag: string;
  lat: number;
  lng: number;
  status: PileStatus;
  actual_embedment: number | null;
  design_embedment: number | null;
  block: string | null;
  pile_type: string | null;
  installation_date: string | null;
}

interface PileHeatmapProps {
  piles: HeatmapPile[];
  center: { lat: number; lng: number };
  onPileSelect?: (pile: HeatmapPile | null) => void;
  mapboxToken: string;
}

interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string | number;
  pile?: HeatmapPile;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: ClusterProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

// =====================================================
// Constants
// =====================================================

const MAP_STYLES = {
  satellite: {
    url: "mapbox://styles/mapbox/satellite-streets-v12",
    label: "Satellite",
  },
  streets: {
    url: "mapbox://styles/mapbox/streets-v12",
    label: "Streets",
  },
  dark: {
    url: "mapbox://styles/mapbox/dark-v11",
    label: "Dark",
  },
  light: {
    url: "mapbox://styles/mapbox/light-v11",
    label: "Light",
  },
  outdoors: {
    url: "mapbox://styles/mapbox/outdoors-v12",
    label: "Outdoors",
  },
};

type MapStyleKey = keyof typeof MAP_STYLES;

const STATUS_COLORS: Record<PileStatus, [number, number, number, number]> = {
  accepted: [16, 185, 129, 220],
  tolerance: [99, 102, 241, 220],
  refusal: [245, 158, 11, 220],
  pending: [156, 163, 175, 180],
};

const STATUS_LABELS: Record<PileStatus, string> = {
  accepted: "Accepted",
  tolerance: "Tolerance",
  refusal: "Refusal",
  pending: "Pending",
};

const CLUSTER_COLOR: [number, number, number, number] = [100, 116, 139, 220];
const CLUSTER_ZOOM_THRESHOLD = 15;

// =====================================================
// Helper Functions
// =====================================================

function getElevation(pile: HeatmapPile): number {
  const statusHeights: Record<PileStatus, number> = {
    refusal: 60,
    tolerance: 40,
    pending: 25,
    accepted: 15,
  };
  return statusHeights[pile.status];
}

// =====================================================
// Hover Tooltip Component
// =====================================================

interface HoverTooltipProps {
  pile: HeatmapPile;
  x: number;
  y: number;
}

function HoverTooltip({ pile, x, y }: HoverTooltipProps) {
  const statusColor = {
    accepted: "bg-green-500",
    tolerance: "bg-indigo-500",
    refusal: "bg-amber-500",
    pending: "bg-gray-400",
  }[pile.status];

  return (
    <div
      className="absolute z-30 pointer-events-none bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-w-[200px]"
      style={{
        left: x + 10,
        top: y + 10,
        transform: "translateY(-50%)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("w-2.5 h-2.5 rounded-full", statusColor)} />
        <span className="font-semibold text-slate-900 dark:text-white text-sm">
          {pile.pile_tag}
        </span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-400">Status</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {STATUS_LABELS[pile.status]}
          </span>
        </div>
        {pile.actual_embedment !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Embedment</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {pile.actual_embedment.toFixed(2)} ft
            </span>
          </div>
        )}
        {pile.block && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Block</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{pile.block}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Cluster Tooltip Component
// =====================================================

interface ClusterTooltipProps {
  count: number;
  x: number;
  y: number;
}

function ClusterTooltip({ count, x, y }: ClusterTooltipProps) {
  return (
    <div
      className="absolute z-30 pointer-events-none bg-slate-700 dark:bg-slate-600 rounded-lg shadow-xl px-3 py-2"
      style={{
        left: x + 10,
        top: y + 10,
        transform: "translateY(-50%)",
      }}
    >
      <span className="text-white text-sm font-medium">{count} piles</span>
    </div>
  );
}

// =====================================================
// Popup Component
// =====================================================

interface PilePopupProps {
  pile: HeatmapPile;
  onClose: () => void;
  onFlyTo: () => void;
}

function PilePopup({ pile, onClose, onFlyTo }: PilePopupProps) {
  const statusColor = {
    accepted: "bg-green-500",
    tolerance: "bg-indigo-500",
    refusal: "bg-amber-500",
    pending: "bg-gray-400",
  }[pile.status];

  return (
    <div className="absolute top-4 right-4 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 min-w-[280px] max-w-[320px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{pile.pile_tag}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("w-3 h-3 rounded-full", statusColor)} />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {STATUS_LABELS[pile.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onFlyTo}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Fly to pile"
          >
            <Focus className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Actual Embedment</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {pile.actual_embedment ? `${pile.actual_embedment.toFixed(2)} ft` : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Design Embedment</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {pile.design_embedment ? `${pile.design_embedment.toFixed(2)} ft` : "—"}
          </span>
        </div>
        {pile.block && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Block</span>
            <span className="font-medium text-slate-900 dark:text-white">{pile.block}</span>
          </div>
        )}
        {pile.pile_type && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Pile Type</span>
            <span className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
              {pile.pile_type}
            </span>
          </div>
        )}
        {pile.installation_date && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Installed</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {new Date(pile.installation_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Legend Component
// =====================================================

interface LegendProps {
  counts: Record<PileStatus, number>;
  showClusters: boolean;
}

function Legend({ counts, showClusters }: LegendProps) {
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Legend</span>
      </div>
      <div className="space-y-1.5">
        {(Object.entries(STATUS_COLORS) as [PileStatus, [number, number, number, number]][]).map(
          ([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)` }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                ({counts[status]})
              </span>
            </div>
          )
        )}
        {showClusters && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700 mt-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: `rgba(${CLUSTER_COLOR[0]}, ${CLUSTER_COLOR[1]}, ${CLUSTER_COLOR[2]}, 1)`,
              }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">Cluster</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export function PileHeatmap({ piles, center, onPileSelect, mapboxToken }: PileHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any>(null);
  const mapRef = useRef<MapRef>(null);

  const [selectedPile, setSelectedPile] = useState<HeatmapPile | null>(null);
  const [hoveredPile, setHoveredPile] = useState<HeatmapPile | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<{ count: number; x: number; y: number } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");
  const [terrainEnabled, setTerrainEnabled] = useState(false); // Disabled by default to avoid conflicts
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: center.lng,
    latitude: center.lat,
    zoom: 16,
    pitch: 45,
    bearing: 0,
  });

  // Supercluster instance for clustering
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: CLUSTER_ZOOM_THRESHOLD,
    });

    const features: GeoJSONFeature[] = piles.map((pile) => ({
      type: "Feature",
      properties: { cluster: false, pile },
      geometry: {
        type: "Point",
        coordinates: [pile.lng, pile.lat],
      },
    }));

    cluster.load(features);
    return cluster;
  }, [piles]);

  // Get clusters or individual points based on zoom level
  const clustersAndPiles = useMemo(() => {
    const bounds: [number, number, number, number] = [-180, -85, 180, 85];
    const zoom = Math.floor(viewState.zoom);

    if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
      return { clusters: [], showIndividualPiles: true };
    }

    const clusters = supercluster.getClusters(bounds, zoom);
    return { clusters, showIndividualPiles: false };
  }, [supercluster, viewState.zoom]);

  // Calculate status counts for legend
  const statusCounts = useMemo(() => {
    const counts: Record<PileStatus, number> = {
      accepted: 0,
      tolerance: 0,
      refusal: 0,
      pending: 0,
    };
    piles.forEach((pile) => {
      counts[pile.status]++;
    });
    return counts;
  }, [piles]);

  // Handle pile click
  const handlePileClick = useCallback(
    (info: { object?: HeatmapPile }) => {
      const pile = info.object || null;
      setSelectedPile(pile);
      onPileSelect?.(pile);
    },
    [onPileSelect]
  );

  // Handle cluster click - zoom in
  const handleClusterClick = useCallback(
    (info: { object?: GeoJSONFeature }) => {
      if (!info.object) return;

      const feature = info.object;
      if (feature.properties.cluster && feature.properties.cluster_id !== undefined) {
        const expansionZoom = Math.min(
          supercluster.getClusterExpansionZoom(feature.properties.cluster_id),
          20
        );
        const [lng, lat] = feature.geometry.coordinates;

        setViewState((prev) => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          zoom: expansionZoom,
        }));
      } else if (feature.properties.pile) {
        setSelectedPile(feature.properties.pile);
        onPileSelect?.(feature.properties.pile);
      }
    },
    [supercluster, onPileSelect]
  );

  // Handle hover
  const handleHover = useCallback(
    (info: { object?: HeatmapPile; x?: number; y?: number }) => {
      if (info.object && info.x !== undefined && info.y !== undefined) {
        setHoveredPile(info.object);
        setHoverPosition({ x: info.x, y: info.y });
        setHoveredCluster(null);
      } else {
        setHoveredPile(null);
      }
    },
    []
  );

  // Handle cluster hover
  const handleClusterHover = useCallback(
    (info: { object?: GeoJSONFeature; x?: number; y?: number }) => {
      if (info.object && info.x !== undefined && info.y !== undefined) {
        const feature = info.object;
        if (feature.properties.cluster && feature.properties.point_count) {
          setHoveredCluster({
            count: feature.properties.point_count,
            x: info.x,
            y: info.y,
          });
          setHoveredPile(null);
        } else if (feature.properties.pile) {
          setHoveredPile(feature.properties.pile);
          setHoverPosition({ x: info.x, y: info.y });
          setHoveredCluster(null);
        }
      } else {
        setHoveredCluster(null);
        setHoveredPile(null);
      }
    },
    []
  );

  // Create deck.gl layers
  const layers = useMemo(() => {
    const layersList: any[] = [];

    if (clustersAndPiles.showIndividualPiles) {
      layersList.push(
        new ColumnLayer<HeatmapPile>({
          id: "pile-columns",
          data: piles,
          getPosition: (d) => [d.lng, d.lat],
          getElevation: (d) => getElevation(d),
          getFillColor: (d) => STATUS_COLORS[d.status],
          radius: 1.5,
          elevationScale: 1,
          pickable: true,
          onClick: handlePileClick,
          onHover: handleHover,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 150],
          material: {
            ambient: 0.4,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [60, 64, 70],
          },
          updateTriggers: {
            getFillColor: [piles],
            getElevation: [piles],
          },
        })
      );
    } else {
      const clusterData = clustersAndPiles.clusters;

      layersList.push(
        new ScatterplotLayer<GeoJSONFeature>({
          id: "clusters",
          data: clusterData.filter((d) => d.properties.cluster),
          getPosition: (d) => d.geometry.coordinates as [number, number],
          getRadius: (d) => Math.min(100, 20 + (d.properties.point_count || 0) * 0.5),
          getFillColor: CLUSTER_COLOR,
          pickable: true,
          onClick: handleClusterClick,
          onHover: handleClusterHover,
          radiusUnits: "meters",
          radiusMinPixels: 20,
          radiusMaxPixels: 50,
        })
      );

      layersList.push(
        new TextLayer<GeoJSONFeature>({
          id: "cluster-labels",
          data: clusterData.filter((d) => d.properties.cluster),
          getPosition: (d) => d.geometry.coordinates as [number, number],
          getText: (d) => String(d.properties.point_count_abbreviated || d.properties.point_count),
          getSize: 14,
          getColor: [255, 255, 255],
          getTextAnchor: "middle",
          getAlignmentBaseline: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: "bold",
        })
      );

      const individualPoints = clusterData.filter((d) => !d.properties.cluster);
      if (individualPoints.length > 0) {
        layersList.push(
          new ScatterplotLayer<GeoJSONFeature>({
            id: "individual-points",
            data: individualPoints,
            getPosition: (d) => d.geometry.coordinates as [number, number],
            getRadius: 8,
            getFillColor: (d) =>
              d.properties.pile ? STATUS_COLORS[d.properties.pile.status] : CLUSTER_COLOR,
            pickable: true,
            onClick: handleClusterClick,
            onHover: handleClusterHover,
            radiusUnits: "meters",
            radiusMinPixels: 6,
            radiusMaxPixels: 12,
          })
        );
      }
    }

    return layersList;
  }, [
    piles,
    clustersAndPiles,
    handlePileClick,
    handleHover,
    handleClusterClick,
    handleClusterHover,
  ]);

  // Single view state change handler
  const onViewStateChange = useCallback(({ viewState: newViewState }: { viewState: MapViewState }) => {
    setViewState(newViewState);
  }, []);

  // Fly to specific pile
  const flyToPile = useCallback((pile: HeatmapPile) => {
    setViewState((prev) => ({
      ...prev,
      longitude: pile.lng,
      latitude: pile.lat,
      zoom: 19,
      pitch: 60,
    }));
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setViewState({
      longitude: center.lng,
      latitude: center.lat,
      zoom: 16,
      pitch: 45,
      bearing: 0,
    });
  }, [center]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewState((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 1, 22) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewState((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 1, 10) }));
  }, []);

  // Camera preset views
  const setTopDownView = useCallback(() => {
    setViewState((prev) => ({ ...prev, pitch: 0, bearing: 0 }));
  }, []);

  const set3DView = useCallback(() => {
    setViewState((prev) => ({ ...prev, pitch: 45, bearing: 0 }));
  }, []);

  const setElevationView = useCallback(() => {
    setViewState((prev) => ({ ...prev, pitch: 75, bearing: 0 }));
  }, []);

  const rotateBearing = useCallback(() => {
    setViewState((prev) => ({ ...prev, bearing: (prev.bearing + 45) % 360 }));
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      toast.error("Fullscreen not supported");
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Screenshot export
  const takeScreenshot = useCallback(() => {
    try {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) {
        toast.error("Could not capture screenshot");
        return;
      }

      const link = document.createElement("a");
      link.download = `pile-heatmap-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Screenshot saved");
    } catch (err) {
      console.error("Screenshot error:", err);
      toast.error("Failed to save screenshot");
    }
  }, []);

  // Toggle terrain
  const toggleTerrain = useCallback(() => {
    setTerrainEnabled((prev) => !prev);
  }, []);

  // Handle map style change - need to reapply terrain/fog
  const handleStyleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Add fog/atmosphere
    map.setFog({
      color: "rgb(186, 210, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.02,
      "space-color": "rgb(11, 11, 25)",
      "star-intensity": 0.6,
    });

    // Apply terrain if enabled
    if (terrainEnabled) {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    }
  }, [terrainEnabled]);

  // Update terrain when toggle changes
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    if (terrainEnabled) {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    } else {
      map.setTerrain(null);
    }
  }, [terrainEnabled]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="text-center p-8">
          <p className="text-slate-600 dark:text-slate-300 mb-2">Mapbox token not configured</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full rounded-lg overflow-hidden",
        isFullscreen && "rounded-none"
      )}
    >
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={{
          doubleClickZoom: true,
          scrollZoom: true,
          touchZoom: true,
          touchRotate: true,
          keyboard: true,
          dragPan: true,
          dragRotate: true,
          inertia: true,
        }}
        layers={layers}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? "grabbing" : isHovering ? "pointer" : "grab"
        }
        useDevicePixels={true}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          mapStyle={MAP_STYLES[mapStyle].url}
          reuseMaps
          attributionControl={false}
          onLoad={handleStyleLoad}
          projection={{ name: "mercator" }}
        >
          <NavigationControl position="top-left" showCompass showZoom={false} />
          <ScaleControl position="bottom-right" unit="imperial" />
        </Map>
      </DeckGL>

      {/* Hover tooltip for piles */}
      {hoveredPile && !selectedPile && (
        <HoverTooltip pile={hoveredPile} x={hoverPosition.x} y={hoverPosition.y} />
      )}

      {/* Hover tooltip for clusters */}
      {hoveredCluster && (
        <ClusterTooltip count={hoveredCluster.count} x={hoveredCluster.x} y={hoveredCluster.y} />
      )}

      {/* Control buttons - Left side */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
          onClick={zoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
          onClick={zoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8 mt-1"
          onClick={resetView}
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Camera view presets */}
      <div className="absolute top-4 left-14 z-10 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
          onClick={setTopDownView}
          title="Top-down view (2D)"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
          onClick={set3DView}
          title="3D view (45°)"
        >
          <Box className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
          onClick={setElevationView}
          title="Elevation view (75°)"
        >
          <PanelTop className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8 mt-1"
          onClick={rotateBearing}
          title="Rotate 45°"
        >
          <Compass className="h-4 w-4" />
        </Button>
      </div>

      {/* Extra controls - Right side */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
        {/* Map style dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
              title="Map style"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.entries(MAP_STYLES) as [MapStyleKey, { url: string; label: string }][]).map(
              ([key, { label }]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setMapStyle(key)}
                  className={cn(mapStyle === key && "bg-slate-100 dark:bg-slate-800")}
                >
                  {label}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Terrain toggle */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8",
            terrainEnabled && "bg-blue-100 dark:bg-blue-900/50 border-blue-300"
          )}
          onClick={toggleTerrain}
          title={terrainEnabled ? "Disable 3D terrain" : "Enable 3D terrain"}
        >
          <Mountain className="h-4 w-4" />
        </Button>

        {/* Fullscreen toggle */}
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>

        {/* Screenshot */}
        <Button
          variant="outline"
          size="icon"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm h-8 w-8 mt-1"
          onClick={takeScreenshot}
          title="Save screenshot"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <Legend counts={statusCounts} showClusters={!clustersAndPiles.showIndividualPiles} />

      {/* Selected pile popup */}
      {selectedPile && (
        <PilePopup
          pile={selectedPile}
          onClose={() => setSelectedPile(null)}
          onFlyTo={() => flyToPile(selectedPile)}
        />
      )}
    </div>
  );
}
