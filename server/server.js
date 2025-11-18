// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cvRoutes from "./cvRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(express.json());

// Mount /api routes
app.use("/api", cvRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
