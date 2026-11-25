
import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes/index.js";
import { initSocket } from "./services/socket.js";
import { notFound, errorHandler } from "./middleware/error.js";

for (const k of ["JWT_SECRET", "DB_NAME", "CLIENT_URL"]) {
  if (!process.env[k]) {
    console.error(`ENV ${k} belum diset`);
    process.exit(1);
  }
}

const app = express();

// Konfigurasi reverse proxy Railway
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Parsing JSON
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api", routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// HTTP server
const server = http.createServer(app);

// Socket.IO
initSocket(server);

// Start server
const port = process.env.PORT || 5000;

server.listen(port, "0.0.0.0", () => {
  console.log(`API berjalan pada port ${port}`);
});
