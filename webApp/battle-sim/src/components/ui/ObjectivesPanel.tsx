import { useState } from 'react';
import type { MutableRefObject } from 'react';
import { CommsPanel } from './CommsPanel';

export function ObjectivesPanel({ workerRef }: { workerRef: MutableRefObject<Worker | null> }) {
  const [activeTab, setActiveTab] = useState<'objectives' | 'comms'>('objectives');

  return (
    <div className="absolute top-0 left-0 h-full w-80 bg-[#0f172a]/90 backdrop-blur-md border-r border-gray-800 text-white shadow-2xl z-10 pointer-events-none flex flex-col">
      <div className="flex border-b border-gray-800 pointer-events-auto">
        <button 
          onClick={() => setActiveTab('objectives')}
          className={`flex-1 py-4 text-sm font-bold tracking-wider transition-colors ${activeTab === 'objectives' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/30' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/10'}`}
        >
          OBJECTIVES
        </button>
        <button 
          onClick={() => setActiveTab('comms')}
          className={`flex-1 py-4 text-sm font-bold tracking-wider transition-colors ${activeTab === 'comms' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/30' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/10'}`}
        >
          COMMS
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative pointer-events-auto">
        {activeTab === 'objectives' ? (
          <div className="p-6 h-full flex flex-col">
            <h1 className="text-2xl font-bold tracking-wider mb-8">Objectives</h1>
            
            <div className="mb-8 cursor-pointer hover:bg-white/5 p-3 -mx-3 rounded transition-colors border border-transparent hover:border-gray-700">
              <p className="text-sm text-gray-200 font-medium">
                ABC123 - "Flyg 25°N 40 000 ft. Möt och bekämpa MiG 29an"
              </p>
              <p className="text-xs text-gray-500 mt-2 font-mono">15:48 - 29an</p>
            </div>

            <div className="text-sm mt-4">
              <p className="italic text-gray-400 mb-2">Rekommendation:</p>
              <p className="text-gray-300 leading-relaxed bg-gray-800/30 p-3 rounded border border-gray-700/50">
                Skicka DEF456 med bärning 120° SÖ i syfte att understödja ABC123.
              </p>
              <button className="mt-4 text-blue-400 hover:text-blue-300 text-xs italic underline underline-offset-4 transition-colors">
                Klicka här för att se möjligt händelseförlopp
              </button>
            </div>

            <div className="mt-auto">
              <p className="text-xs text-gray-500 text-center uppercase tracking-widest opacity-50">Onyx Stridsledning</p>
            </div>
          </div>
        ) : (
          <CommsPanel workerRef={workerRef} />
        )}
      </div>
    </div>
  );
}
