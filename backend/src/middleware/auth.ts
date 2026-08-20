import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../utils/http.js";

export type AuthUser = { id: string; role: "SHIPPER" | "CARRIER" | "ADMIN"; email: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, process.env.JWT_SECRET || "freshchain-demo", { expiresIn: "7d" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new HttpError(401, "Missing authorization token");
    req.user = jwt.verify(token, process.env.JWT_SECRET || "freshchain-demo") as AuthUser;
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpError(401, "Invalid token"));
    } else {
      next(error);
    }
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, "Forbidden");
    next();
  };
}
