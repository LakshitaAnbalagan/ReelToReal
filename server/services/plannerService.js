import { cosineSimilarity, createLocalEmbedding, videoSearchText } from './embeddingService.js';
export async function retrieve(query, videos) { const embedding = createLocalEmbedding(query); return videos.map((video) => ({ ...video, relevance: cosineSimilarity(embedding, video.embedding?.length ? video.embedding : createLocalEmbedding(videoSearchText(video))) })).sort((a, b) => b.relevance - a.relevance).filter((video) => video.relevance > 0.04).slice(0, 3); }
export function buildPlan(query, sources) {
  if (!sources.length) return { title: 'Your plan is waiting for saved ideas', message: "I couldn't find anything relevant in your saved Reels yet. Try saving a few videos related to this request.", steps: [], sources: [] };
  const dinner = sources.find((item) => /Food|Recipes/.test(item.category)) || sources[0]; const followUp = sources.find((item) => item._id !== dinner._id) || null;
  const steps = [{ time: '7:00 PM', activity: dinner.activities?.[0] || dinner.subcategory || dinner.category, place: dinner.entities?.[0]?.name || dinner.title, reason: `From your saved “${dinner.title}” — ${dinner.summary}` , videoId: dinner._id }];
  if (followUp) steps.push({ time: '8:30 PM', activity: followUp.activities?.[0] || 'A relaxed follow-up', place: followUp.entities?.[0]?.name || followUp.title, reason: `Based on your saved “${followUp.title}”.`, videoId: followUp._id });
  return { title: /evening|tonight|dinner/i.test(query) ? 'Your Evening Plan' : 'Your Personal Plan', message: 'Built from the things you saved — not generic recommendations.', steps, sources: sources.map((item) => item._id) };
}
