import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSimulationStore } from './store/useSimulationStore';
import type { Aircraft } from './models/types';
import EngineWorker from './simulation/engine.worker?worker';

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // States
  const [popupPos, setPopupPos] = useState<{ x: number, y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ lng: number, lat: number } | null>(null);

  const entities = useSimulationStore(state => state.entities);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);
  const selectEntity = useSimulationStore(state => state.selectEntity);
  const setAllEntities = useSimulationStore(state => state.setAllEntities);

  const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new EngineWorker();
    
    workerRef.current.postMessage({ type: 'INIT', payload: useSimulationStore.getState().entities });
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK_UPDATE') {
        setAllEntities(e.data.payload);
      }
    };
    
    workerRef.current.postMessage({ type: 'START' });
    
    return () => {
      workerRef.current?.terminate();
    };
  }, [setAllEntities]);

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

  // Update popup position when the map moves or selection changes
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

    updatePos(); // Initial calculation

    map.current.on('move', updatePos);
    map.current.on('zoom', updatePos);
    map.current.on('pitch', updatePos);

    return () => {
      map.current?.off('move', updatePos);
      map.current?.off('zoom', updatePos);
      map.current?.off('pitch', updatePos);
    };
  }, [selectedEntity]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [18.0686, 59.3293],
      zoom: 10,
      pitch: 0,
      attributionControl: false // We will move this or disable it for a cleaner UI
    });

    // Controls
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
            8 // default for troop
          ],
          'circle-color': [
            'match', ['get', 'affiliation'],
            'friendly', '#3b82f6', // blue-500
            'enemy', '#ef4444', // red-500
            '#10b981' // emerald-500 for neutral
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Selection Ring
      map.current.addLayer({
        id: 'entities-layer-selected',
        type: 'circle',
        source: 'entities',
        filter: ['==', 'id', ''],
        paint: {
          'circle-radius': 16,
          'circle-color': 'transparent',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fbbf24' // amber-400
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
      
      // Deselect when clicking on empty map
      map.current.on('click', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['entities-layer'] });
        if (!features || features.length === 0) {
          selectEntity(null);
        }
      });

      // Track mouse position
      map.current.on('mousemove', (e) => {
        setMousePos({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [selectEntity]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('entities') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson as any);
    }
  }, [geojson, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.setFilter('entities-layer-selected', ['==', 'id', selectedEntityId || '']);
  }, [selectedEntityId, mapLoaded]);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-sans">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Top Left HUD */}
      <div className="absolute top-4 left-4 p-4 bg-gray-900/90 backdrop-blur-md border border-gray-700 text-white rounded-xl shadow-2xl pointer-events-none z-10 w-72">
        <h1 className="text-xl font-bold tracking-wider uppercase text-blue-400">Battle Sim</h1>
        <p className="text-gray-400 text-sm mt-1 mb-3">Phase 3: Simulation Engine</p>
        <div className="text-xs text-gray-300">
          <p>Objectives:</p>
          <p className="italic mt-1 text-gray-400">Wait for Web Worker logic to be initialized to see aircraft move based on heading and velocity.</p>
        </div>
      </div>

      {/* Bottom Left Status Bar */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-3 pointer-events-none z-10">
        <div className="px-3 py-1.5 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-md text-xs font-mono text-gray-300 shadow">
          {mousePos ? (
            <>
              <span className="text-gray-500 mr-1">LAT</span> {mousePos.lat.toFixed(4)}° 
              <span className="text-gray-500 mx-2">|</span> 
              <span className="text-gray-500 mr-1">LNG</span> {mousePos.lng.toFixed(4)}°
            </>
          ) : (
            <span className="text-gray-500">Cursor position unknown</span>
          )}
        </div>
      </div>

      {/* Dynamic Popup anchored to entity coordinates */}
      {selectedEntity && popupPos && (
        <div 
          className="absolute z-20 transition-transform duration-75 pointer-events-auto"
          style={{ 
            left: `${popupPos.x}px`, 
            top: `${popupPos.y}px`,
            transform: 'translate(15px, 15px)' // Offset slightly from the dot
          }}
        >
          <div className="bg-[#0f172a]/95 backdrop-blur-md border border-gray-600 rounded shadow-xl text-white w-64 text-sm font-sans overflow-hidden">
            
            {/* Header */}
            <div className={`px-3 py-2 border-b flex justify-between items-center ${
              selectedEntity.affiliation === 'friendly' ? 'bg-blue-900/40 border-blue-700' : 
              selectedEntity.affiliation === 'enemy' ? 'bg-red-900/40 border-red-700' : 
              'bg-emerald-900/40 border-emerald-700'
            }`}>
              <h2 className="font-bold tracking-wide">
                {selectedEntity.type === 'aircraft' ? `${(selectedEntity as Aircraft).specs.model} - ${selectedEntity.name}` : selectedEntity.name}
              </h2>
              <button 
                onClick={() => selectEntity(null)}
                className="text-gray-400 hover:text-white"
              >✕</button>
            </div>

            {/* Content Body */}
            <div className="p-3 space-y-2">
              {selectedEntity.type === 'aircraft' ? (
                <>
                  <div className="text-gray-300 text-xs">
                    <p>Flight time: {(selectedEntity as Aircraft).flightTime || '--:--:--'}</p>
                    <p>Heading: {(selectedEntity as Aircraft).heading.toFixed(1)}° Altitude: {(selectedEntity as Aircraft).altitude} ft</p>
                    <p>SOG: {(selectedEntity as Aircraft).sog.toFixed(1)} kn Fuel: {(selectedEntity as Aircraft).fuel.toFixed(1)}%</p>
                  </div>

                  <div className="pt-2 border-t border-gray-700 text-xs">
                    <p className="text-gray-400 mb-1">Weapon systems</p>
                    {(selectedEntity as Aircraft).weapons?.length > 0 ? (
                      <ul className="text-gray-300 list-disc list-inside">
                        {(selectedEntity as Aircraft).weapons.map((w, i) => (
                          <li key={i}>{w.count} {w.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">None</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-700 text-xs text-gray-300">
                    <p className="text-gray-400 mb-1">Other</p>
                    <p>Radio Channel: {(selectedEntity as Aircraft).radioChannel || 'None'}</p>
                    <p>Status: {(selectedEntity as Aircraft).status || 'Unknown'}</p>
                  </div>
                </>
              ) : (
                // Non-aircraft standard info
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Health</span>
                      <span>{selectedEntity.health} / {selectedEntity.maxHealth}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden border border-gray-700">
                      <div 
                        className={`h-1.5 rounded-full ${selectedEntity.affiliation === 'friendly' ? 'bg-blue-500' : selectedEntity.affiliation === 'enemy' ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(selectedEntity.health / selectedEntity.maxHealth) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-300">
                    <p>Type: <span className="capitalize">{selectedEntity.type}</span></p>
                    <p>Position: {selectedEntity.position.lat.toFixed(4)}, {selectedEntity.position.lng.toFixed(4)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;