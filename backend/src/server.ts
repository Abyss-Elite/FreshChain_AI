import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { assistantRouter } from "./routes/assistant.js";
import { negotiationRouter } from "./routes/negotiation.js";
import { ZodError } from "zod";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000" }
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, limit: 160 }));

app.use("/api/auth", authRouter);
app.use("/api", apiRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/negotiation", negotiationRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error:", err);
  
  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ message, issues: err.issues });
  }

  const status = err.status || 500;
  const message = err.message || "Unexpected error";
  res.status(status).json({ message, issues: err.issues });
});

io.on("connection", (socket) => {
  socket.emit("connected", { message: "FreshChain realtime connected" });
});

setInterval(() => {
  const temp = Number((-2 + Math.random() * 10).toFixed(1));
  io.emit("tracking:update", {
    truckId: "demo-truck-01",
    lat: 11.35 + Math.random() * 0.2,
    lng: 107.45 + Math.random() * 0.2,
    temperature: temp,
    etaMinutes: 118 + Math.round(Math.random() * 12),
    alert: temp > 4 ? "Nhiet do vuot nguong" : null
  });
}, 3500);

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`FreshChain AI API running on http://localhost:${port}`);
});
