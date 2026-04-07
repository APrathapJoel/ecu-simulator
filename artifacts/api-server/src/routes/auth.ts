import { Router, type IRouter, type Request, type Response } from "express";
import { UserModel } from "@workspace/db";
import { requestOtpBody, verifyOtpBody } from "@workspace/api-zod";
import crypto from "crypto";
import util from "util";
import nodemailer from "nodemailer";

const randomBytes = util.promisify(crypto.randomBytes);

const router: IRouter = Router();

// Nodemailer Singleton
let testAccount: nodemailer.TestAccount | null = null;
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (!transporter) {
    if (process.env.NODE_ENV === "production" && process.env.SMTP_URL) {
      transporter = nodemailer.createTransport(process.env.SMTP_URL);
    } else {
      testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
  }
  return transporter;
}

// POST /auth/request-otp
router.post("/auth/request-otp", async (req: Request, res: Response) => {
  try {
    const parsed = requestOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email } = parsed.data;

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = new UserModel({ email });
    }

    // Generate 6 digit numeric code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    user.otpCode = otpCode;
    user.otpExpires = expires;
    await user.save();

    // Send Email
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: '"ECU Diagnostics" <noreply@ecu-simulator.com>',
      to: email,
      subject: "Your ECU Simulator Access Code",
      text: `Your login code is: ${otpCode}. It expires in 10 minutes.`,
      html: `<b>Your login code is:</b> <h1>${otpCode}</h1><br><p>It expires in 10 minutes.</p>`,
    });

    req.log.info({ otpEmail: nodemailer.getTestMessageUrl(info) }, "MOCK EMAIL SENT URL");

    res.status(200).json({ message: "OTP sent to your email. Check server logs for the URL if testing locally!" });
  } catch (error: any) {
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

    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Invalid email" });
      return;
    }

    if (!user.otpCode || user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      res.status(401).json({ error: "Invalid or expired OTP" });
      return;
    }

    // Clear OTP and grant session
    user.otpCode = null;
    user.otpExpires = null;
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
  } catch (error: any) {
    req.log.error({ err: error }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout
router.post("/auth/logout", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
      await UserModel.updateOne({ sessionToken }, { $set: { sessionToken: null } });
    }
  } catch (e) {}
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
  } catch (error: any) {
    req.log.error({ err: error }, "Me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
