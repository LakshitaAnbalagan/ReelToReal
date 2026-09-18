import Video from '../models/Video.js';
let mongoActive = false; let localVideos = []; let sequence = 1;
export function configureStore(active) { mongoActive = active; }
const serialize = (video) => video?.toObject ? video.toObject() : video;
export async function createVideo(data) { if (mongoActive) return serialize(await Video.create(data)); const record = { ...data, _id: `local-${sequence++}`, createdAt: new Date(), updatedAt: new Date() }; localVideos.unshift(record); return record; }
export async function listVideos(filter = {}) { if (mongoActive) return (await Video.find(filter).sort({ createdAt: -1 })).map(serialize); return localVideos.filter((video) => !filter.category || video.category === filter.category); }
export async function getVideo(id) { if (mongoActive) return serialize(await Video.findById(id)); return localVideos.find((video) => video._id === id); }
export async function updateVideo(id, data) { if (mongoActive) return serialize(await Video.findByIdAndUpdate(id, data, { new: true })); const index = localVideos.findIndex((video) => video._id === id); if (index < 0) return null; localVideos[index] = { ...localVideos[index], ...data, updatedAt: new Date() }; return localVideos[index]; }
export async function removeVideo(id) { if (mongoActive) return Video.findByIdAndDelete(id); const index = localVideos.findIndex((video) => video._id === id); return index < 0 ? null : localVideos.splice(index, 1)[0]; }
