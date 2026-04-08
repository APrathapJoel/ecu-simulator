import { EcuReadingModel, DtcModel, IEcuReadingDocument, IDtcDocument } from "@workspace/db";
import { logger } from "./logger";

const THRESHOLDS = {
  speed: { warning: 120, critical: 160 },
  rpm: { warning: 5000, critical: 7000 },
  engineTemp: { warning: 100, critical: 115 },
  fuelLevel: { warning: 15, critical: 5 },
  batteryVoltage: { warning: 11.5, critical: 10.5 },
  coolantTemp: { warning: 100, critical: 110 },
  oilPressure: { warning: 20, critical: 10 },
};

const DTC_DEFINITIONS: Record<
  string,
  { code: string; description: string; severity: string; system: string }
> = {
  highRpm: {
    code: "P0217",
    description: "Engine Overtemperature Condition - High RPM detected",
    severity: "warning",
    system: "engine",
  },
  criticalRpm: {
    code: "P0219",
    description: "Engine Overspeed Condition - Critical RPM exceeded",
    severity: "critical",
    system: "engine",
  },
  highEngineTemp: {
    code: "P0217",
    description: "Engine Overtemperature Condition",
    severity: "warning",
    system: "cooling",
  },
  criticalEngineTemp: {
    code: "P0218",
    description: "Transmission Fluid Over Temperature / Critical Engine Temp",
    severity: "critical",
    system: "cooling",
  },
  lowFuel: {
    code: "P0087",
    description: "Fuel System Pressure Too Low - Low fuel level",
    severity: "warning",
    system: "fuel",
  },
  criticalFuel: {
    code: "P0088",
    description: "Fuel System Pressure Too High - Critical fuel depletion",
    severity: "critical",
    system: "fuel",
  },
  lowBattery: {
    code: "P0562",
    description: "System Voltage Low - Battery voltage below threshold",
    severity: "warning",
    system: "electrical",
  },
  criticalBattery: {
    code: "P0563",
    description: "System Voltage High - Critical battery voltage",
    severity: "critical",
    system: "electrical",
  },
  lowOilPressure: {
    code: "P0521",
    description: "Engine Oil Pressure Sensor/Switch Range/Performance",
    severity: "warning",
    system: "engine",
  },
  criticalOilPressure: {
    code: "P0524",
    description: "Engine Oil Pressure Too Low - Critical",
    severity: "critical",
    system: "engine",
  },
  highCoolantTemp: {
    code: "P0115",
    description: "Engine Coolant Temperature Circuit Malfunction",
    severity: "warning",
    system: "cooling",
  },
  criticalCoolantTemp: {
    code: "P0116",
    description: "Engine Coolant Temperature - Out of Range Critical",
    severity: "critical",
    system: "cooling",
  },
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 1): number {
  const val = Math.random() * (max - min) + min;
  return Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ─── GPS Simulation State ─────────────────────────────────────────────────────
// Starts in New Delhi, India
const GPS_ORIGIN = { lat: 28.6139, lng: 77.2090 };
const EARTH_RADIUS_KM = 6371;

interface GpsState {
  latitude: number;
  longitude: number;
  heading: number; // 0-359 degrees (0=North, 90=East)
  trail: Array<{ latitude: number; longitude: number; speed: number; createdAt: string }>;
}

const gpsState: GpsState = {
  latitude: GPS_ORIGIN.lat,
  longitude: GPS_ORIGIN.lng,
  heading: randomInt(0, 359),
  trail: [],
};

function updateGpsPosition(speedKmh: number): { latitude: number; longitude: number; heading: number } {
  // Drift heading by ±15° every step (smooth curve, no sharp turns)
  const headingDrift = randomInt(-15, 15);
  gpsState.heading = (gpsState.heading + headingDrift + 360) % 360;

  // Distance moved in this 5-second tick (speed in km/h → km per tick)
  const tickSeconds = 5;
  const distanceKm = (speedKmh / 3600) * tickSeconds;

  // Convert heading to radians
  const headingRad = (gpsState.heading * Math.PI) / 180;

  // Calculate new lat/lng using flat-earth approximation (accurate for small distances)
  const deltaLat = (distanceKm * Math.cos(headingRad)) / EARTH_RADIUS_KM * (180 / Math.PI);
  const deltaLng = (distanceKm * Math.sin(headingRad)) / (EARTH_RADIUS_KM * Math.cos((gpsState.latitude * Math.PI) / 180)) * (180 / Math.PI);

  gpsState.latitude = Math.round((gpsState.latitude + deltaLat) * 1e6) / 1e6;
  gpsState.longitude = Math.round((gpsState.longitude + deltaLng) * 1e6) / 1e6;

  return {
    latitude: gpsState.latitude,
    longitude: gpsState.longitude,
    heading: gpsState.heading,
  };
}

export function recordGpsTrail(speedKmh: number): { latitude: number; longitude: number; heading: number } {
  const pos = updateGpsPosition(speedKmh);
  // Keep last 100 trail points
  gpsState.trail.push({ latitude: pos.latitude, longitude: pos.longitude, speed: speedKmh, createdAt: new Date().toISOString() });
  if (gpsState.trail.length > 100) gpsState.trail.shift();
  return pos;
}

export function getGpsState() {
  return {
    current: {
      latitude: gpsState.latitude,
      longitude: gpsState.longitude,
      heading: gpsState.heading,
      speed: gpsState.trail.length > 0 ? gpsState.trail[gpsState.trail.length - 1].speed : 0,
      updatedAt: gpsState.trail.length > 0 ? gpsState.trail[gpsState.trail.length - 1].createdAt : new Date().toISOString(),
    },
    trail: [...gpsState.trail].slice(-50),
  };
}

export function generateSimulatedSensorData() {
  // Pick a realistic driving scenario with weighted probability
  const roll = Math.random();

  if (roll < 0.10) {
    // --- SCENARIO: Engine Idle (parked / traffic stop) ---
    const rpm = randomInt(700, 950);
    const engineTemp = randomInt(82, 90);
    return {
      speed: 0,
      rpm,
      engineTemp,
      fuelLevel: randomInt(30, 95),
      batteryVoltage: randomFloat(13.8, 14.2),
      throttlePosition: randomInt(0, 5),
      coolantTemp: randomInt(80, 88),
      oilPressure: randomInt(20, 30), // oil pressure is low at idle - realistic
    };
  } else if (roll < 0.30) {
    // --- SCENARIO: City Driving (stop-start, low speeds) ---
    const speed = randomInt(15, 60);
    const rpm = randomInt(1200, 2800);
    const engineTemp = randomInt(85, 95);
    return {
      speed,
      rpm,
      engineTemp,
      fuelLevel: randomInt(20, 90),
      batteryVoltage: randomFloat(13.9, 14.4),
      throttlePosition: randomInt(10, 35),
      coolantTemp: randomInt(83, 93),
      oilPressure: randomInt(30, 50),
    };
  } else if (roll < 0.55) {
    // --- SCENARIO: Highway Cruising (steady 80-120 km/h) ---
    const speed = randomInt(80, 120);
    // RPM correlates with speed: ~80 km/h = ~2200 RPM in a typical car
    const rpm = randomInt(2000, 3200);
    const engineTemp = randomInt(88, 96);
    return {
      speed,
      rpm,
      engineTemp,
      fuelLevel: randomInt(25, 85),
      batteryVoltage: randomFloat(14.0, 14.5),
      throttlePosition: randomInt(25, 45),
      coolantTemp: randomInt(86, 94),
      oilPressure: randomInt(45, 65),
    };
  } else if (roll < 0.70) {
    // --- SCENARIO: Hard Acceleration (overtaking / on-ramp) ---
    const speed = randomInt(60, 160);
    const rpm = randomInt(3500, 5500);
    const engineTemp = randomInt(92, 102);
    return {
      speed,
      rpm,
      engineTemp,
      fuelLevel: randomInt(20, 70),
      batteryVoltage: randomFloat(13.5, 14.2),
      throttlePosition: randomInt(70, 100),
      coolantTemp: randomInt(90, 100),
      oilPressure: randomInt(55, 75),
    };
  } else if (roll < 0.82) {
    // --- SCENARIO: Motorway / High Speed (120-160 km/h) ---
    const speed = randomInt(120, 160);
    const rpm = randomInt(3200, 4500);
    const engineTemp = randomInt(94, 103);
    return {
      speed,
      rpm,
      engineTemp,
      fuelLevel: randomInt(15, 65),
      batteryVoltage: randomFloat(14.0, 14.5),
      throttlePosition: randomInt(45, 75),
      coolantTemp: randomInt(92, 102),
      oilPressure: randomInt(50, 70),
    };
  } else if (roll < 0.91) {
    // --- SCENARIO: Warning State (overheating / low fuel) ---
    const rpm = randomInt(4800, 5500);
    const engineTemp = randomInt(100, 110);
    return {
      speed: randomInt(90, 140),
      rpm,
      engineTemp,
      fuelLevel: randomInt(5, 15),
      batteryVoltage: randomFloat(11.2, 11.9),
      throttlePosition: randomInt(50, 80),
      coolantTemp: randomInt(100, 112),
      oilPressure: randomInt(18, 28),
    };
  } else {
    // --- SCENARIO: Critical Fault (red line / overtemp / no oil) ---
    const rpm = randomInt(6000, 7200);
    const engineTemp = randomInt(112, 130);
    return {
      speed: randomInt(100, 180),
      rpm,
      engineTemp,
      fuelLevel: randomInt(1, 8),
      batteryVoltage: randomFloat(9.8, 11.0),
      throttlePosition: randomInt(80, 100),
      coolantTemp: randomInt(110, 128),
      oilPressure: randomInt(4, 16),
    };
  }
}


export function detectFaults(data: {
  speed: number;
  rpm: number;
  engineTemp: number;
  fuelLevel: number;
  batteryVoltage: number;
  coolantTemp: number;
  oilPressure: number;
}): Array<{ code: string; description: string; severity: string; system: string }> {
  const faults: Array<{
    code: string;
    description: string;
    severity: string;
    system: string;
  }> = [];

  if (data.rpm >= THRESHOLDS.rpm.critical) {
    faults.push(DTC_DEFINITIONS.criticalRpm);
  } else if (data.rpm >= THRESHOLDS.rpm.warning) {
    faults.push(DTC_DEFINITIONS.highRpm);
  }

  if (data.engineTemp >= THRESHOLDS.engineTemp.critical) {
    faults.push(DTC_DEFINITIONS.criticalEngineTemp);
  } else if (data.engineTemp >= THRESHOLDS.engineTemp.warning) {
    faults.push(DTC_DEFINITIONS.highEngineTemp);
  }

  if (data.fuelLevel <= THRESHOLDS.fuelLevel.critical) {
    faults.push(DTC_DEFINITIONS.criticalFuel);
  } else if (data.fuelLevel <= THRESHOLDS.fuelLevel.warning) {
    faults.push(DTC_DEFINITIONS.lowFuel);
  }

  if (data.batteryVoltage <= THRESHOLDS.batteryVoltage.critical) {
    faults.push(DTC_DEFINITIONS.criticalBattery);
  } else if (data.batteryVoltage <= THRESHOLDS.batteryVoltage.warning) {
    faults.push(DTC_DEFINITIONS.lowBattery);
  }

  if (data.coolantTemp >= THRESHOLDS.coolantTemp.critical) {
    faults.push(DTC_DEFINITIONS.criticalCoolantTemp);
  } else if (data.coolantTemp >= THRESHOLDS.coolantTemp.warning) {
    faults.push(DTC_DEFINITIONS.highCoolantTemp);
  }

  if (data.oilPressure <= THRESHOLDS.oilPressure.critical) {
    faults.push(DTC_DEFINITIONS.criticalOilPressure);
  } else if (data.oilPressure <= THRESHOLDS.oilPressure.warning) {
    faults.push(DTC_DEFINITIONS.lowOilPressure);
  }

  return faults;
}

export async function saveEcuReadingWithFaults(
  sensorData: {
    speed: number;
    rpm: number;
    engineTemp: number;
    fuelLevel: number;
    batteryVoltage: number;
    throttlePosition: number;
    coolantTemp: number;
    oilPressure: number;
  },
  source: string = "simulation"
) {
  const faults = detectFaults(sensorData);
  const hasFault = faults.length > 0;

  const reading = new EcuReadingModel({
    ...sensorData,
    hasFault,
    source,
  });
  await reading.save();

  if (faults.length > 0) {
    for (const fault of faults) {
      await DtcModel.create({
        code: fault.code,
        description: fault.description,
        severity: fault.severity,
        system: fault.system,
        isActive: true,
        ecuReadingId: reading._id.toString(),
      });
    }
    logger.info({ readingId: reading._id, faultCount: faults.length }, "Faults detected and DTCs generated");
  }

  return reading;
}

export async function getLatestReading() {
  const latest = await EcuReadingModel.findOne().sort({ createdAt: -1 });
  return latest;
}

export function serializeReading(r: IEcuReadingDocument) {
  return {
    id: String(r._id),
    speed: r.speed,
    rpm: r.rpm,
    engineTemp: r.engineTemp,
    fuelLevel: r.fuelLevel,
    batteryVoltage: r.batteryVoltage,
    throttlePosition: r.throttlePosition,
    coolantTemp: r.coolantTemp,
    oilPressure: r.oilPressure,
    hasFault: r.hasFault,
    source: r.source,
    createdAt: (r.createdAt as Date).toISOString(),
  };
}

export function serializeDtc(d: IDtcDocument) {
  return {
    id: String(d._id),
    code: d.code,
    description: d.description,
    severity: d.severity,
    system: d.system,
    isActive: d.isActive,
    detectedAt: (d.detectedAt as Date).toISOString(),
    resolvedAt: d.resolvedAt ? (d.resolvedAt as Date).toISOString() : null,
    ecuReadingId: d.ecuReadingId,
  };
}

