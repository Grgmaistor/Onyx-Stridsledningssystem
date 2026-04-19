import type { Entity, Aircraft, Base } from '../models/types';

// Simple flat-earth approximation for movement
// SOG is knots (1 knot = 1.852 km/h)
// 1 degree latitude ≈ 111.32 km
// 1 degree longitude ≈ 111.32 * cos(lat) km

const TICK_RATE_MS = 100; // 10 ticks per second
const KNOTS_TO_KMH = 1.852;
const ENGAGE_RANGE_DEG = 0.05;   // ~5 km engagement range
const SCAN_RANGE_DEG   = 0.30;   // ~30 km scan range for patrol auto-engage
const SUPPORT_RANGE_DEG = 0.03;  // ~3 km wingman formation gap
const DAMAGE_PER_TICK  = 0.8;    // HP removed per tick during battle
const RETREAT_SPEED_MULTIPLIER = 1.0; // always use max speed

let entities: Record<string, Entity | Aircraft | Base> = {};
let isRunning = false;
let intervalId: any = null;

// ── helpers ────────────────────────────────────────────────────────────────

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
}

function headingTo(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const dy = toLat - fromLat;
  const dx = toLng - fromLng;
  let h = Math.atan2(dx, dy) * (180 / Math.PI);
  if (h < 0) h += 360;
  return h;
}

function calculateNewPosition(
  lat: number, lng: number,
  headingDegrees: number, speedKnots: number, timeMs: number
) {
  const speedKmh   = speedKnots * KNOTS_TO_KMH;
  const speedKms   = speedKmh / 3600;
  const distanceKm = speedKms * (timeMs / 1000);
  const headingRad = headingDegrees * (Math.PI / 180);
  const deltaLat   = (distanceKm * Math.cos(headingRad)) / 111.32;
  const deltaLng   = (distanceKm * Math.sin(headingRad)) / (111.32 * Math.cos(lat * (Math.PI / 180)));
  return { lat: lat + deltaLat, lng: lng + deltaLng };
}

function nearestBase(ac: Aircraft, aff: string): (Base & Entity) | null {
  let nearest: any = null;
  let best = Infinity;
  Object.values(entities).forEach(e => {
    if (e.type === 'base' && e.affiliation === aff) {
      const d = dist2(ac.position.lng, ac.position.lat, e.position.lng, e.position.lat);
      if (d < best) { best = d; nearest = e; }
    }
  });
  return nearest;
}

function nearestEnemy(ac: Aircraft): Aircraft | null {
  let nearest: Aircraft | null = null;
  let best = Infinity;
  Object.values(entities).forEach(e => {
    if (e.type === 'aircraft' && e.affiliation !== ac.affiliation && (e as Aircraft).status !== 'destroyed') {
      const d = dist2(ac.position.lng, ac.position.lat, e.position.lng, e.position.lat);
      if (d < best) { best = d; nearest = e as Aircraft; }
    }
  });
  return nearest;
}

function nearestFriendly(ac: Aircraft): Aircraft | null {
  let nearest: Aircraft | null = null;
  let best = Infinity;
  Object.values(entities).forEach(e => {
    if (e.type === 'aircraft' && e.id !== ac.id && e.affiliation === ac.affiliation && (e as Aircraft).status !== 'destroyed') {
      const d = dist2(ac.position.lng, ac.position.lat, e.position.lng, e.position.lat);
      if (d < best) { best = d; nearest = e as Aircraft; }
    }
  });
  return nearest;
}

// ── tick ───────────────────────────────────────────────────────────────────

