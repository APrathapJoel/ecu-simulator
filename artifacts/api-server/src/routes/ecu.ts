import { Router, type IRouter } from "express";
import { EcuReadingModel, DtcModel } from "@workspace/db";
import {
  ingestEcuDataBody,
  resolveDtcParams,
  listDtcsQueryParams,
  getHistoryQueryParams,
} from "@workspace/api-zod";
import {
  generateSimulatedSensorData,
  saveEcuReadingWithFaults,
  getLatestReading,
  serializeReading,
  serializeDtc,
} from "../lib/ecuSimulator";
import { isDatabaseConnected } from "@workspace/db";

const router: IRouter = Router();

let memLatestReading: any = null;

function getMemReading() {
  if (!memLatestReading) {
    memLatestReading = {
      id: "mock_" + Date.now(), speed: 50, rpm: 2000, engineTemp: 90, fuelLevel: 75,
      batteryVoltage: 13.8, throttlePosition: 30, coolantTemp: 85, oilPressure: 45,
      hasFault: false, source: "simulation", createdAt: new Date().toISOString()
    };
  }
  return memLatestReading;
}

// GET /ecu/current - Get latest ECU reading
router.get("/ecu/current", async (req, res): Promise<void> => {
  if (!isDatabaseConnected()) {
    res.json(getMemReading());
    return;
  }

  const reading = await getLatestReading();
  if (!reading) {
    res.json({
      id: "0", speed: 0, rpm: 0, engineTemp: 20, fuelLevel: 100, batteryVoltage: 12.6,
      throttlePosition: 0, coolantTemp: 20, oilPressure: 0, hasFault: false, source: "none",
      createdAt: new Date().toISOString(),
    });
    return;
  }
  res.json(serializeReading(reading));
});

// POST /ecu/simulate - Generate and store simulated ECU data
router.post("/ecu/simulate", async (req, res): Promise<void> => {
  if (!isDatabaseConnected()) {
    const raw = generateSimulatedSensorData();
    memLatestReading = {
      id: "mock_" + Date.now(),
      ...raw,
      hasFault: Math.random() > 0.8,
      source: "simulation",
      createdAt: new Date().toISOString()
    };
    res.status(201).json(memLatestReading);
    return;
  }

  const sensorData = generateSimulatedSensorData();
  const reading = await saveEcuReadingWithFaults(sensorData, "simulation");
  req.log.info({ readingId: reading?.id }, "ECU simulation complete");
  res.status(201).json(serializeReading(reading!));
});

// POST /ecu/ingest - Accept data from ESP32 or external device
router.post("/ecu/ingest", async (req, res): Promise<void> => {
  const parsed = ingestEcuDataBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { speed, rpm, engineTemp, fuelLevel, batteryVoltage } = parsed.data;
  const throttlePosition = parsed.data.throttlePosition ?? 0;
  const coolantTemp = parsed.data.coolantTemp ?? engineTemp;
  const oilPressure = parsed.data.oilPressure ?? 40;

  const reading = await saveEcuReadingWithFaults(
    { speed, rpm, engineTemp, fuelLevel, batteryVoltage, throttlePosition, coolantTemp, oilPressure },
    "esp32"
  );

  req.log.info({ readingId: reading?.id }, "ESP32 data ingested");
  res.status(201).json(serializeReading(reading!));
});

// GET /ecu/status - Vehicle status summary
router.get("/ecu/status", async (req, res): Promise<void> => {
  if (!isDatabaseConnected()) {
    const current = getMemReading();
    res.json({
      overallHealth: current.hasFault ? "warning" : "healthy", 
      activeFaultCount: current.hasFault ? 1 : 0, 
      criticalFaultCount: 0, 
      warningFaultCount: current.hasFault ? 1 : 0, 
      totalReadings: 5,
      lastReadingAt: current.createdAt,
      latestReading: current
    });
    return;
  }

  const latestReading = await getLatestReading();

  const activeFaultCount = await DtcModel.countDocuments({ isActive: true });
  const criticalFaultCount = await DtcModel.countDocuments({ isActive: true, severity: "critical" });
  const warningFaultCount = await DtcModel.countDocuments({ isActive: true, severity: "warning" });
  const totalReadings = await EcuReadingModel.countDocuments();

  let overallHealth = "healthy";
  if (criticalFaultCount > 0) {
    overallHealth = "critical";
  } else if (warningFaultCount > 0 || activeFaultCount > 0) {
    overallHealth = "warning";
  }

  res.json({
    overallHealth,
    activeFaultCount,
    criticalFaultCount,
    warningFaultCount,
    totalReadings,
    lastReadingAt: latestReading ? latestReading.createdAt.toISOString() : null,
    latestReading: latestReading
      ? serializeReading(latestReading)
      : {
          id: "0", speed: 0, rpm: 0, engineTemp: 20, fuelLevel: 100, batteryVoltage: 12.6,
          throttlePosition: 0, coolantTemp: 20, oilPressure: 0, hasFault: false, source: "none",
          createdAt: new Date().toISOString(),
        },
  });
});

