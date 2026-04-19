import { create } from 'zustand';
import type { Entity, Aircraft } from '../models/types';
import { AircraftLibrary } from './library';

interface SimulationState {
  entities: Record<string, Entity | Aircraft>;
  selectedEntityId: string | null;
  selectEntity: (id: string | null) => void;
  updateEntityPosition: (id: string, lng: number, lat: number) => void;
  setAllEntities: (newEntities: Record<string, Entity | Aircraft>) => void;
}

const mockEntities: Record<string, Entity | Aircraft> = {
  'base-1': { id: 'base-1', type: 'base', affiliation: 'friendly', position: { lng: 18.0686, lat: 59.3293 }, name: 'HQ Alpha', health: 1000, maxHealth: 1000 },
  'city-1': { id: 'city-1', type: 'city', affiliation: 'neutral', position: { lng: 18.0215, lat: 59.3326 }, name: 'Stockholm West', health: 500, maxHealth: 500 },
  'troop-1': { id: 'troop-1', type: 'troop', affiliation: 'friendly', position: { lng: 18.0500, lat: 59.3400 }, name: 'Squad A', health: 100, maxHealth: 100 },
  'aircraft-1': { 
    id: 'aircraft-1', 
    type: 'aircraft', 
    affiliation: 'friendly', 
    position: { lng: 18.0800, lat: 59.3500 }, 
    name: 'ABC123', 
    health: 200, 
    maxHealth: 200,
    specs: AircraftLibrary['Jas 39E'],
    heading: 45, 
    altitude: 38000, 
    velocity: 650, 
    sog: 650, 
    fuel: 98,
    weapons: [
      { name: 'robot XXXXX', count: 2 },
      { name: 'ATS missiles', count: 4 }
    ],
    personnel: 1, 
    radioChannel: 'F16_AR_EA', 
    status: 'In Flight', 
    flightTime: '00:23:46'
  } as Aircraft,
  'aircraft-2': { 
    id: 'aircraft-2', 
    type: 'aircraft', 
    affiliation: 'enemy', 
    position: { lng: 18.2400, lat: 59.4000 }, 
    name: 'MiG 29', 
    health: 200, 
    maxHealth: 200,
    specs: AircraftLibrary['MiG-29'],
    heading: 225, 
    altitude: 35000, 
    velocity: 700, 
    sog: 700, 
    fuel: 85,
    weapons: [], 
    personnel: 1, 
    status: 'In Flight',
    flightTime: '00:15:20'
  } as Aircraft,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  entities: mockEntities,
  selectedEntityId: null,
  selectEntity: (id) => set({ selectedEntityId: id }),
  updateEntityPosition: (id, lng, lat) => 
    set((state) => ({
      entities: {
        ...state.entities,
        [id]: { ...state.entities[id], position: { lng, lat } }
      }
    })),
  setAllEntities: (newEntities) => set({ entities: newEntities }),
}));
