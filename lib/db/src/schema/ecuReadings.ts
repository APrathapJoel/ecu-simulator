import mongoose, { Document, Model, Schema } from "mongoose";
import { z } from "zod/v4";

export const EcuReadingZodSchema = z.object({
  id: z.string(),
  speed: z.number(),
  rpm: z.number(),
  engineTemp: z.number(),
  fuelLevel: z.number(),
  batteryVoltage: z.number(),
  throttlePosition: z.number(),
  coolantTemp: z.number(),
  oilPressure: z.number(),
  hasFault: z.boolean(),
  source: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  heading: z.number().optional(),
  createdAt: z.date(),
});

export const insertEcuReadingSchema = EcuReadingZodSchema.omit({
  id: true,
  createdAt: true,
});

export type InsertEcuReading = z.infer<typeof insertEcuReadingSchema>;
export type EcuReading = z.infer<typeof EcuReadingZodSchema>;

export interface IEcuReadingDocument extends Omit<EcuReading, "id">, Document {}

const ecuReadingSchema = new Schema<IEcuReadingDocument>({
  speed: { type: Number, required: true },
  rpm: { type: Number, required: true },
  engineTemp: { type: Number, required: true },
  fuelLevel: { type: Number, required: true },
  batteryVoltage: { type: Number, required: true },
  throttlePosition: { type: Number, required: true, default: 0 },
  coolantTemp: { type: Number, required: true, default: 90 },
  oilPressure: { type: Number, required: true, default: 40 },
  hasFault: { type: Boolean, required: true, default: false },
  source: { type: String, required: true, default: "simulation" },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  heading: { type: Number, default: null },
  createdAt: { type: Date, required: true, default: Date.now },
});

export const EcuReadingModel: Model<IEcuReadingDocument> =
  mongoose.models.EcuReading || mongoose.model<IEcuReadingDocument>("EcuReading", ecuReadingSchema);
