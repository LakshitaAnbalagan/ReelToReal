import { listVideos } from '../services/videoStore.js';
import { buildPlan, retrieve } from '../services/plannerService.js';
export async function query(req, res, next) { try { const { query } = req.body; if (!query?.trim()) return res.status(400).json({ message: 'Tell ReelToReal what you want to plan.' }); const results = await retrieve(query, await listVideos({})); res.json({ query, retrieved: results, plan: buildPlan(query, results) }); } catch (error) { next(error); } }
