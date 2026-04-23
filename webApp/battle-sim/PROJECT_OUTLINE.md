# Battle Prediction & Timeline Feature - Project Outline

## Overview
Implement a battle prediction system that simulates future outcomes based on current state and historical patterns, allowing users to scrub through both recorded past events and predicted future scenarios.

## Core Components

### 1. **Event Recording System** (`src/models/battleHistory.ts`)
- **BattleEvent**: Records significant events during simulation
  - Timestamp (tick number)
  - Event type (ENGAGEMENT, UNIT_DESTROYED, UNIT_LANDED, UNIT_DAMAGED, MISSION_CHANGED, etc.)
  - Affected units (attacker, target, witnesses)
  - Event details (damage, outcome, position)
  
- **BattleSession**: Contains recorded events + metadata
  - Session ID, start time
  - List of events
  - Initial entity state
  - Final outcome (friendly/enemy/draw)
  
- **EventRecorder**: Captures events from engine updates
  - Compares state snapshots to detect changes
  - Logs events to session

### 2. **Prediction Engine** (`src/simulation/predictor.worker.ts`)
- **PredictionScenario**: Fork of current state with variations
  - Base state (snapshot of current entities)
  - Variation seed (for randomness)
  - Predicted events
  - Predicted outcome & score
  
- **Predictor**: Generates multiple future scenarios
  - Clone current state
  - Run simulation N times with different random seeds
  - Record outcomes from each run
  - Rank by favorability (friendly units alive, enemy units destroyed, etc.)
  
- **Outcome Ranking**: Score based on:
  - Friendly units remaining (weighted heavily)
  - Enemy units destroyed
  - Friendly bases intact
  - Objectives secured
  - Prediction confidence (based on variance)

### 3. **Timeline Data Model** (`src/models/timeline.ts`)
- **TimelineState**: Manages the temporal view
  - Current tick (real or predicted)
  - Mode: LIVE | REPLAY | PREDICTION
  - Recorded session (past events)
  - Selected prediction scenario (future events)
  - Event list for display
  
- **TimelineManager**: Zustand store
  - Advance/rewind through timeline
  - Switch between scenarios
  - Filter event types
  - Get state at any point in time

### 4. **Enhanced Timeline UI** (`src/components/ui/TimelineBar.tsx`)
- **Past section** (0-50%):
  - Blue fill shows replay progress
  - Markers for recorded events
  - Hover to see event details
  
- **Present** (50%):
  - Current state marker
  - Dividing line between past/future
  
- **Future section** (50-100%):
  - Red zone shows prediction area
  - Multiple outcome bands (best/medium/worst cases)
  - Toggle between scenarios
  - Confidence indicator
  
- **Event timeline popup**:
  - Lists events for current view
  - Shows outcome summaries for predictions

### 5. **Integration Points**
- **Engine Worker**: Emit events during ticks
- **App**: Pass worker ref to timeline & recorder
- **State Store**: Add timeline state management
- **Simulation Map**: Render predicted positions differently

## Implementation Phases

### Phase 1: Event Recording (Current)
- [ ] Define event types & data structures
- [ ] Create event recording system
- [ ] Integrate with engine to capture events
- [ ] Persist events in memory

### Phase 2: Timeline Management
- [ ] Create timeline state/store
- [ ] Implement replay logic
- [ ] Update TimelineBar UI basics
- [ ] Add event markers

### Phase 3: Prediction Engine
- [ ] Create predictor worker
- [ ] Implement scenario generation
- [ ] Add outcome ranking
- [ ] Basic scenario selection

### Phase 4: Enhanced UI & Polish
- [ ] Multi-scenario display
- [ ] Confidence indicators
- [ ] Event filtering
- [ ] Visual predictions on map

---

## Data Flow

```
Engine Worker (simulation running)
    ↓ (emits tick updates)
App.tsx / EventRecorder
    ↓ (captures significant changes)
BattleSession (events accumulated)
    ↓ (on user request or auto-trigger)
Predictor Worker (forks current state N times)
    ↓ (runs simulation, records outcomes)
Ranked Scenarios (scored by favorability)
    ↓ (user selects scenario to view)
TimelineBar (displays events + predictions)
    ↓ (user scrubs timeline)
SimulationMap (shows predicted positions)
```

## File Structure
```
src/
  models/
    battleHistory.ts          # Event types, BattleSession, EventRecorder
    timeline.ts              # TimelineState, TimelineManager
  simulation/
    predictor.worker.ts      # Prediction engine in separate worker
  store/
    useTimelineStore.ts      # Zustand store for timeline state
  components/
    ui/
      TimelineBar.tsx        # Enhanced timeline UI
      TimelineEventList.tsx  # Popup showing events
      PredictionPanel.tsx    # Scenario selection
```

## Key Decisions

1. **Worker Thread for Prediction**: Expensive simulation runs shouldn't block UI
2. **Event-based History**: Replay is state-agnostic; just replay events
3. **Scenario Forking**: Preserve current state; generate alternatives
4. **Scoring System**: Weigh friendly preservation heavily over offensive gains
5. **Real-time vs On-demand**: Generate predictions on user request initially

## Future Enhancements
- ML-based outcome weighting from historical battles
- Difficulty-based variations (AI tactics change by scenario)
- Manual scenario tweaking (what-if adjustments)
- Replay with speed control
- Export/import battle sessions