function tick() {
  let changed = false;
  const newEntities = { ...entities };

  Object.values(newEntities).forEach(entity => {
    if (entity.type !== 'aircraft') return;
    const ac = { ...(entity as Aircraft) };
    if (ac.status === 'destroyed' || ac.status === 'eject') return;

    // ── fuel burn ──────────────────────────────────────────────────────────
    if (ac.sog > 0 && ac.status === 'in-flight') {
      const burn = (ac.specs.fuelBurnRate || 1.0) * (TICK_RATE_MS / 1000);
      ac.fuel = Math.max(0, ac.fuel - burn);
      if (ac.fuel === 0) {
        ac.status = 'eject';
        ac.sog = 0;
        newEntities[ac.id] = ac;
        changed = true;
        return;
      }
    }

    // ── auto RTB on low fuel (overrides mission unless already resupply) ──
    if (
      ac.fuel < ac.specs.maxFuel * 0.15 &&
      ac.mission !== 'resupply' &&
      ac.status === 'in-flight'
    ) {
      const base = nearestBase(ac, ac.affiliation);
      if (base) {
        ac.mission = 'resupply';
        ac.waypoint = { lng: base.position.lng, lat: base.position.lat };
        ac.status = 'mayday';
      }
    }

    // ── USER WAYPOINT (highest priority) ────────────────────────────────
    // If the user has manually assigned a waypoint, steer toward it
    // regardless of current mission. Clear it once reached.
    if (ac.userWaypoint) {
      const uwp = ac.userWaypoint;
      const d2 = dist2(ac.position.lng, ac.position.lat, uwp.lng, uwp.lat);
      if (d2 < 0.0001) {
        // Reached — clear user waypoint and let mission resume
        ac.userWaypoint = undefined;
      } else {
        ac.heading  = headingTo(ac.position.lat, ac.position.lng, uwp.lat, uwp.lng);
        ac.sog      = ac.specs.maxSpeed * 0.8;
        ac.status   = 'in-flight';
        // Move and skip mission logic
        const newPos = calculateNewPosition(ac.position.lat, ac.position.lng, ac.heading, ac.sog, TICK_RATE_MS);
        ac.position = newPos;
        newEntities[ac.id] = ac;
        changed = true;
        return;
      }
    }

    // ── mission logic ──────────────────────────────────────────────────────
    switch (ac.mission) {

      // ── IDLE ──
      case 'idle':
        ac.sog = 0;
        break;

      // ── PATROL ──
      case 'patrol': {
        // Auto-engage: scan for nearby enemies
        const enemy = nearestEnemy(ac);
        if (enemy) {
          const d = dist2(ac.position.lng, ac.position.lat, enemy.position.lng, enemy.position.lat);
          if (d < SCAN_RANGE_DEG * SCAN_RANGE_DEG) {
            ac.mission = 'battle';
            ac.targetId = enemy.id;
            break;
          }
        }

        const path = ac.patrolPath;
        if (!path || path.length === 0) break;

        const idx = ac.patrolIndex ?? 0;
        const wp  = path[idx];
        const d2  = dist2(ac.position.lng, ac.position.lat, wp.lng, wp.lat);

        if (d2 < 0.0001) {
          // Reached waypoint — advance to next (loop)
          ac.patrolIndex = (idx + 1) % path.length;
        } else {
          ac.heading = headingTo(ac.position.lat, ac.position.lng, wp.lat, wp.lng);
        }

        ac.sog    = ac.specs.maxSpeed * 0.7;
        ac.status = 'in-flight';
        break;
      }

      // ── SUPPORT (wingman) ──
      case 'support': {
        let leader = ac.targetId ? (newEntities[ac.targetId] as Aircraft) : null;
        if (!leader || leader.status === 'destroyed') {
          leader = nearestFriendly(ac);
          if (leader) ac.targetId = leader.id;
        }
        if (!leader) break;

        const d2 = dist2(ac.position.lng, ac.position.lat, leader.position.lng, leader.position.lat);
        if (d2 > SUPPORT_RANGE_DEG * SUPPORT_RANGE_DEG) {
          ac.heading = headingTo(ac.position.lat, ac.position.lng, leader.position.lat, leader.position.lng);
          ac.sog     = Math.min(ac.specs.maxSpeed, leader.sog + 80);
        } else {
          // Stay in formation — match leader heading
          ac.heading = leader.heading;
          ac.sog     = leader.sog;
        }
        ac.status = 'in-flight';
        break;
      }

      // ── ATTACK ──
      case 'attack': {
        const target = ac.targetId ? (newEntities[ac.targetId] as Aircraft) : nearestEnemy(ac);
        if (!target || target.status === 'destroyed') {
          ac.mission = 'idle';
          ac.targetId = undefined;
          break;
        }
        ac.targetId = target.id;
        const d2 = dist2(ac.position.lng, ac.position.lat, target.position.lng, target.position.lat);
        if (d2 < ENGAGE_RANGE_DEG * ENGAGE_RANGE_DEG) {
          ac.mission = 'battle';
        } else {
          ac.heading = headingTo(ac.position.lat, ac.position.lng, target.position.lat, target.position.lng);
          ac.sog     = ac.specs.maxSpeed;
        }
        ac.status = 'in-flight';
        break;
      }

      // ── RESUPPLY ──
      case 'resupply': {
        const base = ac.waypoint
          ? ac.waypoint
          : (() => { const b = nearestBase(ac, ac.affiliation); return b ? b.position : null; })();

        if (!base) { ac.mission = 'idle'; break; }
        ac.waypoint = base;

        const d2 = dist2(ac.position.lng, ac.position.lat, base.lng, base.lat);
        if (d2 < 0.0001) {
          // Landed — resupply
          ac.fuel    = ac.specs.maxFuel;
          ac.status  = 'idle';
          ac.sog     = 0;
          ac.mission = 'idle';
          ac.waypoint = undefined;
        } else {
          ac.heading = headingTo(ac.position.lat, ac.position.lng, base.lat, base.lng);
          ac.sog     = ac.specs.maxSpeed * 0.8;
          ac.status  = 'in-flight';
        }
        break;
      }

      // ── RETREAT ──
      case 'retreat': {
        const threat = nearestEnemy(ac);
        if (threat) {
          // Fly directly away from threat
          const away = headingTo(ac.position.lat, ac.position.lng, threat.position.lat, threat.position.lng);
          ac.heading = (away + 180) % 360;
        }
        ac.sog    = ac.specs.maxSpeed * RETREAT_SPEED_MULTIPLIER;
        ac.status = 'in-flight';
        break;
      }

      // ── BATTLE ──
      case 'battle': {
        const target = ac.targetId ? (newEntities[ac.targetId] as Aircraft) : null;
        if (!target || target.status === 'destroyed' || target.health <= 0) {
          ac.mission  = 'idle';
          ac.targetId = undefined;
          ac.sog      = 0;
          break;
        }

        // Face target
        ac.heading = headingTo(ac.position.lat, ac.position.lng, target.position.lat, target.position.lng);

        const d2 = dist2(ac.position.lng, ac.position.lat, target.position.lng, target.position.lat);
        if (d2 > ENGAGE_RANGE_DEG * ENGAGE_RANGE_DEG) {
          // Close in
          ac.sog    = ac.specs.maxSpeed;
          ac.status = 'in-flight';
        } else {
          // In range — orbit slowly and deal damage
          ac.sog    = ac.specs.maxSpeed * 0.5;
          ac.status = 'in-flight';

          // Damage the target
          const tgt = { ...(newEntities[target.id] as Aircraft) };
          tgt.health = Math.max(0, tgt.health - DAMAGE_PER_TICK);
          if (tgt.health <= 0) {
            tgt.status  = 'destroyed';
            tgt.sog     = 0;
            tgt.mission = 'idle';
          }
          newEntities[target.id] = tgt;
        }
        break;
      }
    }

    // ── move ──
    if (ac.sog > 0) {
      const newPos = calculateNewPosition(ac.position.lat, ac.position.lng, ac.heading, ac.sog, TICK_RATE_MS);
      ac.position = newPos;
    }

    newEntities[ac.id] = ac;
    changed = true;
  });

  if (changed) {
    entities = newEntities;
    self.postMessage({ type: 'TICK_UPDATE', payload: entities });
  }
}

