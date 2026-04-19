import { create } from 'zustand';
import type { Entity, Aircraft, Base } from '../models/types';
import { AircraftLibrary } from './library';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'pilot';
  text: string;
  timestamp: string;
}

export interface SimulationState {
  entities: Record<string, Entity | Aircraft | Base>;
  selectedEntityId: string | null;
  selectEntity: (id: string | null) => void;
  updateEntityPosition: (id: string, lng: number, lat: number) => void;
  setAllEntities: (newEntities: Record<string, Entity | Aircraft | Base>) => void;
  addEntity: (entity: Entity | Aircraft | Base) => void;
  placementMode: 'troop' | 'base' | 'city' | 'aircraft' | null;
  setPlacementMode: (mode: 'troop' | 'base' | 'city' | 'aircraft' | null) => void;
  chatHistory: Record<string, ChatMessage[]>;
  addChatMessage: (aircraftId: string, message: ChatMessage) => void;
}

const mockEntities: Record<string, Entity | Aircraft | Base> = {
  'base-1': { 
    id: 'base-1', type: 'base', baseType: 'large_airbase', affiliation: 'friendly', 
    position: { lng: 18.0686, lat: 59.3293 }, name: 'HQ Alpha', health: 1000, maxHealth: 1000,
    fuelReserves: 500000, weaponReserves: 1000, maxAircraft: 10, parkedAircraftIds: []
  } as Base,
  'base-2': { 
    id: 'base-2', type: 'base', baseType: 'small_airfield', affiliation: 'friendly', 
    position: { lng: 18.1486, lat: 59.5000 }, name: 'F16 Uppsala', health: 500, maxHealth: 500,
    fuelReserves: 50000, weaponReserves: 100, maxAircraft: 4, parkedAircraftIds: []
  } as Base,
  'city-1': { id: 'city-1', type: 'city', affiliation: 'neutral', position: { lng: 18.0215, lat: 59.3326 }, name: 'Stockholm West', health: 500, maxHealth: 500 },
  'aircraft-1': { 
    id: 'aircraft-1', type: 'aircraft', status: 'in-flight', affiliation: 'friendly', 
    position: { lng: 18.0800, lat: 59.3500 }, name: 'ABC123', health: 200, maxHealth: 200,
    specs: AircraftLibrary['Jas 39E Gripen'], heading: 45, altitude: 38000, velocity: 650, sog: 650, 
    fuel: AircraftLibrary['Jas 39E Gripen'].maxFuel * 0.98, weapons: [], personnel: 1, 
    radioChannel: 'F16_AR_EA', flightTime: '00:23:46'
  } as Aircraft,
  'aircraft-2': { 
    id: 'aircraft-2', type: 'aircraft', status: 'in-flight', affiliation: 'enemy', 
    position: { lng: 18.2400, lat: 59.4000 }, name: 'Bogey 1', health: 200, maxHealth: 200,
    specs: AircraftLibrary['MiG-29 Fulcrum'], heading: 225, altitude: 35000, velocity: 700, sog: 700, 
    fuel: AircraftLibrary['MiG-29 Fulcrum'].maxFuel * 0.85, weapons: [], personnel: 1, 
    flightTime: '00:15:20'
  } as Aircraft,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  entities: mockEntities,
  selectedEntityId: null,
  placementMode: null,
  chatHistory: {},
  setPlacementMode: (mode) => set({ placementMode: mode }),
  selectEntity: (id) => set({ selectedEntityId: id }),
  updateEntityPosition: (id, lng, lat) => 
    set((state) => ({
      entities: {
        ...state.entities,
        [id]: { ...state.entities[id], position: { lng, lat } }
      }
    })),
  setAllEntities: (newEntities) => set({ entities: newEntities }),
  addEntity: (entity) => set((state) => ({ entities: { ...state.entities, [entity.id]: entity } })),
  addChatMessage: (aircraftId, message) => set((state) => ({
    chatHistory: {
      ...state.chatHistory,
      [aircraftId]: [...(state.chatHistory[aircraftId] || []), message]
    }
  })),
}));
