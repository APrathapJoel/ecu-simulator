import { Router, type IRouter, type Request, type Response } from "express";
import { UserModel, isDatabaseConnected } from "@workspace/db";
import { requestOtpBody, verifyOtpBody } from "@workspace/api-zod";
import crypto from "crypto";
import util from "util";

const randomBytes = util.promisify(crypto.randomBytes);

const router: IRouter = Router();

// IN-MEMORY FALLBACK FOR OFFLINE DEVELOPMENT
interface MemUser {
  _id: string;
  email: string;
  createdAt: Date;
  otpCode?: string | null;
  otpExpires?: Date | null;
  sessionToken?: string | null;
}
const memUsers = new Map<string, MemUser>();
let tempIdCounter = 1;

// POST /auth/request-otp
router.post("/auth/request-otp", async (req: Request, res: Response) => {
  try {
    const parsed = requestOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email } = parsed.data;

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    if (!isDatabaseConnected()) {
      let user = memUsers.get(email) || { _id: "mem_" + tempIdCounter++, email, createdAt: new Date() };
      user.otpCode = otpCode;
      user.otpExpires = expires;
      memUsers.set(email, user);
      if (user.sessionToken) memUsers.set(user.sessionToken, user);
    } else {
      let user = await UserModel.findOne({ email });
      if (!user) {
        user = new UserModel({ email });
      }
      user.otpCode = otpCode;
      user.otpExpires = expires;
      await user.save();
    }

    // Instead of making outbound calls to Ethereal Mail (which fails on strict firewalls)
    // We simply log the OTP code directly to your terminal for local development!
    req.log.info({ email, otpCode }, "\n\n=================================\n>> YOUR SECURE OFFLINE ACCESS CODE: " + otpCode + "\n=================================\n");

    res.status(200).json({ message: "Check your terminal (where you ran pnpm run dev) for the 6-digit access code!" });
  } catch (error: unknown) {
    req.log.error({ err: error }, "OTP Request error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", async (req: Request, res: Response) => {
  try {
    const parsed = verifyOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, otpCode } = parsed.data;

    let user;
    if (!isDatabaseConnected()) {
      user = memUsers.get(email);
    } else {
      user = await UserModel.findOne({ email });
    }

    if (!user) {
      res.status(401).json({ error: "Invalid email" });
      return;
    }

    if (!user.otpCode || user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      res.status(401).json({ error: "Invalid or expired OTP" });
      return;
    }

    user.otpCode = null;
    user.otpExpires = null;
    const sessionToken = (await randomBytes(32)).toString("hex");
    user.sessionToken = sessionToken;

    if (!isDatabaseConnected()) {
      memUsers.set(email, user);
      memUsers.set(sessionToken, user);
    } else {
      await user.save();
    }

    res.cookie("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    req.log.error({ err: error }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout
router.post("/auth/logout", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
      if (!isDatabaseConnected()) {
        const u = memUsers.get(sessionToken);
        if (u) {
          if (u.email) memUsers.delete(u.email);
          u.sessionToken = null;
          memUsers.delete(sessionToken);
        }
      } else {
        await UserModel.updateOne({ sessionToken }, { $set: { sessionToken: null } });
      }
    }
  } catch (e) { 
    req.log.error({ err: e }, "Log out error");
  }
  res.clearCookie("sessionToken", { path: "/" });
  res.status(200).json({ status: "success" });
});

// GET /auth/me
router.get("/auth/me", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }

    let user;
    if (!isDatabaseConnected()) {
      user = memUsers.get(sessionToken);
    } else {
      user = await UserModel.findOne({ sessionToken });
    }

    if (!user) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    res.status(200).json({
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    req.log.error({ err: error }, "Me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
