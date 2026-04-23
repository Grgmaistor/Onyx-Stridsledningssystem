import type { Aircraft, Entity, Base } from './types';

/**
 * Event types that can be recorded during a battle
 */
export type BattleEventType = 
  | 'ENGAGEMENT_START'      // Two units begin combat
  | 'ENGAGEMENT_END'        // Combat ends (one unit destroyed or retreats)
  | 'UNIT_DESTROYED'        // Unit health reaches 0
  | 'UNIT_DAMAGED'          // Unit takes damage (>10% health loss)
  | 'UNIT_LANDED'           // Aircraft lands at base
  | 'UNIT_TOOK_OFF'         // Aircraft takes off from base
  | 'MISSION_CHANGED'       // Unit mission changed
  | 'UNIT_EJECTED'          // Pilot ejects
  | 'UNIT_WAYPOINT_SET'     // User sets waypoint
  | 'BASE_DAMAGED'          // Base takes damage
  | 'OBJECTIVE_REACHED'     // Unit reaches objective
  | 'FUEL_CRITICAL';        // Aircraft fuel below 15%

export interface BattleEvent {
  id: string;
  tick: number;              // Simulation tick when event occurred
  timestamp: Date;           // Real timestamp
  type: BattleEventType;
  
  // Primary affected units
  primaryUnitId: string;
  primaryUnitType: string;   // 'aircraft' | 'base' | 'troop' | 'city'
  primaryAffiliation: string;
  
  // Secondary affected unit (if applicable)
  secondaryUnitId?: string;
  secondaryUnitType?: string;
  secondaryAffiliation?: string;
  
  // Event-specific data
  details: Record<string, any>;
  
  // Outcome
  outcome?: 'success' | 'failure' | 'neutral';
}

export interface OutcomeMetrics {
  friendlyUnitsAlive: number;
  friendlyUnitsDestroyed: number;
  friendlyHealthRemaining: number;
  enemyUnitsAlive: number;
  enemyUnitsDestroyed: number;
  enemyHealthRemaining: number;
  neutralUnitsAlive: number;
}

export interface BattleSession {
  id: string;
  startTick: number;
  endTick?: number;
  startTime: Date;
  endTime?: Date;
  
  // Initial state snapshot
  initialEntities: Record<string, Entity | Aircraft | Base>;
  
  // All recorded events
  events: BattleEvent[];
  
  // Final metrics
  outcomes?: OutcomeMetrics;
  
  // Session metadata
  label?: string;
  notes?: string;
}

/**
 * Tracks changes in entity state between ticks
 */
interface EntitySnapshot {
  id: string;
  health: number;
  status?: string;
  position: { lng: number; lat: number };
  mission?: string;
  fuel?: number;
}

export class EventRecorder {
  private currentSession: BattleSession | null = null;
  private previousSnapshots: Map<string, EntitySnapshot> = new Map();
  private engagementTracking: Map<string, Set<string>> = new Map(); // unitId -> set of enemies in combat

  /**
   * Start a new recording session
   */
  startSession(initialEntities: Record<string, Entity | Aircraft | Base>) {
    this.currentSession = {
      id: `session-${Date.now()}`,
      startTick: 0,
      startTime: new Date(),
      initialEntities: JSON.parse(JSON.stringify(initialEntities)),
      events: []
    };
    this.previousSnapshots.clear();
    this.engagementTracking.clear();
    this.captureSnapshots(initialEntities);
  }

  /**
   * Record a tick update - detects changes and generates events
   */
  recordTick(tickNumber: number, entities: Record<string, Entity | Aircraft | Base>) {
    if (!this.currentSession) return;

    const newSnapshots = this.createSnapshots(entities);
    
    // Compare with previous state to detect changes
    for (const [unitId, currentSnapshot] of newSnapshots) {
      const previousSnapshot = this.previousSnapshots.get(unitId);
      
      if (!previousSnapshot) {
        // New unit spawned
        continue;
      }

      // Health decreased -> unit took damage
      if (currentSnapshot.health < previousSnapshot.health) {
        const healthLoss = previousSnapshot.health - currentSnapshot.health;
        const healthLossPercent = healthLoss / previousSnapshot.health;
        
        if (currentSnapshot.health <= 0) {
          this.addEvent(tickNumber, 'UNIT_DESTROYED', unitId, entities[unitId], {
            previousHealth: previousSnapshot.health,
            damage: healthLoss
          });
        } else if (healthLossPercent > 0.1) {
          this.addEvent(tickNumber, 'UNIT_DAMAGED', unitId, entities[unitId], {
            previousHealth: previousSnapshot.health,
            currentHealth: currentSnapshot.health,
            damage: healthLoss,
            healthLossPercent
          });
        }
      }

      // Check status changes
      const entity = entities[unitId] as Aircraft;
      if (entity.type === 'aircraft') {
        if (currentSnapshot.status !== previousSnapshot.status) {
          if (currentSnapshot.status === 'destroyed') {
            // Already handled above
          } else if (currentSnapshot.status === 'eject') {
            this.addEvent(tickNumber, 'UNIT_EJECTED', unitId, entity, {
              previousStatus: previousSnapshot.status,
              position: currentSnapshot.position
            });
          }
        }

        // Fuel critical check
        if (entity.fuel / entity.specs.maxFuel < 0.15) {
          const prevFuelPercent = previousSnapshot.fuel ? (previousSnapshot.fuel / entity.specs.maxFuel) : 1;
          if (prevFuelPercent >= 0.15) {
            this.addEvent(tickNumber, 'FUEL_CRITICAL', unitId, entity, {
              fuelRemaining: entity.fuel,
              maxFuel: entity.specs.maxFuel
            });
          }
        }

        // Mission change
        if (currentSnapshot.mission !== previousSnapshot.mission) {
          this.addEvent(tickNumber, 'MISSION_CHANGED', unitId, entity, {
            previousMission: previousSnapshot.mission,
            currentMission: currentSnapshot.mission
          });
        }
      }
    }

    // Detect engagements (units fighting)
    this.updateEngagements(tickNumber, entities);

    this.previousSnapshots = newSnapshots;
  }

