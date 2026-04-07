import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  otpCode: string | null;
  otpExpires: Date | null;
  sessionToken: string | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  otpCode: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  sessionToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
