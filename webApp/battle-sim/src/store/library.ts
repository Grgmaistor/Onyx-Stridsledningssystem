import type { AircraftSpecs } from '../models/types';

export const AircraftLibrary: Record<string, AircraftSpecs> = {
  'Jas 39E': {
    model: 'Jas 39E',
    maxSpeed: 1332,
    maxAltitude: 52500,
    maxFuel: 100,
    crewCapacity: 1,
  },
  'MiG-29': {
    model: 'MiG-29',
    maxSpeed: 1318,
    maxAltitude: 59000,
    maxFuel: 100,
    crewCapacity: 1,
  },
  'Il-76': {
    model: 'Il-76',
    maxSpeed: 485,
    maxAltitude: 42600,
    maxFuel: 100,
    crewCapacity: 5,
  }
};
