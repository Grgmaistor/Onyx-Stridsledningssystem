import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from './store/useSimulationStore';
import EngineWorker from './simulation/engine.worker?worker';

import { SimulationMap } from './components/map/SimulationMap';
import { TacticalPopup } from './components/ui/TacticalPopup';
import { StatusBar } from './components/ui/StatusBar';
import { ObjectivesPanel } from './components/ui/ObjectivesPanel';
import { TimelineBar } from './components/ui/TimelineBar';
import { SensorData } from './components/ui/SensorData';
import { PlacementToolbar } from './components/ui/PlacementToolbar';

function App() {
  const [popupPos, setPopupPos] = useState<{ x: number, y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ lng: number, lat: number } | null>(null);

  const setAllEntities = useSimulationStore(state => state.setAllEntities);
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

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden font-sans">
      {/* Background Map Layer */}
      <SimulationMap 
        setPopupPos={setPopupPos} 
        setMousePos={setMousePos} 
        workerRef={workerRef} 
      />
      
      {/* UI Overlays */}
      <ObjectivesPanel workerRef={workerRef} />
      
      <SensorData />
      
      <PlacementToolbar />
      
      <TimelineBar />

      <StatusBar mousePos={mousePos} />

      <TacticalPopup pos={popupPos!} workerRef={workerRef} />
    </div>
  );
}

export default App;