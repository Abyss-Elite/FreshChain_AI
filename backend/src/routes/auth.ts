import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { prisma } from "../utils/prisma.js";

export const authRouter = Router();

const authSchema = z.object({
  name: z.string().min(2).optional(),
  company: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SHIPPER", "CARRIER", "ADMIN"]).default("SHIPPER")
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = authSchema.parse(req.body);
    const password = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name || data.email.split("@")[0], email: data.email, password, role: data.role, company: data.company }
    });
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = authSchema.pick({ email: true, password: true }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.password))) throw new HttpError(401, "Invalid credentials");
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  })
);
