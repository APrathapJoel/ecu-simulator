import { Router, type IRouter, type Request, type Response } from "express";
import { UserModel, isDatabaseConnected } from "@workspace/db";
import { registerBody, loginBody } from "@workspace/api-zod";
import crypto from "crypto";
import util from "util";
import bcrypt from "bcryptjs";

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

// POST /auth/register
router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    if (!isDatabaseConnected()) {
      if (memUsers.has(email)) {
        res.status(409).json({ error: "User already exists" });
        return;
      }
      let user = { _id: "mem_" + tempIdCounter++, email, passwordHash, createdAt: new Date() };
      memUsers.set(email, user);
    } else {
      let user = await UserModel.findOne({ email });
      if (user) {
        res.status(409).json({ error: "User already exists" });
        return;
      }
      user = new UserModel({ email, passwordHash });
      await user.save();
    }

    res.status(200).json({ message: "Registration successful. You may now log in." });
  } catch (error: unknown) {
    req.log.error({ err: error }, "Registration error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password } = parsed.data;

    let user;
    if (!isDatabaseConnected()) {
      user = memUsers.get(email);
    } else {
      user = await UserModel.findOne({ email });
    }

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash as string);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

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
