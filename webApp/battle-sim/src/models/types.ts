export type EntityType = 'troop' | 'base' | 'city' | 'aircraft';
export type Affiliation = 'friendly' | 'enemy' | 'neutral';

export interface Position {
  lng: number;
  lat: number;
}

export interface Weapon {
  name: string;
  count: number;
}

export interface AircraftSpecs {
  model: string;
  maxSpeed: number; // knots
  maxAltitude: number; // ft
  maxFuel: number; // %
  crewCapacity: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  affiliation: Affiliation;
  position: Position;
  name: string;
  health: number;
  maxHealth: number;
}

export interface Aircraft extends Entity {
  type: 'aircraft';
  specs: AircraftSpecs;
  heading: number; // degrees
  altitude: number; // ft
  velocity: number; // knots
  sog: number; // speed over ground (knots)
  fuel: number; // %
  weapons: Weapon[];
  personnel: number;
  radioChannel?: string;
  status?: string;
  flightTime?: string;
}