  /**
   * End the current session and calculate outcome metrics
   */
  endSession(tickNumber: number): BattleSession | null {
    if (!this.currentSession) return null;

    this.currentSession.endTick = tickNumber;
    this.currentSession.endTime = new Date();

    // TODO: Calculate outcome metrics
    // this.currentSession.outcomes = this.calculateOutcomes();

    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }

  /**
   * Get current session events
   */
  getSessionEvents(): BattleEvent[] {
    return this.currentSession?.events ?? [];
  }

  /**
   * Get the complete session
   */
  getCurrentSession(): BattleSession | null {
    return this.currentSession;
  }

  // ─── Private methods ───────────────────────────────────────────────────

  private createSnapshots(entities: Record<string, Entity | Aircraft | Base>): Map<string, EntitySnapshot> {
    const snapshots = new Map<string, EntitySnapshot>();
    for (const [id, entity] of Object.entries(entities)) {
      const aircraft = entity as Aircraft;
      snapshots.set(id, {
        id,
        health: entity.health,
        status: aircraft.status,
        position: { ...entity.position },
        mission: aircraft.mission,
        fuel: aircraft.fuel
      });
    }
    return snapshots;
  }

  private captureSnapshots(entities: Record<string, Entity | Aircraft | Base>) {
    this.previousSnapshots = this.createSnapshots(entities);
  }

  private updateEngagements(tickNumber: number, entities: Record<string, Entity | Aircraft | Base>) {
    if (!this.currentSession) return;

    const currentEngagements = new Map<string, Set<string>>();

    // Find all units in battle
    for (const entity of Object.values(entities)) {
      const aircraft = entity as Aircraft;
      if (aircraft.type === 'aircraft' && aircraft.mission === 'battle' && aircraft.targetId) {
        if (!currentEngagements.has(entity.id)) {
          currentEngagements.set(entity.id, new Set());
        }
        currentEngagements.get(entity.id)!.add(aircraft.targetId);
      }
    }

    // Detect engagement starts
    for (const [unitId, enemies] of currentEngagements) {
      const wasEngaged = this.engagementTracking.get(unitId) ?? new Set();
      for (const enemyId of enemies) {
        if (!wasEngaged.has(enemyId)) {
          this.addEvent(tickNumber, 'ENGAGEMENT_START', unitId, entities[unitId], {
            targetId: enemyId,
            targetName: entities[enemyId]?.name
          });
        }
      }
    }

    // Detect engagement ends
    for (const [unitId, oldEnemies] of this.engagementTracking) {
      const currentEnemies = currentEngagements.get(unitId) ?? new Set();
      for (const enemyId of oldEnemies) {
        if (!currentEnemies.has(enemyId)) {
          this.addEvent(tickNumber, 'ENGAGEMENT_END', unitId, entities[unitId], {
            targetId: enemyId,
            reason: 'target_destroyed_or_retreated'
          });
        }
      }
    }

    this.engagementTracking = currentEngagements;
  }

  private addEvent(
    tickNumber: number,
    type: BattleEventType,
    primaryUnitId: string,
    primaryEntity: Entity | Aircraft | Base,
    details: Record<string, any> = {}
  ) {
    if (!this.currentSession) return;

    const event: BattleEvent = {
      id: `event-${this.currentSession.events.length}-${tickNumber}`,
      tick: tickNumber,
      timestamp: new Date(),
      type,
      primaryUnitId,
      primaryUnitType: primaryEntity.type,
      primaryAffiliation: primaryEntity.affiliation,
      details
    };

    this.currentSession.events.push(event);
  }
}
