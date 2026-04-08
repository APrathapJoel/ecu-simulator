import { Router, type IRouter, type Request, type Response } from "express";
import { UserModel, isDatabaseConnected } from "@workspace/db";
import { registerBody, loginBody } from "@workspace/api-zod";
import crypto from "crypto";
import util from "util";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const randomBytes = util.promisify(crypto.randomBytes);
const router: IRouter = Router();

// ─── File-backed in-memory store for offline/local development ───────────────
// Persists user accounts and session tokens across server restarts.
// The file is gitignored so it never gets committed.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, "../../../../.memdb.json");

interface MemUser {
  _id: string;
  email: string;
  passwordHash: string;
  sessionToken: string | null;
  createdAt: string; // ISO string for JSON serialisation
}

interface MemDb {
  users: Record<string, MemUser>; // keyed by email
  sessions: Record<string, string>; // sessionToken → email
}

function loadDb(): MemDb {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // corrupted file — start fresh
  }
  return { users: {}, sessions: {} };
}

function saveDb(db: MemDb): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("[memdb] Failed to persist local DB:", e);
  }
}

// Load on startup — users and sessions survive server restarts
let memDb = loadDb();
let tempIdCounter = Object.keys(memDb.users).length + 1;

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
      if (memDb.users[email]) {
        res.status(409).json({ error: "User already exists" });
        return;
      }
      memDb.users[email] = {
        _id: "mem_" + tempIdCounter++,
        email,
        passwordHash,
        sessionToken: null,
        createdAt: new Date().toISOString(),
      };
      saveDb(memDb);
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

    if (!isDatabaseConnected()) {
      const user = memDb.users[email];
      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Invalidate old session if exists
      if (user.sessionToken) {
        delete memDb.sessions[user.sessionToken];
      }

      const sessionToken = (await randomBytes(32)).toString("hex");
      user.sessionToken = sessionToken;
      memDb.sessions[sessionToken] = email;
      saveDb(memDb);

      res.cookie("sessionToken", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      });
      return;
    }

    // MongoDB path
    const user = await UserModel.findOne({ email });
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
    await user.save();

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
        const email = memDb.sessions[sessionToken];
        if (email && memDb.users[email]) {
          memDb.users[email].sessionToken = null;
        }
        delete memDb.sessions[sessionToken];
        saveDb(memDb);
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

    if (!isDatabaseConnected()) {
      const email = memDb.sessions[sessionToken];
      const user = email ? memDb.users[email] : undefined;
      if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      res.status(200).json({
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      });
      return;
    }

    const user = await UserModel.findOne({ sessionToken });
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
