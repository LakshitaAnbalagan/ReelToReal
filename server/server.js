import dotenv from 'dotenv'; import express from 'express'; import cors from 'cors'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { connectDb } from './config/db.js'; import { configureStore } from './services/videoStore.js'; import videoRoutes from './routes/videos.js'; import plannerRoutes from './routes/planner.js';
const dir = path.dirname(fileURLToPath(import.meta.url)); fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
dotenv.config({ path: path.resolve(dir, '../.env') });
const app = express(); app.use(cors()); app.use(express.json()); app.use('/uploads', express.static(path.join(dir, 'uploads'))); app.get('/api/health', (_req, res) => res.json({ ok: true, demoMode: process.env.DEMO_MODE !== 'false' })); app.get('/api/categories', (_req, res) => res.json(['Food', 'Travel', 'Fitness', 'Shopping', 'Recipes', 'Entertainment', 'Events', 'Education', 'Lifestyle', 'Other'])); app.use('/api/videos', videoRoutes); app.use('/api/planner', plannerRoutes); app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: error.message || 'Something went wrong.' }); });
configureStore(await connectDb());
const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => console.log(`ReelToReal API running on ${port}`));
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Stop the existing ReelToReal server or set PORT=5001 in .env.`);
  else console.error('Server failed to start:', error.message);
  process.exitCode = 1;
});
