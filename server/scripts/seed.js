import dotenv from 'dotenv'; dotenv.config();
import { connectDb } from '../config/db.js'; import { configureStore, createVideo, listVideos } from '../services/videoStore.js'; import { understandVideo } from '../services/understandingService.js';
const db = await connectDb(); configureStore(db); if ((await listVideos()).length) { console.log('Library already has records.'); process.exit(); }
for (const name of ['chinese-restaurant.mp4', 'cozy-cafe.mp4', 'pondicherry-trip.mp4', 'ramen-recipe.mp4', 'home-workout.mp4']) { const data = await understandVideo({ fileName: name }); await createVideo({ ...data, processingStatus: 'COMPLETED', isDemo: true }); }
console.log('Demo library seeded.'); process.exit();
