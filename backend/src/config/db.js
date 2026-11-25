
import mysql from "mysql2/promise";
import "dotenv/config";

// Pemeriksaan ENV database tanpa menampilkan nilai rahasia
console.log("Pemeriksaan ENV database:", {
  host: !!process.env.DB_HOST,
  port: !!process.env.DB_PORT,
  user: !!process.env.DB_USER,
  password: !!process.env.DB_PASSWORD,
  database: !!process.env.DB_NAME,
});

// Koneksi MySQL
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});
