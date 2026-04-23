import { useSimulationStore } from '../../store/useSimulationStore';
import { AircraftLibrary } from '../../store/library';
import type { EntityType } from '../../models/types';

export function PlacementToolbar() {
  const placementMode = useSimulationStore(state => state.placementMode);
  const setPlacementMode = useSimulationStore(state => state.setPlacementMode);
  const selectedAircraftType = useSimulationStore(state => state.selectedAircraftType);
  const setSelectedAircraftType = useSimulationStore(state => state.setSelectedAircraftType);
  const selectedBaseType = useSimulationStore(state => state.selectedBaseType);
  const setSelectedBaseType = useSimulationStore(state => state.setSelectedBaseType);

  const toggleMode = (mode: EntityType) => {
    setPlacementMode(placementMode === mode ? null : mode);
  };

  const aircraftTypes = Object.keys(AircraftLibrary);
  const baseTypes: Array<'large_airbase' | 'small_airfield'> = ['large_airbase', 'small_airfield'];
  const troopTypes = ['Infantry Squad', 'Armor Platoon', 'SAM Site'];

  return (
    <div className="absolute top-4 right-16 flex flex-col space-y-2 pointer-events-auto z-10">
      <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1 text-right">Deploy Entity</h3>
      {(['base', 'aircraft', 'troop', 'city'] as EntityType[]).map((mode) => (
        <div key={mode} className="flex flex-col space-y-1">
          <button
            onClick={() => toggleMode(mode)}
            className={`px-4 py-2 rounded shadow transition-colors border text-sm capitalize ${
              placementMode === mode 
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] font-bold' 
                : 'bg-gray-800/80 border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {mode}
          </button>

          {/* Aircraft type selector */}
          {placementMode === mode && mode === 'aircraft' && (
            <select
              value={selectedAircraftType}
              onChange={(e) => setSelectedAircraftType(e.target.value)}
              className="px-2 py-1 rounded bg-gray-700 border border-blue-500 text-gray-200 text-xs focus:outline-none focus:border-blue-400"
            >
              {aircraftTypes.map((type) => (
                <option key={type} value={type} className="bg-gray-800">
                  {type}
                </option>
              ))}
            </select>
          )}

          {/* Base type selector */}
          {placementMode === mode && mode === 'base' && (
            <select
              value={selectedBaseType}
              onChange={(e) => setSelectedBaseType(e.target.value as 'large_airbase' | 'small_airfield')}
              className="px-2 py-1 rounded bg-gray-700 border border-blue-500 text-gray-200 text-xs focus:outline-none focus:border-blue-400"
            >
              {baseTypes.map((type) => (
                <option key={type} value={type} className="bg-gray-800">
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          )}

          {/* Troop type selector */}
          {placementMode === mode && mode === 'troop' && (
            <select
              defaultValue={troopTypes[0]}
              className="px-2 py-1 rounded bg-gray-700 border border-blue-500 text-gray-200 text-xs focus:outline-none focus:border-blue-400"
            >
              {troopTypes.map((type) => (
                <option key={type} value={type} className="bg-gray-800">
                  {type}
                </option>
              ))}
            </select>
          )}

          {/* City type selector (no selection needed, just one type) */}
          {placementMode === mode && mode === 'city' && (
            <div className="px-2 py-1 rounded bg-gray-700 border border-blue-500 text-gray-200 text-xs">
              Standard City
            </div>
          )}
        </div>
      ))}
      
      {placementMode && (
        <div className="mt-2 p-2 bg-blue-900/50 border border-blue-500 rounded text-xs text-blue-200 text-right animate-pulse">
          Click map to place
        </div>
      )}
    </div>
  );
}
