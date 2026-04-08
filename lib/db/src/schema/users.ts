import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  sessionToken: string | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  sessionToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
