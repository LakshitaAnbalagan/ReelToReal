import { listVideos } from '../services/videoStore.js';
import { buildPlan, chatWithPlanner, retrieve } from '../services/plannerService.js';

export async function query(req, res, next) {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ message: 'Tell ReelToReal what you want to plan.' });
    const results = await retrieve(query, await listVideos({}));
    res.json({ query, retrieved: results, plan: await buildPlan(query, results) });
  } catch (error) {
    next(error);
  }
}

export async function chat(req, res, next) {
  try {
    const { messages, query } = req.body;
    const allVideos = await listVideos({});
    const response = await chatWithPlanner({ messages, query, videos: allVideos });
    res.json(response);
  } catch (error) {
    next(error);
  }
}
