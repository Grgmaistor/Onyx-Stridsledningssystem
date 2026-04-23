import { useSimulationStore } from '../../store/useSimulationStore';
import type { Aircraft } from '../../models/types';
import type { MutableRefObject } from 'react';

const MISSION_BADGE: Record<string, { label: string; cls: string }> = {
  idle:     { label: 'IDLE',     cls: 'bg-gray-700 text-gray-300' },
  patrol:   { label: 'PATROL',   cls: 'bg-yellow-700 text-yellow-100' },
  support:  { label: 'SUPPORT',  cls: 'bg-blue-700 text-blue-100' },
  attack:   { label: 'ATTACK',   cls: 'bg-red-700 text-red-100' },
  resupply: { label: 'RESUPPLY', cls: 'bg-green-700 text-green-100' },
  retreat:  { label: 'RETREAT',  cls: 'bg-orange-700 text-orange-100' },
  battle:   { label: '⚔ BATTLE', cls: 'bg-rose-700 text-rose-100 animate-pulse' },
};

interface TacticalPopupProps {
  pos: { x: number; y: number };
  workerRef: MutableRefObject<Worker | null>;
}

export function TacticalPopup({ pos, workerRef }: TacticalPopupProps) {
  const entities        = useSimulationStore(state => state.entities);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);
  const selectEntity    = useSimulationStore(state => state.selectEntity);
  const deleteEntity    = useSimulationStore(state => state.deleteEntity);
  const selectedEntity  = selectedEntityId ? entities[selectedEntityId] : null;

  if (!selectedEntity || !pos) return null;

  const isAircraft = selectedEntity.type === 'aircraft';
  const ac = isAircraft ? selectedEntity as Aircraft : null;
  const missionBadge = ac ? (MISSION_BADGE[ac.mission] ?? MISSION_BADGE['idle']) : null;
  const fuelPct = ac ? ((ac.fuel / ac.specs.maxFuel) * 100) : 0;
  const hpPct   = (selectedEntity.health / selectedEntity.maxHealth) * 100;

  const sendMission = (mission: string) => {
    if (!ac) return;
    workerRef.current?.postMessage({ type: 'UPDATE_MISSION', payload: { id: ac.id, mission } });
  };

  const handleDelete = () => {
    if (!selectedEntityId) return;
    deleteEntity(selectedEntityId);
    selectEntity(null);
  };

  const affiliationClass = selectedEntity.affiliation === 'friendly'
    ? 'bg-blue-900/40 border-blue-700'
    : selectedEntity.affiliation === 'enemy'
      ? 'bg-red-900/40 border-red-700'
      : 'bg-emerald-900/40 border-emerald-700';

  return (
    <div
      className="absolute z-20 transition-transform duration-75 pointer-events-auto"
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(15px, 15px)' }}
    >
      <div className="bg-[#0f172a]/95 backdrop-blur-md border border-gray-600 rounded shadow-xl text-white w-64 text-sm font-sans overflow-hidden">

        {/* Header */}
        <div className={`px-3 py-2 border-b flex justify-between items-center ${affiliationClass}`}>
          <h2 className="font-bold tracking-wide text-sm truncate">
            {ac ? `${ac.specs.model} · ${ac.name}` : selectedEntity.name}
          </h2>
          <button onClick={() => selectEntity(null)} className="text-gray-400 hover:text-white ml-2 flex-shrink-0">✕</button>
        </div>

        <div className="p-3 space-y-2.5">
          {/* ── Aircraft view ── */}
          {ac ? (
            <>
              {/* Mission badge */}
              {missionBadge && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Mission</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${missionBadge.cls}`}>
                    {missionBadge.label}
                  </span>
                </div>
              )}

              {/* Flight data */}
              <div className="text-gray-300 text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Heading</span>
                  <span>{ac.heading.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Altitude</span>
                  <span>{ac.altitude.toLocaleString()} ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">SOG</span>
                  <span>{ac.sog.toFixed(0)} kn</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Flight time</span>
                  <span>{ac.flightTime || '--:--:--'}</span>
                </div>
              </div>

              {/* Fuel bar */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Fuel</span>
                  <span>{fuelPct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 border border-gray-700">
                  <div
                    className={`h-1.5 rounded-full transition-all ${fuelPct > 30 ? 'bg-cyan-500' : fuelPct > 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${fuelPct}%` }}
                  />
                </div>
              </div>

              {/* HP bar */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>HP</span>
                  <span>{ac.health} / {ac.maxHealth}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 border border-gray-700">
                  <div
                    className={`h-1.5 rounded-full transition-all ${hpPct > 50 ? 'bg-blue-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>

              {/* Weapons */}
              {ac.weapons?.length > 0 && (
                <div className="pt-1 border-t border-gray-700 text-xs">
                  <p className="text-gray-500 mb-1">Weapon systems</p>
                  <ul className="text-gray-300 list-disc list-inside">
                    {ac.weapons.map((w, i) => <li key={i}>{w.count}× {w.name}</li>)}
                  </ul>
                </div>
              )}

              {/* Quick commands (only friendly) */}
              {selectedEntity.affiliation === 'friendly' && ac.status !== 'destroyed' && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-[10px] text-gray-500 mb-1.5">Quick command</p>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: 'ATTACK',   m: 'attack',   cls: 'border-red-800 hover:bg-red-900/60 text-red-300' },
                      { label: 'SUPPORT',  m: 'support',  cls: 'border-blue-800 hover:bg-blue-900/60 text-blue-300' },
                      { label: 'RETREAT',  m: 'retreat',  cls: 'border-orange-800 hover:bg-orange-900/60 text-orange-300' },
                    ].map(({ label, m, cls }) => (
                      <button
                        key={m}
                        onClick={() => sendMission(m)}
                        className={`py-1 text-[10px] font-bold rounded border bg-transparent transition-colors ${cls} ${ac.mission === m ? 'opacity-50 cursor-default' : ''}`}
                        disabled={ac.mission === m}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {ac.status === 'destroyed' && (
                <p className="text-center text-red-400 text-xs font-bold tracking-widest pt-1">
                  ✕ DESTROYED
                </p>
              )}
            </>
          ) : (
            /* ── Non-aircraft view ── */
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Health</span>
                  <span>{selectedEntity.health} / {selectedEntity.maxHealth}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden border border-gray-700">
                  <div
                    className={`h-1.5 rounded-full ${selectedEntity.affiliation === 'friendly' ? 'bg-blue-500' : selectedEntity.affiliation === 'enemy' ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-300 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="capitalize">{selectedEntity.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Position</span>
                  <span>{selectedEntity.position.lat.toFixed(4)}, {selectedEntity.position.lng.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delete button (always available) */}
          <div className="pt-2 border-t border-gray-700">
            <button
              onClick={handleDelete}
              className="w-full py-1.5 px-2 text-xs font-bold bg-red-900/60 border border-red-700 text-red-300 rounded hover:bg-red-900/80 transition-colors"
            >
              🗑 DELETE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
