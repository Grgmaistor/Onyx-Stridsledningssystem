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

  const entities = useSimulationStore(state => state.entities);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);
  const selectEntity = useSimulationStore(state => state.selectEntity);

  const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

  const geojson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: Object.values(entities).map(e => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.position.lng, e.position.lat] },
        properties: { ...e }
      }))
    };
  }, [entities]);

  const waypointsGeojson = useMemo(() => {
    const features: any[] = [];
    Object.values(entities).forEach(e => {
      if (e.type === 'aircraft' && (e as Aircraft).waypoint) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [e.position.lng, e.position.lat],
              [(e as Aircraft).waypoint!.lng, (e as Aircraft).waypoint!.lat]
            ]
          },
          properties: { id: e.id, affiliation: e.affiliation }
        });
      }
    });
    return { type: 'FeatureCollection', features };
  }, [entities]);

  useEffect(() => {
    if (!map.current || !selectedEntity) {
      setPopupPos(null);
      return;
    }

    const updatePos = () => {
      if (!map.current) return;
      const pos = map.current.project([selectedEntity.position.lng, selectedEntity.position.lat]);
      setPopupPos({ x: pos.x, y: pos.y });
    };

    updatePos();

    map.current.on('move', updatePos);
    map.current.on('zoom', updatePos);
    map.current.on('pitch', updatePos);

    return () => {
      map.current?.off('move', updatePos);
      map.current?.off('zoom', updatePos);
      map.current?.off('pitch', updatePos);
    };
  }, [selectedEntity, setPopupPos]);

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

      map.current.addSource('entities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'entities-layer',
        type: 'circle',
        source: 'entities',
        paint: {
          'circle-radius': [
            'match', ['get', 'type'],
            'city', 12,
            'base', 10,
            'aircraft', 8,
            8
          ],
          'circle-color': [
            'match', ['get', 'affiliation'],
            'friendly', '#3b82f6',
            'enemy', '#ef4444',
            '#10b981'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      map.current.addSource('waypoints', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.current.addLayer({
        id: 'waypoints-layer',
        type: 'line',
        source: 'waypoints',
        paint: {
          'line-color': [
            'match', ['get', 'affiliation'],
            'friendly', '#3b82f6',
            'enemy', '#ef4444',
            '#10b981'
          ],
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.5
        }
      });

      map.current.addLayer({
        id: 'entities-layer-selected',
        type: 'circle',
        source: 'entities',
        filter: ['==', 'id', ''],
        paint: {
          'circle-radius': 16,
          'circle-color': 'transparent',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fbbf24'
        }
      });

      map.current.on('click', 'entities-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        selectEntity(feature.properties.id);
      });

      map.current.on('mouseenter', 'entities-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'entities-layer', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
      
      map.current.on('click', (e) => {
        const state = useSimulationStore.getState();
        
        // Placement Mode Logic
        if (state.placementMode) {
          const newId = `${state.placementMode}-${Date.now()}`;
          const newEntity: any = {
            id: newId,
            type: state.placementMode,
            affiliation: 'friendly', // Default
            position: { lng: e.lngLat.lng, lat: e.lngLat.lat },
            name: `New ${state.placementMode}`,
            health: 100,
            maxHealth: 100
          };
          
          if (state.placementMode === 'base') {
            newEntity.baseType = 'small_airfield';
            newEntity.fuelReserves = 50000;
            newEntity.weaponReserves = 100;
            newEntity.maxAircraft = 4;
            newEntity.parkedAircraftIds = [];
          } else if (state.placementMode === 'aircraft') {
            const specs = AircraftLibrary['Jas 39E Gripen'];
            newEntity.specs = specs;
            newEntity.status = 'idle';
            newEntity.heading = 0;
            newEntity.altitude = 0;
            newEntity.velocity = 0;
            newEntity.sog = 0;
            newEntity.fuel = specs.maxFuel;
            newEntity.weapons = [];
            newEntity.personnel = 1;
            newEntity.name = `Squadron-${Math.floor(Math.random() * 100)}`;
          }

          state.addEntity(newEntity);
          workerRef.current?.postMessage({ type: 'ADD_ENTITY', payload: newEntity });
          state.setPlacementMode(null); // Reset after placing
          return; // Skip normal selection
        }

        // Selection Logic
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['entities-layer'] });
        if (!features || features.length === 0) {
          selectEntity(null);
        }
      });

      map.current.on('contextmenu', (e) => {
        const state = useSimulationStore.getState();
        if (state.selectedEntityId) {
          workerRef.current?.postMessage({
            type: 'UPDATE_WAYPOINT',
            payload: { id: state.selectedEntityId, lng: e.lngLat.lng, lat: e.lngLat.lat }
          });
        }
      });

      map.current.on('mousemove', (e) => {
        setMousePos({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [selectEntity, setMousePos, workerRef]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('entities') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson as any);
    }
    const wpSource = map.current.getSource('waypoints') as maplibregl.GeoJSONSource;
    if (wpSource) {
      wpSource.setData(waypointsGeojson as any);
    }
  }, [geojson, waypointsGeojson, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.setFilter('entities-layer-selected', ['==', 'id', selectedEntityId || '']);
  }, [selectedEntityId, mapLoaded]);

  useEffect(() => {
    if (selectedEntity && map.current) {
      const bounds = map.current.getBounds();
      if (!bounds.contains([selectedEntity.position.lng, selectedEntity.position.lat])) {
        map.current.panTo([selectedEntity.position.lng, selectedEntity.position.lat]);
      }
    }
  }, [selectedEntity?.position.lng, selectedEntity?.position.lat]);

  return <div ref={mapContainer} className="absolute inset-0 h-full" />;
}
