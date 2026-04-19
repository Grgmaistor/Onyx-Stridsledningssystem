export type EntityType = 'troop' | 'base' | 'city' | 'aircraft';
export type Affiliation = 'friendly' | 'enemy' | 'neutral';
export type BaseType = 'large_airbase' | 'small_airfield';
export type AircraftStatus = 'idle' | 'ready' | 'in-flight' | 'mayday' | 'eject' | 'destroyed';
export type MissionType = 'idle' | 'patrol' | 'support' | 'attack' | 'resupply' | 'retreat' | 'battle';

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
  maxFuel: number; // kg
  fuelBurnRate: number; // kg per second at cruising speed
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

export interface Base extends Entity {
  type: 'base';
  baseType: BaseType;
  fuelReserves: number; // kg
  weaponReserves: number;
  maxAircraft: number;
  parkedAircraftIds: string[];
}

export interface Aircraft extends Entity {
  type: 'aircraft';
  specs: AircraftSpecs;
  status: AircraftStatus;
  heading: number; // degrees
  altitude: number; // ft
  velocity: number; // knots
  sog: number; // speed over ground (knots)
  fuel: number; // current fuel in kg
  weapons: Weapon[];
  personnel: number;
  radioChannel?: string;
  flightTime?: string;
  waypoint?: Position;     // internal — used by resupply/mayday RTB
  userWaypoint?: Position;  // user-assigned via right-click — always highest priority
  // Mission system
  mission: MissionType;
  patrolPath?: Position[];   // ordered list of waypoints for patrol loop
  patrolIndex?: number;      // which patrol waypoint we're heading to
  targetId?: string;         // id of entity being attacked / supported
}
