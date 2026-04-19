import type { Entity, Aircraft } from '../models/types';

// Simple flat-earth approximation for movement
// SOG is knots (1 knot = 1.852 km/h)
// 1 degree latitude = ~111.32 km
// 1 degree longitude = ~111.32 * cos(latitude) km

const TICK_RATE_MS = 100; // 10 ticks per second
const KNOTS_TO_KMH = 1.852;

let entities: Record<string, Entity | Aircraft> = {};
let isRunning = false;
let intervalId: any = null;

function calculateNewPosition(lat: number, lng: number, headingDegrees: number, speedKnots: number, timeMs: number) {
  const speedKmh = speedKnots * KNOTS_TO_KMH;
  const speedKms = speedKmh / 3600; // km per second
  const distanceKm = speedKms * (timeMs / 1000);
  
  const headingRad = headingDegrees * (Math.PI / 180);
  
  // Convert distance to degrees (approx)
  const deltaLat = (distanceKm * Math.cos(headingRad)) / 111.32;
  const deltaLng = (distanceKm * Math.sin(headingRad)) / (111.32 * Math.cos(lat * (Math.PI / 180)));
  
  return {
    lat: lat + deltaLat,
    lng: lng + deltaLng
  };
}

function tick() {
  let changed = false;
  const newEntities = { ...entities };
  
  // Cache bases
  const friendlyBases = Object.values(newEntities).filter(e => e.type === 'base' && e.affiliation === 'friendly') as any[];

  Object.values(newEntities).forEach(entity => {
    if (entity.type === 'aircraft') {
      const ac = entity as Aircraft;
      if (ac.sog > 0 && (ac.status === 'in-flight' || ac.status === 'mayday')) {
        
        // Fuel logic
        const fuelBurn = (ac.specs.fuelBurnRate || 1.0) * (TICK_RATE_MS / 1000);
        ac.fuel = Math.max(0, ac.fuel - fuelBurn);

        if (ac.fuel === 0) {
          ac.status = 'eject';
          ac.sog = 0; // falls out of sky
        } else if (ac.fuel < ac.specs.maxFuel * 0.15 && ac.status !== 'mayday') {
          // Trigger automatic RTB
          ac.status = 'mayday';
          if (friendlyBases.length > 0) {
            let nearestBase = friendlyBases[0];
            let minDist = Infinity;
            friendlyBases.forEach(b => {
              const dx = b.position.lng - ac.position.lng;
              const dy = b.position.lat - ac.position.lat;
              const dist = dx*dx + dy*dy;
              if (dist < minDist) {
                minDist = dist;
                nearestBase = b;
              }
            });
            ac.waypoint = { lng: nearestBase.position.lng, lat: nearestBase.position.lat };
          }
        }
        
        // Waypoint navigation
        if (ac.waypoint) {
          const dy = ac.waypoint.lat - ac.position.lat;
          const dx = ac.waypoint.lng - ac.position.lng;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < 0.0001) { // Very close
            const isBase = friendlyBases.find(b => b.position.lng === ac.waypoint!.lng && b.position.lat === ac.waypoint!.lat);
            if (isBase) {
              ac.status = 'idle'; // Landed
              ac.sog = 0;
            }
            ac.waypoint = undefined;
          } else {
            let desiredHeading = Math.atan2(dx, dy) * (180 / Math.PI);
            if (desiredHeading < 0) desiredHeading += 360;
            ac.heading = desiredHeading;
          }
        }

        if (ac.sog > 0) {
          const newPos = calculateNewPosition(ac.position.lat, ac.position.lng, ac.heading, ac.sog, TICK_RATE_MS);
          ac.position = newPos;
        }
        
        newEntities[ac.id] = { ...ac };
        changed = true;
      }
    }
  });

  if (changed) {
    entities = newEntities;
    // Send updated entities back to main thread
    self.postMessage({ type: 'TICK_UPDATE', payload: entities });
  }
}

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
    case 'UPDATE_ENTITY':
      entities[payload.id] = payload.entity;
      break;
    case 'ADD_ENTITY':
      entities[payload.id] = payload;
      break;
    case 'UPDATE_WAYPOINT':
      if (entities[payload.id]) {
        (entities[payload.id] as Aircraft).waypoint = { lng: payload.lng, lat: payload.lat };
      }
      break;
  }
};
