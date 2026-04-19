import type { AircraftSpecs } from '../models/types';

export const AircraftLibrary: Record<string, AircraftSpecs> = {
  // NATO / Allied
  'F-35 Lightning II': {
    model: 'F-35 Lightning II',
    maxSpeed: 1060,
    maxAltitude: 50000,
    maxFuel: 8278,
    fuelBurnRate: 1.5,
    crewCapacity: 1,
  },
  'F-16 Fighting Falcon': {
    model: 'F-16 Fighting Falcon',
    maxSpeed: 1146,
    maxAltitude: 50000,
    maxFuel: 3175,
    fuelBurnRate: 1.0,
    crewCapacity: 1,
  },
  'Eurofighter Typhoon': {
    model: 'Eurofighter Typhoon',
    maxSpeed: 1147,
    maxAltitude: 65000,
    maxFuel: 5000,
    fuelBurnRate: 1.2,
    crewCapacity: 1,
  },
  'Jas 39E Gripen': {
    model: 'Jas 39E Gripen',
    maxSpeed: 1332,
    maxAltitude: 52500,
    maxFuel: 3400,
    fuelBurnRate: 0.9,
    crewCapacity: 1,
  },
  
  // Russian / Hostile
  'Su-57 Felon': {
    model: 'Su-57 Felon',
    maxSpeed: 1146,
    maxAltitude: 66000,
    maxFuel: 10300,
    fuelBurnRate: 1.8,
    crewCapacity: 1,
  },
  'Su-35 Flanker-E': {
    model: 'Su-35 Flanker-E',
    maxSpeed: 1296,
    maxAltitude: 59000,
    maxFuel: 11500,
    fuelBurnRate: 1.9,
    crewCapacity: 1,
  },
  'MiG-29 Fulcrum': {
    model: 'MiG-29 Fulcrum',
    maxSpeed: 1318,
    maxAltitude: 59000,
    maxFuel: 3500,
    fuelBurnRate: 1.2,
    crewCapacity: 1,
  },
  'MiG-31 Foxhound': {
    model: 'MiG-31 Foxhound',
    maxSpeed: 1620,
    maxAltitude: 80000,
    maxFuel: 16300,
    fuelBurnRate: 2.5,
    crewCapacity: 2,
  },
  
  // Transports / Heavy
  'Il-76 Candid': {
    model: 'Il-76 Candid',
    maxSpeed: 485,
    maxAltitude: 42600,
    maxFuel: 84840,
    fuelBurnRate: 6.0,
    crewCapacity: 5,
  }
};