// ── message handler ────────────────────────────────────────────────────────

self.onmessage = (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      entities = payload;
      break;
    case 'START':
      if (!isRunning) {
        isRunning = true;
        intervalId = setInterval(tick, TICK_RATE_MS);
      }
      break;
    case 'STOP':
      if (isRunning) {
        isRunning = false;
        clearInterval(intervalId);
      }
      break;
    case 'ADD_ENTITY':
      entities[payload.id] = payload;
      break;
    case 'UPDATE_ENTITY':
      entities[payload.id] = payload.entity;
      break;
    case 'UPDATE_WAYPOINT': {
      // payload: { id, lng, lat }
      const ac = entities[payload.id] as Aircraft;
      if (!ac) break;
      const existing = ac.userWaypoint;
      if (existing) {
        const d2 = dist2(existing.lng, existing.lat, payload.lng, payload.lat);
        // Within ~1 km (0.01 deg) ⟹ cancel the waypoint
        if (d2 < 0.0001) {
          ac.userWaypoint = undefined;
          entities[payload.id] = ac;
          break;
        }
      }
      ac.userWaypoint = { lng: payload.lng, lat: payload.lat };
      // Make the aircraft take off if it was idle
      if (ac.status === 'idle') {
        ac.status   = 'in-flight';
        ac.sog      = ac.specs.maxSpeed * 0.8;
        ac.altitude = ac.specs.maxAltitude * 0.5;
      }
      entities[payload.id] = ac;
      break;
    }
    case 'UPDATE_MISSION': {
      // payload: { id, mission, targetId? }
      const ac = entities[payload.id] as Aircraft;
      if (!ac) break;
      ac.mission  = payload.mission;
      ac.targetId = payload.targetId ?? undefined;
      if (payload.mission !== 'idle' && ac.status === 'idle') {
        ac.status   = 'in-flight';
        ac.sog      = ac.specs.maxSpeed * 0.7;
        ac.altitude = ac.specs.maxAltitude * 0.6;
      }
      if (payload.mission === 'idle') {
        ac.sog = 0;
        ac.status = 'idle';
      }
      entities[payload.id] = ac;
      break;
    }
    case 'SET_PATROL_PATH': {
      // payload: { id, path: Position[] }
      const ac = entities[payload.id] as Aircraft;
      if (!ac) break;
      ac.patrolPath  = payload.path;
      ac.patrolIndex = 0;
      ac.mission     = 'patrol';
      ac.status      = 'in-flight';
      ac.sog         = ac.specs.maxSpeed * 0.7;
      ac.altitude    = ac.specs.maxAltitude * 0.6;
      entities[payload.id] = ac;
      break;
    }
  }
};
