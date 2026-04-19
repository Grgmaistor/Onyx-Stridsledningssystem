import { useRef, useEffect } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { Aircraft } from '../../models/types';
import type { MutableRefObject } from 'react';

interface CommsPanelProps {
  workerRef: MutableRefObject<Worker | null>;
}

const MISSION_META: Record<string, { label: string; color: string; border: string; bg: string; reply: string }> = {
  PATROL:   { label: 'PATROL',   color: 'text-yellow-200',  border: 'border-yellow-600', bg: 'bg-yellow-900/50 hover:bg-yellow-800/60',  reply: 'Copy. Entering patrol draw mode — mark waypoints on the map.' },
  SUPPORT:  { label: 'SUPPORT',  color: 'text-blue-200',    border: 'border-blue-600',   bg: 'bg-blue-900/50 hover:bg-blue-800/60',      reply: 'Copy. Moving to support position on nearest friendly.' },
  ATTACK:   { label: 'ATTACK',   color: 'text-red-200',     border: 'border-red-700',    bg: 'bg-red-900/50 hover:bg-red-800/60',        reply: 'Weapons free. Engaging nearest hostile!' },
  RESUPPLY: { label: 'RESUPPLY', color: 'text-green-200',   border: 'border-green-700',  bg: 'bg-green-900/50 hover:bg-green-800/60',    reply: 'RTB for resupply. See you on the other side.' },
  RETREAT:  { label: 'RETREAT',  color: 'text-orange-200',  border: 'border-orange-600', bg: 'bg-orange-900/50 hover:bg-orange-800/60',  reply: 'Breaking off — retreating at max speed!' },
  IDLE:     { label: 'STAND BY', color: 'text-gray-300',    border: 'border-gray-600',   bg: 'bg-gray-800/50 hover:bg-gray-700/60',      reply: 'Understood. Holding position.' },
};

const MISSION_WORKER_TYPE: Record<string, string> = {
  SUPPORT: 'support', ATTACK: 'attack', RESUPPLY: 'resupply', RETREAT: 'retreat', IDLE: 'idle',
};

