import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Video from '../models/Video.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const storeFilePath = path.join(dataDir, 'store.json');

let mongoActive = false;
let localVideos = [];
let sequence = 1;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const DEFAULT_SEED_MEMORIES = [
  {
    _id: 'local-1',
    title: 'Traditional South Indian Dining & Food Experience',
    summary: 'Authentic South Indian street food experience, featuring fresh tiffin, crispy vada, spiced curries, and traditional banana leaf serving.',
    transcript: 'Welcome back guys! Today we are visiting this famous traditional food spot. Look at these hot fresh vadas, rich curry, and authentic banana leaf dining experience. Definitely a must-visit spot!',
    visualAnalysis: 'Close-up frames of chef preparing fresh vadas, serving spiced curries on fresh green banana leaves, customer enjoying hot traditional meal.',
    onScreenText: 'Traditional South Indian Dining · Fresh Hot Vada & Curries · Served on Fresh Banana Leaf',
    category: 'Food',
    subcategory: 'Traditional Street Food',
    tags: ['food', 'southindian', 'streetfood', 'bananaleaf', 'foodie'],
    entities: [{ name: 'Traditional Dining Spot', type: 'restaurant' }],
    locations: ['Local Food Street'],
    foods: ['Hot Vada', 'Spiced Curry', 'Traditional Meals'],
    products: [],
    activities: ['Dine Out', 'Food Tasting'],
    price: '$$ (₹150 - ₹350)',
    actionableIdeas: ['Visit for hot fresh afternoon tiffin', 'Try the traditional banana leaf meal combo'],
    processingStatus: 'COMPLETED',
    createdAt: new Date('2026-09-18T10:00:00Z'),
    updatedAt: new Date('2026-09-18T10:00:00Z')
  },
  {
    _id: 'local-2',
    title: 'Grand Dragon Chinese Restaurant',
    summary: 'Authentic Cantonese dim sum, hand-pulled noodles, and crispy Peking duck served with signature chili oil.',
    transcript: 'Welcome to Grand Dragon! Today we are trying their famous hand-pulled Dan Dan noodles and crispy Peking duck. Everything is made fresh daily.',
    visualAnalysis: 'Vibrant visuals of sizzled garlic oil, chef pulling fresh noodles, steaming bamboo dim sum baskets, and elegant red-gold interior decor.',
    onScreenText: 'Grand Dragon Chinese Restaurant · Signature Dan Dan Noodles ₹380 · Peking Duck ₹1200',
    category: 'Food',
    subcategory: 'Chinese Restaurant',
    tags: ['chinesefood', 'dimsum', 'pekingduck', 'dandannoodles', 'foodie'],
    entities: [{ name: 'Grand Dragon Chinese Restaurant', type: 'restaurant' }, { name: 'Peking Duck', type: 'dish' }],
    locations: ['Downtown Chinatown'],
    foods: ['Peking Duck', 'Dan Dan Noodles', 'Dim Sum'],
    products: ['Garlic Chili Oil Jar'],
    activities: ['Casual Dinner', 'Family Dining'],
    price: '$$ (₹500 - ₹1200)',
    actionableIdeas: ['Try the signature Dan Dan noodles', 'Book a table for weekend dim sum'],
    processingStatus: 'COMPLETED',
    createdAt: new Date('2026-09-18T11:00:00Z'),
    updatedAt: new Date('2026-09-18T11:00:00Z')
  },
  {
    _id: 'local-3',
    title: 'Pondicherry French Quarter Tour',
    summary: 'Scenic exploration through yellow pastel colonial streets, Promenade Beach, vibrant boutique cafes, and coastal views.',
    transcript: 'Exploring the dreamy French Colony in Pondicherry! Walking past bright yellow villas, grabbing gelato by Promenade Beach, and enjoying coastal breeze.',
    visualAnalysis: 'Pastel yellow colonial buildings with bougainvillea flowers, cobblestone streets, sunset at Promenade Beach.',
    onScreenText: 'Café des Arts · French Quarter Heritage Walk · Promenade Beach Promenade',
    category: 'Travel',
    subcategory: 'City Exploration',
    tags: ['pondicherry', 'travelvlog', 'frenchquarter', 'promenadebeach'],
    entities: [{ name: 'French Quarter Pondicherry', type: 'location' }],
    locations: ['Pondicherry', 'French Quarter', 'Promenade Beach'],
    foods: ['French Gelato', 'Seafood Crepes'],
    products: [],
    activities: ['Heritage Walk', 'Beach Stroll'],
    price: '$$ (Budget Friendly)',
    actionableIdeas: ['Rent a scooter for French Quarter streets', 'Visit Promenade Beach at sunset'],
    processingStatus: 'COMPLETED',
    createdAt: new Date('2026-09-18T12:00:00Z'),
    updatedAt: new Date('2026-09-18T12:00:00Z')
  }
];

