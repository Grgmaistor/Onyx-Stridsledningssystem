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

  Object.values(newEntities).forEach(entity => {
    if (entity.type === 'aircraft') {
      const ac = entity as Aircraft;
      if (ac.sog > 0 && ac.status === 'In Flight') {
        const newPos = calculateNewPosition(ac.position.lat, ac.position.lng, ac.heading, ac.sog, TICK_RATE_MS);
        
        // Also update fuel slightly
        const newFuel = Math.max(0, ac.fuel - 0.005); // Arbitrary drain
        
        newEntities[ac.id] = {
          ...ac,
          position: newPos,
          fuel: newFuel,
        };
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
  }
};
