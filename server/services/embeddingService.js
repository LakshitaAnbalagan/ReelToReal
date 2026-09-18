const dimensions = 48;
const tokens = (text) => text.toLowerCase().match(/[a-z0-9]+/g) || [];
export function createLocalEmbedding(text = '') {
  const vector = Array(dimensions).fill(0);
  tokens(text).forEach((word) => { let hash = 0; for (const letter of word) hash = (hash * 31 + letter.charCodeAt(0)) | 0; vector[Math.abs(hash) % dimensions] += 1; });
  const norm = Math.hypot(...vector) || 1; return vector.map((value) => value / norm);
}
export const cosineSimilarity = (left = [], right = []) => left.reduce((sum, value, i) => sum + value * (right[i] || 0), 0);
export function videoSearchText(video) { return [video.title, video.summary, video.transcript, video.category, video.subcategory, ...(video.tags || []), ...(video.locations || []), ...(video.foods || []), ...(video.activities || []), ...(video.entities || []).map((item) => item.name)].filter(Boolean).join(' '); }
