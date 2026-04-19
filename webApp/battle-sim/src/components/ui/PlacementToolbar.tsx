import { useSimulationStore } from '../../store/useSimulationStore';
import type { EntityType } from '../../models/types';

export function PlacementToolbar() {
  const placementMode = useSimulationStore(state => state.placementMode);
  const setPlacementMode = useSimulationStore(state => state.setPlacementMode);

  const toggleMode = (mode: EntityType) => {
    setPlacementMode(placementMode === mode ? null : mode);
  };

  return (
    <div className="absolute top-4 right-16 flex flex-col space-y-2 pointer-events-auto z-10">
      <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 text-right">Deploy Entity</h3>
      {(['base', 'aircraft', 'troop', 'city'] as EntityType[]).map((mode) => (
        <button
          key={mode}
          onClick={() => toggleMode(mode)}
          className={`px-4 py-2 rounded shadow transition-colors border text-sm capitalize ${
            placementMode === mode 
              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] font-bold' 
              : 'bg-gray-800/80 border-gray-600 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {mode}
        </button>
      ))}
      
      {placementMode && (
        <div className="mt-2 p-2 bg-blue-900/50 border border-blue-500 rounded text-xs text-blue-200 text-right animate-pulse">
          Click map to place
        </div>
      )}
    </div>
  );
}
