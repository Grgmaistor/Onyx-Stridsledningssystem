import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from './store/useSimulationStore';
import { useTimelineStore } from './store/useTimelineStore';
import { EventRecorder } from './models/battleHistory';
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
  const setRecordedSession = useTimelineStore(state => state.setRecordedSession);
  
  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<EventRecorder>(new EventRecorder());
  const tickCounterRef = useRef<number>(0);

  // Initialize Web Worker and Event Recorder
  useEffect(() => {
    const initialEntities = useSimulationStore.getState().entities;
    
    // Start recording
    recorderRef.current.startSession(initialEntities);
    
    workerRef.current = new EngineWorker();
    
    workerRef.current.postMessage({ type: 'INIT', payload: initialEntities });
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK_UPDATE') {
        tickCounterRef.current++;
        const entities = e.data.payload;
        
        // Record this tick
        recorderRef.current.recordTick(tickCounterRef.current, entities);
        
        // Update UI
        setAllEntities(entities);
      }
    };
    
    workerRef.current.postMessage({ type: 'START' });
    
    return () => {
      // End session on unmount
      const session = recorderRef.current.endSession(tickCounterRef.current);
      if (session) {
        setRecordedSession(session);
      }
      workerRef.current?.terminate();
    };
  }, [setAllEntities, setRecordedSession]);

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