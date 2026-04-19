import { useEffect, useRef, useState, useMemo, MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSimulationStore } from '../../store/useSimulationStore';
import { AircraftLibrary } from '../../store/library';
import type { Aircraft } from '../../models/types';

interface SimulationMapProps {
  setPopupPos: (pos: { x: number, y: number } | null) => void;
  setMousePos: (pos: { lng: number, lat: number } | null) => void;
  workerRef: MutableRefObject<Worker | null>;
}

export function SimulationMap({ setPopupPos, setMousePos, workerRef }: SimulationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const entities        = useSimulationStore(state => state.entities);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);
  const selectEntity    = useSimulationStore(state => state.selectEntity);
  const drawingMode     = useSimulationStore(state => state.drawingMode);
  const currentDrawPath = useSimulationStore(state => state.currentDrawPath);
  const appendDrawPoint = useSimulationStore(state => state.appendDrawPoint);
  const finalizeDrawPath = useSimulationStore(state => state.finalizeDrawPath);
  const drawingAircraftId = useSimulationStore(state => state.drawingAircraftId);

  const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

  // ── GeoJSON for entities ──────────────────────────────────────────────────
  const geojson = useMemo(() => ({
    type: 'FeatureCollection',
    features: Object.values(entities).map(e => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.position.lng, e.position.lat] },
      properties: { ...e, specs: undefined, patrolPath: undefined }  // strip non-serialisable
    }))
  }), [entities]);

  // ── GeoJSON for waypoint lines ────────────────────────────────────────────
  const waypointsGeojson = useMemo(() => {
    const features: any[] = [];
    Object.values(entities).forEach(e => {
      if (e.type !== 'aircraft') return;
      const ac = e as Aircraft;

      // Internal waypoint (resupply/mayday) — hidden when user waypoint is active
      if (ac.waypoint && !ac.userWaypoint) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[ac.position.lng, ac.position.lat], [ac.waypoint.lng, ac.waypoint.lat]] },
          properties: { affiliation: ac.affiliation }
        });
      }

      // Patrol path loop
      if (ac.mission === 'patrol' && ac.patrolPath && ac.patrolPath.length > 1) {
        const coords = [...ac.patrolPath.map(p => [p.lng, p.lat]), [ac.patrolPath[0].lng, ac.patrolPath[0].lat]];
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: { affiliation: ac.affiliation }
        });
      }
    });
    return { type: 'FeatureCollection', features };
  }, [entities]);

  // ── GeoJSON for user-assigned waypoints (always gold, highest visual priority) ──
  const userWaypointGeojson = useMemo(() => {
    const features: any[] = [];
    Object.values(entities).forEach(e => {
      if (e.type !== 'aircraft') return;
      const ac = e as Aircraft;
      if (!ac.userWaypoint) return;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[ac.position.lng, ac.position.lat], [ac.userWaypoint.lng, ac.userWaypoint.lat]] },
        properties: { kind: 'line' }
      });
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ac.userWaypoint.lng, ac.userWaypoint.lat] },
        properties: { kind: 'marker' }
      });
    });
    return { type: 'FeatureCollection', features };
  }, [entities]);

  // ── GeoJSON for patrol draw preview ──────────────────────────────────────
  const drawPathGeojson = useMemo(() => {
    if (currentDrawPath.length < 1) return { type: 'FeatureCollection', features: [] };
    const coords = currentDrawPath.map(p => [p.lng, p.lat]);
    const features: any[] = [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {}
      },
      ...currentDrawPath.map((p, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { index: i }
      }))
    ];
    return { type: 'FeatureCollection', features };
  }, [currentDrawPath]);

  // ── popup position tracker ────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !selectedEntity) { setPopupPos(null); return; }
    const updatePos = () => {
      if (!map.current) return;
      const pos = map.current.project([selectedEntity.position.lng, selectedEntity.position.lat]);
      setPopupPos({ x: pos.x, y: pos.y });
    };
    updatePos();
    map.current.on('move',  updatePos);
    map.current.on('pitch', updatePos);
    return () => {
      map.current?.off('move',  updatePos);
      map.current?.off('pitch', updatePos);
    };
  }, [selectedEntity, setPopupPos]);

  // ── map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [18.0686, 59.3293],
      zoom: 10,
      pitch: 0,
      attributionControl: false
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      if (!map.current) return;

      // ── entities source & layers ──
      map.current.addSource('entities', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'entities-layer', type: 'circle', source: 'entities',
        paint: {
          'circle-radius': ['match', ['get', 'type'], 'city', 12, 'base', 10, 'aircraft', 8, 8],
          'circle-color': [
            'match', ['get', 'affiliation'],
            'friendly', '#3b82f6', 'enemy', '#ef4444', '#10b981'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Destroyed aircraft — red cross overlay
      map.current.addLayer({
        id: 'entities-layer-destroyed', type: 'circle', source: 'entities',
        filter: ['==', ['get', 'status'], 'destroyed'],
        paint: {
          'circle-radius': 10,
          'circle-color': 'transparent',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ff2222',
          'circle-opacity': 0.8
        }
      });

      // ── waypoints source & layer ──
      map.current.addSource('waypoints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'waypoints-layer', type: 'line', source: 'waypoints',
        paint: {
          'line-color': ['match', ['get', 'affiliation'], 'friendly', '#3b82f6', 'enemy', '#ef4444', '#10b981'],
          'line-width': 1.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.6
        }
      });

      // ── user waypoint source & layers (gold — always on top of mission lines) ──
      map.current.addSource('user-waypoints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'user-waypoints-line', type: 'line', source: 'user-waypoints',
        filter: ['==', ['get', 'kind'], 'line'],
        paint: { 'line-color': '#fbbf24', 'line-width': 2, 'line-opacity': 0.9 }
      });
      map.current.addLayer({
        id: 'user-waypoints-marker', type: 'circle', source: 'user-waypoints',
        filter: ['==', ['get', 'kind'], 'marker'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#fbbf24',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.95
        }
      });

      // ── draw-path source & layer (patrol preview) ──
      map.current.addSource('draw-path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({
        id: 'draw-path-line', type: 'line', source: 'draw-path',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#facc15', 'line-width': 2, 'line-dasharray': [4, 3] }
      });
      map.current.addLayer({
        id: 'draw-path-points', type: 'circle', source: 'draw-path',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': '#facc15', 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' }
      });

      // ── selection ring ──
      map.current.addLayer({
        id: 'entities-layer-selected', type: 'circle', source: 'entities',
        filter: ['==', ['get', 'id'], ''],
        paint: { 'circle-radius': 16, 'circle-color': 'transparent', 'circle-stroke-width': 3, 'circle-stroke-color': '#fbbf24' }
      });

      // ── battle indicator ring ──
      map.current.addLayer({
        id: 'entities-layer-battle', type: 'circle', source: 'entities',
        filter: ['==', ['get', 'mission'], 'battle'],
        paint: {
          'circle-radius': 13,
          'circle-color': 'transparent',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ef4444',
          'circle-stroke-opacity': 0.8
        }
      });

      // ── click handlers ──
      map.current.on('click', 'entities-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const state = useSimulationStore.getState();
        if (state.drawingMode) return; // ignore entity clicks while drawing
        selectEntity(e.features[0].properties.id);
      });

      map.current.on('mouseenter', 'entities-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'entities-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      map.current.on('click', (e) => {
        const state = useSimulationStore.getState();

        // ── Patrol draw mode ──
        if (state.drawingMode === 'patrol') {
          state.appendDrawPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
          return;
        }

        // ── Placement mode ──
        if (state.placementMode) {
          const newId = `${state.placementMode}-${Date.now()}`;
          const newEntity: any = {
            id: newId, type: state.placementMode, affiliation: 'friendly',
            position: { lng: e.lngLat.lng, lat: e.lngLat.lat },
            name: `New ${state.placementMode}`, health: 100, maxHealth: 100
          };
          if (state.placementMode === 'base') {
            Object.assign(newEntity, { baseType: 'small_airfield', fuelReserves: 50000, weaponReserves: 100, maxAircraft: 4, parkedAircraftIds: [] });
          } else if (state.placementMode === 'aircraft') {
            const specs = AircraftLibrary['Jas 39E Gripen'];
            Object.assign(newEntity, {
              specs, status: 'idle', heading: 0, altitude: 0, velocity: 0, sog: 0,
              fuel: specs.maxFuel, weapons: [], personnel: 1,
              name: `Squadron-${Math.floor(Math.random() * 100)}`,
              mission: 'idle'
            });
          }
          state.addEntity(newEntity);
          workerRef.current?.postMessage({ type: 'ADD_ENTITY', payload: newEntity });
          state.setPlacementMode(null);
          return;
        }

        // ── Deselect ──
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['entities-layer'] });
        if (!features || features.length === 0) selectEntity(null);
      });

      map.current.on('contextmenu', (e) => {
        const state = useSimulationStore.getState();

        // Right-click finalises patrol path
        if (state.drawingMode === 'patrol') {
          if (state.currentDrawPath.length < 2) return; // need at least 2 points
          const path = state.finalizeDrawPath();
          if (state.drawingAircraftId) {
            workerRef.current?.postMessage({
              type: 'SET_PATROL_PATH',
              payload: { id: state.drawingAircraftId, path }
            });
          }
          return;
        }

        if (state.selectedEntityId) {
          workerRef.current?.postMessage({
            type: 'UPDATE_WAYPOINT',
            payload: { id: state.selectedEntityId, lng: e.lngLat.lng, lat: e.lngLat.lat }
          });
        }
      });

      map.current.on('mousemove', (e) => {
        setMousePos({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        // Update cursor when in drawing mode
        const state = useSimulationStore.getState();
        if (map.current) {
          map.current.getCanvas().style.cursor = state.drawingMode ? 'crosshair' : '';
        }
      });
    });

    return () => { map.current?.remove(); map.current = null; };
  }, [selectEntity, setMousePos, workerRef]);

  // ── update sources ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    (map.current.getSource('entities') as maplibregl.GeoJSONSource)?.setData(geojson as any);
    (map.current.getSource('waypoints') as maplibregl.GeoJSONSource)?.setData(waypointsGeojson as any);
    (map.current.getSource('user-waypoints') as maplibregl.GeoJSONSource)?.setData(userWaypointGeojson as any);
  }, [geojson, waypointsGeojson, userWaypointGeojson, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    (map.current.getSource('draw-path') as maplibregl.GeoJSONSource)?.setData(drawPathGeojson as any);
  }, [drawPathGeojson, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.setFilter('entities-layer-selected', ['==', ['get', 'id'], selectedEntityId || '']);
  }, [selectedEntityId, mapLoaded]);

  // Pan to keep selected entity visible
  useEffect(() => {
    if (selectedEntity && map.current) {
      const bounds = map.current.getBounds();
      if (!bounds.contains([selectedEntity.position.lng, selectedEntity.position.lat])) {
        map.current.panTo([selectedEntity.position.lng, selectedEntity.position.lat]);
      }
    }
  }, [selectedEntity?.position.lng, selectedEntity?.position.lat]);

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 h-full" />
      {/* Patrol draw mode HUD */}
      {drawingMode === 'patrol' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-yellow-900/90 border border-yellow-500 text-yellow-200 text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            <span>
              <strong>PATROL DRAW</strong> — Click to place waypoints ({currentDrawPath.length} placed).
              Right-click to <strong>confirm</strong>.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