export function CommsPanel({ workerRef }: CommsPanelProps) {
  const entities        = useSimulationStore(state => state.entities);
  const chatHistory     = useSimulationStore(state => state.chatHistory);
  const addChatMessage  = useSimulationStore(state => state.addChatMessage);
  const selectEntity    = useSimulationStore(state => state.selectEntity);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);
  const drawingMode     = useSimulationStore(state => state.drawingMode);
  const currentDrawPath = useSimulationStore(state => state.currentDrawPath);
  const drawPathCount   = currentDrawPath.length;
  const drawingAircraftId = useSimulationStore(state => state.drawingAircraftId);
  const cancelDrawing   = useSimulationStore(state => state.cancelDrawing);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const friendlyAircraft = Object.values(entities).filter(
    e => e.type === 'aircraft' && e.affiliation === 'friendly'
  ) as Aircraft[];

  const activeAircraft = (
    selectedEntityId &&
    entities[selectedEntityId]?.type === 'aircraft' &&
    entities[selectedEntityId]?.affiliation === 'friendly'
  ) ? entities[selectedEntityId] as Aircraft : null;

  const messages = activeAircraft ? (chatHistory[activeAircraft.id] || []) : [];

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── command dispatcher ──────────────────────────────────────────────────
  const handleCommand = (command: string) => {
    if (!activeAircraft) return;
    const meta = MISSION_META[command];

    addChatMessage(activeAircraft.id, {
      id: Date.now().toString(),
      sender: 'user',
      text: command,
      timestamp: new Date().toLocaleTimeString(),
    });

    setTimeout(() => {
      addChatMessage(activeAircraft.id, {
        id: (Date.now() + 1).toString(),
        sender: 'pilot',
        text: meta.reply,
        timestamp: new Date().toLocaleTimeString(),
      });
    }, 900);

    if (command === 'PATROL') {
      useSimulationStore.getState().startDrawing(activeAircraft.id);
      return;
    }

    const missionType = MISSION_WORKER_TYPE[command];
    if (missionType) {
      workerRef.current?.postMessage({
        type: 'UPDATE_MISSION',
        payload: { id: activeAircraft.id, mission: missionType }
      });
    }
  };

  // ── mission badge colour ────────────────────────────────────────────────
  const missionColor = (m: string) => {
    switch (m) {
      case 'patrol':   return 'bg-yellow-700 text-yellow-100';
      case 'support':  return 'bg-blue-700 text-blue-100';
      case 'attack':   return 'bg-red-700 text-red-100';
      case 'resupply': return 'bg-green-700 text-green-100';
      case 'retreat':  return 'bg-orange-700 text-orange-100';
      case 'battle':   return 'bg-rose-700 text-rose-100 animate-pulse';
      default:         return 'bg-gray-700 text-gray-300';
    }
  };

  // ── draw-mode active (for a different aircraft) ─────────────────────────
  if (drawingMode === 'patrol' && drawingAircraftId !== activeAircraft?.id) {
    return (
      <div className="p-4 flex flex-col gap-3 h-full items-center justify-center text-center">
        <div className="text-yellow-400 text-2xl">✏️</div>
        <p className="text-yellow-300 text-sm font-bold">Patrol draw in progress</p>
        <p className="text-gray-400 text-xs">Click the map to place waypoints.<br />Right-click to confirm the route.</p>
        <button
          onClick={() => cancelDrawing()}
          className="mt-3 px-4 py-1.5 bg-gray-800 border border-gray-600 text-gray-300 rounded text-xs hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── no aircraft selected: show roster ──────────────────────────────────
  if (!activeAircraft) {
    return (
      <div className="p-4 h-full flex flex-col">
        <h3 className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wider">Active Squadrons</h3>
        <div className="space-y-2 overflow-y-auto">
          {friendlyAircraft.map(ac => (
            <div
              key={ac.id}
              onClick={() => selectEntity(ac.id)}
              className="p-3 bg-gray-800/40 hover:bg-gray-700/50 rounded cursor-pointer border border-gray-700/50 transition-colors"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-blue-300">{ac.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${missionColor(ac.mission)}`}>
                  {ac.mission.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                {chatHistory[ac.id]?.length
                  ? chatHistory[ac.id][chatHistory[ac.id].length - 1].text
                  : 'No messages yet.'}
              </p>
              <div className="mt-1 flex gap-2 text-[10px] text-gray-500">
                <span>Fuel {((ac.fuel / ac.specs.maxFuel) * 100).toFixed(0)}%</span>
                <span>HP {ac.health}/{ac.maxHealth}</span>
              </div>
            </div>
          ))}
          {friendlyAircraft.length === 0 && <p className="text-sm text-gray-500">No friendly aircraft active.</p>}
        </div>
      </div>
    );
  }

  // ── active aircraft chat ───────────────────────────────────────────────
  const fuelPct = (activeAircraft.fuel / activeAircraft.specs.maxFuel) * 100;
  const hpPct   = (activeAircraft.health / activeAircraft.maxHealth) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-gray-800/80 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => selectEntity(null)} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <span className="font-bold text-sm text-blue-300">{activeAircraft.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${missionColor(activeAircraft.mission)}`}>
            {activeAircraft.mission.toUpperCase()}
          </span>
        </div>
        {/* Status bars */}
        <div className="space-y-1 text-[10px] text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-8">FUEL</span>
            <div className="flex-1 bg-gray-900 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${fuelPct > 30 ? 'bg-cyan-500' : fuelPct > 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${fuelPct}%` }}
              />
            </div>
            <span className="w-8 text-right">{fuelPct.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8">HP</span>
            <div className="flex-1 bg-gray-900 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${hpPct > 50 ? 'bg-blue-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <span className="w-8 text-right">{hpPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0f18]/60">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.sender === 'system' ? (
              <p className="text-[10px] text-gray-500 italic text-center w-full">{msg.text}</p>
            ) : (
              <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-700 text-white rounded-br-none'
                  : 'bg-gray-700 text-gray-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            )}
            <span className="text-[10px] text-gray-600 mt-0.5">{msg.timestamp}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-xs text-center text-gray-600 mt-10">Issue a command to dispatch to pilot.</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Command buttons */}
      <div className="p-3 bg-gray-800/90 border-t border-gray-700">
        {drawingMode === 'patrol' && drawingAircraftId === activeAircraft.id ? (
          <div className="text-center space-y-2">
            <p className="text-yellow-300 text-xs font-bold animate-pulse">
            ✏️ Click map to place patrol waypoints ({drawPathCount} placed)
            </p>
            <p className="text-gray-500 text-[10px]">Right-click on the map to confirm route</p>
            <button
              onClick={() => cancelDrawing()}
              className="w-full py-1.5 bg-gray-700 border border-gray-600 text-gray-300 rounded text-xs hover:bg-gray-600"
            >
              Cancel Drawing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(MISSION_META).map(([cmd, meta]) => (
              <button
                key={cmd}
                onClick={() => handleCommand(cmd)}
                disabled={activeAircraft.status === 'destroyed'}
                className={`py-2 px-1 ${meta.bg} border ${meta.border} rounded text-[11px] font-bold ${meta.color} transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {meta.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
