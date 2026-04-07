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

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

export function generateSimulatedSensorData() {
  const scenario = Math.random();

  if (scenario < 0.15) {
    // Fault scenario
    return {
      speed: randomBetween(100, 180),
      rpm: randomBetween(5500, 7500),
      engineTemp: randomBetween(105, 125),
      fuelLevel: randomBetween(2, 12),
      batteryVoltage: randomBetween(10.0, 11.4),
      throttlePosition: randomBetween(70, 100),
      coolantTemp: randomBetween(105, 120),
      oilPressure: randomBetween(5, 18),
    };
  } else if (scenario < 0.30) {
    // Warning scenario
    return {
      speed: randomBetween(110, 130),
      rpm: randomBetween(4800, 5200),
      engineTemp: randomBetween(98, 108),
      fuelLevel: randomBetween(8, 18),
      batteryVoltage: randomBetween(11.3, 11.8),
      throttlePosition: randomBetween(50, 75),
      coolantTemp: randomBetween(97, 108),
      oilPressure: randomBetween(18, 28),
    };
  } else {
    // Normal operation
    return {
      speed: randomBetween(30, 110),
      rpm: randomBetween(800, 4500),
      engineTemp: randomBetween(75, 95),
      fuelLevel: randomBetween(20, 100),
      batteryVoltage: randomBetween(12.0, 14.8),
      throttlePosition: randomBetween(5, 50),
      coolantTemp: randomBetween(75, 95),
      oilPressure: randomBetween(30, 60),
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

