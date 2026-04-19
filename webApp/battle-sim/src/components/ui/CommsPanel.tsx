import { useSimulationStore } from '../../store/useSimulationStore';
import type { Aircraft } from '../../models/types';

export function CommsPanel() {
  const entities = useSimulationStore(state => state.entities);
  const chatHistory = useSimulationStore(state => state.chatHistory);
  const addChatMessage = useSimulationStore(state => state.addChatMessage);
  const selectEntity = useSimulationStore(state => state.selectEntity);
  const selectedEntityId = useSimulationStore(state => state.selectedEntityId);

  const friendlyAircraft = Object.values(entities).filter(
    e => e.type === 'aircraft' && e.affiliation === 'friendly'
  ) as Aircraft[];

  const activeAircraft = (selectedEntityId && entities[selectedEntityId]?.type === 'aircraft' && entities[selectedEntityId]?.affiliation === 'friendly') 
    ? entities[selectedEntityId] as Aircraft 
    : null;

  const messages = activeAircraft ? (chatHistory[activeAircraft.id] || []) : [];

  const handleCommand = (command: string) => {
    if (!activeAircraft) return;
    
    addChatMessage(activeAircraft.id, {
      id: Date.now().toString(),
      sender: 'user',
      text: command,
      timestamp: new Date().toLocaleTimeString()
    });

    setTimeout(() => {
      let reply = 'Copy that.';
      if (command === 'ABORT') reply = 'Understood, aborting mission. RTB.';
      if (command === 'ATTACK') reply = 'Engaging primary target!';
      if (command === 'SUPPORT') reply = 'Moving to support position.';

      addChatMessage(activeAircraft.id, {
        id: (Date.now() + 1).toString(),
        sender: 'pilot',
        text: reply,
        timestamp: new Date().toLocaleTimeString()
      });
    }, 1500);
  };

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
                <span className="text-xs text-gray-500">{ac.status}</span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                {chatHistory[ac.id]?.length ? chatHistory[ac.id][chatHistory[ac.id].length-1].text : 'No messages yet.'}
              </p>
            </div>
          ))}
          {friendlyAircraft.length === 0 && <p className="text-sm text-gray-500">No friendly aircraft active.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-gray-800/80 border-b border-gray-700 flex items-center justify-between">
        <button onClick={() => selectEntity(null)} className="text-gray-400 hover:text-white">←</button>
        <span className="font-bold text-sm text-blue-300">{activeAircraft.name}</span>
        <span className="text-xs px-2 py-1 bg-gray-900 rounded-full text-gray-400">{activeAircraft.status}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0f18]/50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-700 text-gray-200 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-500 mt-1">{msg.timestamp}</span>
          </div>
        ))}
        {messages.length === 0 && <p className="text-xs text-center text-gray-600 mt-10">Select a command to dispatch to pilot.</p>}
      </div>

      {/* Input Commands */}
      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => handleCommand('ATTACK')} className="py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-700 rounded text-xs font-bold text-red-200 transition-colors">ATTACK</button>
          <button onClick={() => handleCommand('SUPPORT')} className="py-2 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-700 rounded text-xs font-bold text-blue-200 transition-colors">SUPPORT</button>
          <button onClick={() => handleCommand('ABORT')} className="py-2 bg-orange-900/50 hover:bg-orange-800/50 border border-orange-700 rounded text-xs font-bold text-orange-200 transition-colors">ABORT</button>
        </div>
      </div>
    </div>
  );
}
