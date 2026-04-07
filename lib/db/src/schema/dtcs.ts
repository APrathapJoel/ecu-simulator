import mongoose, { Document, Model, Schema } from "mongoose";
import { z } from "zod/v4";

export const DtcZodSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  severity: z.string(),
  system: z.string(),
  isActive: z.boolean(),
  detectedAt: z.date(),
  resolvedAt: z.date().nullable().optional(),
  ecuReadingId: z.string().nullable().optional(),
});

export const insertDtcSchema = DtcZodSchema.omit({
  id: true,
  detectedAt: true,
});

export type InsertDtc = z.infer<typeof insertDtcSchema>;
export type Dtc = z.infer<typeof DtcZodSchema>;

export interface IDtcDocument extends Omit<Dtc, "id">, Document {}

const dtcSchema = new Schema<IDtcDocument>({
  code: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, required: true },
  system: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
  detectedAt: { type: Date, required: true, default: Date.now },
  resolvedAt: { type: Date, default: null },
  ecuReadingId: { type: String, default: null },
});

export const DtcModel: Model<IDtcDocument> =
  mongoose.models.Dtc || mongoose.model<IDtcDocument>("Dtc", dtcSchema);
