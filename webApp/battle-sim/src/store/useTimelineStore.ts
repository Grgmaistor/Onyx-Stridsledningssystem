import { create } from 'zustand';
import type { BattleEvent, BattleSession } from '../models/battleHistory';
import type { Entity, Aircraft, Base } from '../models/types';

export type TimelineMode = 'LIVE' | 'REPLAY' | 'PREDICTION';

export interface PredictionScenario {
  id: string;
  label: string;
  score: number;
  confidence: number;
  events: BattleEvent[];
  finalOutcome: {
    friendlyWin: boolean;
    friendlyUnitsAlive: number;
    enemyUnitsAlive: number;
  };
}

export interface TimelineState {
  // Current mode
  mode: TimelineMode;
  setMode: (mode: TimelineMode) => void;

  // Current tick position (0-100 for percentage)
  currentTick: number;
  setCurrentTick: (tick: number) => void;

  // Recorded session
  recordedSession: BattleSession | null;
  setRecordedSession: (session: BattleSession | null) => void;

  // Prediction scenarios
  scenarios: PredictionScenario[];
  selectedScenarioId: string | null;
  setScenarios: (scenarios: PredictionScenario[]) => void;
  selectScenario: (id: string | null) => void;

  // Timeline display
  visibleEvents: BattleEvent[];
  updateVisibleEvents: () => void;

  // Helpers
  getStateAtTick: (tick: number) => Partial<Record<string, Entity | Aircraft | Base>> | null;
  getEventsInRange: (startTick: number, endTick: number) => BattleEvent[];
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  mode: 'LIVE',
  currentTick: 100, // Start at 100 (live)
  recordedSession: null,
  scenarios: [],
  selectedScenarioId: null,
  visibleEvents: [],

  setMode: (mode) => set({ mode }),

  setCurrentTick: (tick) => {
    set({ currentTick: tick });
    get().updateVisibleEvents();
  },

  setRecordedSession: (session) => set({ recordedSession: session }),

  setScenarios: (scenarios) => set({ scenarios }),

  selectScenario: (id) => {
    set({ selectedScenarioId: id });
    get().updateVisibleEvents();
  },

  updateVisibleEvents: () => {
    const state = get();
    let events: BattleEvent[] = [];

    if (state.mode === 'REPLAY' && state.recordedSession) {
      // Show events up to current tick
      const maxTick = (state.currentTick / 100) * (state.recordedSession.endTick ?? 1000);
      events = state.recordedSession.events.filter(e => e.tick <= maxTick);
    } else if (state.mode === 'PREDICTION' && state.selectedScenarioId) {
      // Show prediction events
      const scenario = state.scenarios.find(s => s.id === state.selectedScenarioId);
      if (scenario) {
        const maxTick = (state.currentTick / 100) * 1000; // Predict up to 1000 ticks
        events = scenario.events.filter(e => e.tick <= maxTick);
      }
    }

    set({ visibleEvents: events });
  },

  getStateAtTick: (_tick) => {
    // TODO: Reconstruct entity state at a specific tick by replaying events
    return null;
  },

  getEventsInRange: (startTick, endTick) => {
    const state = get();
    const allEvents = state.recordedSession?.events ?? [];
    return allEvents.filter(e => e.tick >= startTick && e.tick <= endTick);
  },
}));
