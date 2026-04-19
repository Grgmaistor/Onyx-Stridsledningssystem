import { useSimulationStore } from '../../store/useSimulationStore';
import type { Aircraft } from '../../models/types';

export function TacticalPopup({ pos }: { pos: { x: number, y: number } }) {
  const entities = useSimulationStore(state => state.entities);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);
  const selectEntity = useSimulationStore(state => state.selectEntity);
  const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;

  if (!selectedEntity || !pos) return null;

  return (
    <div 
      className="absolute z-20 transition-transform duration-75 pointer-events-auto"
      style={{ 
        left: `${pos.x}px`, 
        top: `${pos.y}px`,
        transform: 'translate(15px, 15px)'
      }}
    >
      <div className="bg-[#0f172a]/95 backdrop-blur-md border border-gray-600 rounded shadow-xl text-white w-64 text-sm font-sans overflow-hidden">
        <div className={`px-3 py-2 border-b flex justify-between items-center ${selectedEntity.affiliation === 'friendly' ? 'bg-blue-900/40 border-blue-700' :
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
  );
}