function loadLocalStore() {
  try {
    ensureDataDir();
    if (fs.existsSync(storeFilePath)) {
      const content = fs.readFileSync(storeFilePath, 'utf-8');
      localVideos = JSON.parse(content || '[]');
    }
    if (!localVideos || localVideos.length === 0) {
      localVideos = [...DEFAULT_SEED_MEMORIES];
      saveLocalStore();
    }
    const maxSeq = localVideos.reduce((max, v) => {
      const num = parseInt(String(v._id).replace('local-', ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    sequence = maxSeq + 1;
  } catch (err) {
    console.warn('Could not load local video store from disk:', err.message);
    localVideos = [...DEFAULT_SEED_MEMORIES];
  }
}

function saveLocalStore() {
  try {
    ensureDataDir();
    fs.writeFileSync(storeFilePath, JSON.stringify(localVideos, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save local video store to disk:', err.message);
  }
}

loadLocalStore();

export function configureStore(active) {
  mongoActive = active;
  loadLocalStore();
}

const serialize = (video) => {
  if (!video) return null;
  const rawId = video._id || video._doc?._id || video.id;
  const obj = video.toObject ? video.toObject() : { ...video };
  const validRaw = rawId && String(rawId) !== 'undefined' && String(rawId) !== 'null' && String(rawId) !== '';
  if (validRaw) {
    obj._id = String(rawId);
  } else {
    const slug = (obj.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    obj._id = `legacy-${slug || 'item'}`;
  }
  return obj;
};

export async function createVideo(data) {
  if (mongoActive) {
    try {
      return serialize(await Video.create(data));
    } catch (e) {
      console.warn('Mongo create error, falling back to local store:', e.message);
    }
  }
  const record = { ...data, _id: `local-${sequence++}`, createdAt: new Date(), updatedAt: new Date() };
  localVideos.unshift(record);
  saveLocalStore();
  return record;
}

export async function listVideos(filter = {}) {
  let dbList = [];
  if (mongoActive) {
    try {
      dbList = (await Video.find(filter).sort({ createdAt: -1 })).map(serialize);
    } catch {}
  }
  loadLocalStore();
  const filteredLocal = localVideos.filter((video) => !filter.category || video.category === filter.category);
  const existingIds = new Set(dbList.map((v) => String(v._id)));
  const merged = [...dbList];
  for (const item of filteredLocal) {
    if (!existingIds.has(String(item._id))) {
      merged.push(item);
    }
  }
  return merged;
}

export async function getVideo(id) {
  if (mongoActive && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const doc = await Video.findById(id);
      if (doc) return serialize(doc);
    } catch {}
  }
  const all = await listVideos();
  return all.find((video) => String(video._id) === String(id));
}

export async function updateVideo(id, data) {
  if (mongoActive && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const doc = await Video.findByIdAndUpdate(id, data, { new: true });
      if (doc) return serialize(doc);
    } catch {}
  }
  loadLocalStore();
  const index = localVideos.findIndex((video) => String(video._id) === String(id));
  if (index >= 0) {
    localVideos[index] = { ...localVideos[index], ...data, updatedAt: new Date() };
    saveLocalStore();
    return localVideos[index];
  }
  return null;
}

export async function removeVideo(id) {
  if (mongoActive && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const doc = await Video.findByIdAndDelete(id);
      if (doc) return serialize(doc);
    } catch {}
  }
  loadLocalStore();
  const index = localVideos.findIndex((video) => String(video._id) === String(id));
  if (index < 0) return null;
  const removed = localVideos.splice(index, 1)[0];
  saveLocalStore();
  return removed;
}