// GET /dtc - List DTCs
router.get("/dtc", async (req, res): Promise<void> => {
  const queryParams = listDtcsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  let query = DtcModel.find();

  if (queryParams.data.active !== undefined) {
    query = query.where({ isActive: queryParams.data.active });
  }

  query = query.sort({ detectedAt: -1 });

  if (queryParams.data.limit !== undefined) {
    query = query.limit(queryParams.data.limit);
  }

  const dtcs = await query;
  res.json(dtcs.map(serializeDtc));
});

// PATCH /dtc/:id/resolve - Mark DTC as resolved
router.patch("/dtc/:id/resolve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = resolveDtcParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const dtc = await DtcModel.findOneAndUpdate(
    { _id: params.data.id },
    { isActive: false, resolvedAt: new Date() },
    { new: true }
  );

  if (!dtc) {
    res.status(404).json({ error: "DTC not found" });
    return;
  }

  req.log.info({ dtcId: dtc._id, code: dtc.code }, "DTC resolved");
  res.json(serializeDtc(dtc));
});

// GET /history - Historical ECU readings
router.get("/history", async (req, res): Promise<void> => {
  if (!isDatabaseConnected()) {
    res.json([]);
    return;
  }

  const queryParams = getHistoryQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const limit = queryParams.data.limit ?? 50;
  const offset = queryParams.data.offset ?? 0;

  const readings = await EcuReadingModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);

  res.json(readings.map(serializeReading));
});

// GET /history/stats - Aggregated statistics
router.get("/history/stats", async (req, res): Promise<void> => {
  if (!isDatabaseConnected()) {
    res.json({
      speed: { min: 0, max: 120, avg: 60, current: 50 },
      rpm: { min: 800, max: 6000, avg: 3000, current: 2000 },
      engineTemp: { min: 20, max: 105, avg: 85, current: 90 },
      fuelLevel: { min: 10, max: 100, avg: 50, current: 75 },
      batteryVoltage: { min: 11.5, max: 14.4, avg: 13.2, current: 13.8 },
    });
    return;
  }

  const [stats] = await EcuReadingModel.aggregate([
    {
      $group: {
        _id: null,
        speedMin: { $min: "$speed" },
        speedMax: { $max: "$speed" },
        speedAvg: { $avg: "$speed" },
        rpmMin: { $min: "$rpm" },
        rpmMax: { $max: "$rpm" },
        rpmAvg: { $avg: "$rpm" },
        engineTempMin: { $min: "$engineTemp" },
        engineTempMax: { $max: "$engineTemp" },
        engineTempAvg: { $avg: "$engineTemp" },
        fuelLevelMin: { $min: "$fuelLevel" },
        fuelLevelMax: { $max: "$fuelLevel" },
        fuelLevelAvg: { $avg: "$fuelLevel" },
        batteryVoltageMin: { $min: "$batteryVoltage" },
        batteryVoltageMax: { $max: "$batteryVoltage" },
        batteryVoltageAvg: { $avg: "$batteryVoltage" },
      }
    }
  ]);

  const latest = await getLatestReading();

  const toFixed = (v: number | null | undefined) =>
    v != null ? Math.round(Number(v) * 10) / 10 : 0;

  res.json({
    speed: {
      min: toFixed(stats?.speedMin),
      max: toFixed(stats?.speedMax),
      avg: toFixed(stats?.speedAvg),
      current: latest?.speed ?? 0,
    },
    rpm: {
      min: toFixed(stats?.rpmMin),
      max: toFixed(stats?.rpmMax),
      avg: toFixed(stats?.rpmAvg),
      current: latest?.rpm ?? 0,
    },
    engineTemp: {
      min: toFixed(stats?.engineTempMin),
      max: toFixed(stats?.engineTempMax),
      avg: toFixed(stats?.engineTempAvg),
      current: latest?.engineTemp ?? 0,
    },
    fuelLevel: {
      min: toFixed(stats?.fuelLevelMin),
      max: toFixed(stats?.fuelLevelMax),
      avg: toFixed(stats?.fuelLevelAvg),
      current: latest?.fuelLevel ?? 0,
    },
    batteryVoltage: {
      min: toFixed(stats?.batteryVoltageMin),
      max: toFixed(stats?.batteryVoltageMax),
      avg: toFixed(stats?.batteryVoltageAvg),
      current: latest?.batteryVoltage ?? 0,
    },
  });
});

export default router;
