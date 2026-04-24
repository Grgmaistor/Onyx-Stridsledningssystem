import { useState, useEffect } from 'react';
import { useTimelineStore } from '../../store/useTimelineStore';

export function TimelineBar() {
  const [showEvents, setShowEvents] = useState(false);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mode = useTimelineStore(state => state.mode);
  const currentTick = useTimelineStore(state => state.currentTick);
  const setCurrentTick = useTimelineStore(state => state.setCurrentTick);
  const recordedSession = useTimelineStore(state => state.recordedSession);
  const scenarios = useTimelineStore(state => state.scenarios);
  const selectedScenarioId = useTimelineStore(state => state.selectedScenarioId);
  const selectScenario = useTimelineStore(state => state.selectScenario);
  const visibleEvents = useTimelineStore(state => state.visibleEvents);

  const hasRecordedEvents = (recordedSession?.events.length ?? 0) > 0;
  const hasPredictions = scenarios.length > 0;
  const isNotAtPresent = currentTick < 100;

  // Get max tick from recorded session
  const maxTick = recordedSession?.endTick ?? 1000;

  // Auto-advance timeline when playing
  useEffect(() => {
    if (!isPlaying || currentTick >= 100) {
      setIsPlaying(false);
      return;
    }

    const interval = setInterval(() => {
      setCurrentTick(Math.min(currentTick + 1, 100));
    }, 50); // Advance by 1% every 50ms

    return () => clearInterval(interval);
  }, [isPlaying, currentTick, setCurrentTick]);

  // Calculate event marker positions
  const getEventPosition = (tick: number) => {
    return (tick / maxTick) * 100;
  };

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'ENGAGEMENT_START':
      case 'ENGAGEMENT_END':
        return '⚔';
      case 'UNIT_DESTROYED':
        return '✕';
      case 'UNIT_DAMAGED':
        return '⚡';
      case 'FUEL_CRITICAL':
        return '⛽';
      case 'MISSION_CHANGED':
        return '🎯';
      default:
        return '•';
    }
  };

  const handleFastBack = () => {
    setCurrentTick(Math.max(currentTick - 10, 0));
  };

  const handleFastForward = () => {
    setCurrentTick(Math.min(currentTick + 10, 100));
  };

  const handlePlayPause = () => {
    if (currentTick >= 100) {
      setCurrentTick(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleJumpToPresent = () => {
    setCurrentTick(100);
    setIsPlaying(false);
  };

  return (
    <div className="absolute bottom-0 left-80 right-0 h-16 bg-[#0f172a]/95 backdrop-blur-md border-t border-gray-800 z-10 flex items-center px-12 pointer-events-auto">
      <div className="w-full relative flex flex-col items-center h-full justify-center">
        {/* Main track container */}
        <div className="absolute w-full h-4 bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/50">
          {/* Past events section - blue */}
          {hasRecordedEvents && (
            <div
              className="absolute left-0 h-full bg-blue-500/40"
              style={{ width: `${Math.min(currentTick, 50)}%` }}
            />
          )}

          {/* Prediction zone - red */}
          {hasPredictions && (
            <div
              className="absolute h-full bg-red-500/20"
              style={{
                left: '50%',
                width: '50%'
              }}
            />
          )}

          {/* Progress fill for current view */}
          <div
            className="absolute left-0 h-full bg-gradient-to-r from-blue-600 to-transparent opacity-50"
            style={{ width: `${currentTick}%` }}
          />

          {/* Event markers */}
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className="absolute top-1/2 transform -translate-y-1/2 w-2 h-4 bg-white rounded-sm shadow cursor-pointer hover:scale-125 transition-transform z-20"
              style={{
                left: `calc(${getEventPosition(event.tick)}% - 4px)`,
              }}
              onMouseEnter={() => setHoveredEventId(event.id)}
              onMouseLeave={() => setHoveredEventId(null)}
              title={`${event.type} at tick ${event.tick}`}
            >
              {hoveredEventId === event.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap bg-gray-900 px-2 py-1 rounded text-xs text-gray-200 pointer-events-none border border-gray-700">
                  {getEventIcon(event.type)} {event.type}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Range Slider overlay */}
        <input
          type="range"
          min="0"
          max="100"
          value={currentTick}
          onChange={(e) => setCurrentTick(Number(e.target.value))}
          className="absolute w-full h-4 opacity-0 cursor-pointer z-30"
        />

        {/* Custom Slider Thumb */}
        <div
          className="absolute w-5 h-5 bg-white border-4 border-gray-400 rounded-full shadow-lg z-20 pointer-events-none transition-transform"
          style={{ left: `calc(${currentTick}% - 10px)` }}
        />

        {/* Labels */}
        <div className="absolute inset-0 flex justify-between items-start pt-1 text-xs text-gray-400 font-mono pointer-events-none px-1">
          <span>Past</span>
          <span>Now</span>
          <span>Predicted</span>
        </div>

        {/* Current mode indicator */}
        <div className="absolute -top-6 right-0 text-xs font-bold tracking-wider">
          <span
            className={`px-2 py-0.5 rounded ${
              mode === 'LIVE'
                ? 'bg-green-500/60 text-green-200'
                : mode === 'REPLAY'
                  ? 'bg-blue-500/60 text-blue-200'
                  : 'bg-red-500/60 text-red-200'
            }`}
          >
            {mode}
          </span>
        </div>

        {/* Scenario selector - visible when predictions exist */}
        {hasPredictions && (
          <div className="absolute -bottom-8 left-0 text-xs">
            <div className="flex gap-1 flex-wrap">
              {scenarios.slice(0, 3).map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => selectScenario(scenario.id)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                    selectedScenarioId === scenario.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={`Score: ${scenario.score.toFixed(1)}, Confidence: ${(scenario.confidence * 100).toFixed(0)}%`}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Playback controls - visible when not at present */}
        {isNotAtPresent && (
          <div className="absolute -bottom-10 right-0 flex gap-2">
            <button
              onClick={handleFastBack}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors font-bold"
              title="Rewind 10%"
            >
              ⏮ Back
            </button>

            <button
              onClick={handlePlayPause}
              className={`px-3 py-1 text-xs rounded transition-colors font-bold ${
                isPlaying
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            <button
              onClick={handleFastForward}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors font-bold"
              title="Fast forward 10%"
            >
              Forward ⏭
            </button>

            <button
              onClick={handleJumpToPresent}
              className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors font-bold"
              title="Jump to present"
            >
              🎯 Now
            </button>
          </div>
        )}

        {/* Event list toggle button */}
        {visibleEvents.length > 0 && (
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="absolute -top-8 left-0 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 rounded transition-colors"
          >
            Events ({visibleEvents.length})
          </button>
        )}
      </div>

      {/* Event details popup */}
      {showEvents && visibleEvents.length > 0 && (
        <div className="absolute bottom-full left-12 mb-2 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto z-50 pointer-events-auto w-64">
          <div className="p-2 space-y-1">
            {visibleEvents.slice(-10).reverse().map((event) => (
              <div
                key={event.id}
                className="text-xs text-gray-300 border-l-2 border-gray-700 pl-2 py-1 hover:bg-gray-800/50"
              >
                <div className="font-mono text-gray-500">#{event.tick}</div>
                <div>
                  <span className="text-gray-400">{getEventIcon(event.type)}</span>{' '}
                  <span className="text-yellow-300">{event.type}</span>
                </div>
                <div className="text-gray-400 text-[10px]">{event.primaryUnitId}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
