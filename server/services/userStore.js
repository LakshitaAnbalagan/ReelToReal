import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const userStoreFilePath = path.join(dataDir, 'users.json');

let mongoActive = false;
let localUsers = [];

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const DEFAULT_DEMO_USERS = [
  {
    _id: 'user-demo-1',
    name: 'Lakshita Anbalagan',
    email: 'lakshita@reeltoreal.ai',
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date('2026-09-18T10:00:00Z')
  }
];

function loadLocalUsers() {
  try {
    ensureDataDir();
    if (fs.existsSync(userStoreFilePath)) {
      const content = fs.readFileSync(userStoreFilePath, 'utf-8');
      localUsers = JSON.parse(content || '[]');
    }
    if (!localUsers || localUsers.length === 0) {
      localUsers = [...DEFAULT_DEMO_USERS];
      saveLocalUsers();
    }
  } catch (err) {
    console.warn('Could not load local users from disk:', err.message);
    localUsers = [...DEFAULT_DEMO_USERS];
  }
}

function saveLocalUsers() {
  try {
    ensureDataDir();
    fs.writeFileSync(userStoreFilePath, JSON.stringify(localUsers, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save local users to disk:', err.message);
  }
}

loadLocalUsers();

export function configureUserStore(active) {
  mongoActive = active;
  loadLocalUsers();
}

const serializeUser = (user) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  obj._id = String(video_id(obj));
  delete obj.password;
  return obj;
};

function video_id(obj) {
  return obj._id || obj._doc?._id || obj.id || `user-${Date.now()}`;
}

export async function findUserByEmail(email) {
  const normalized = String(email || '').toLowerCase().trim();
  if (mongoActive) {
    try {
      const doc = await User.findOne({ email: normalized });
      if (doc) return doc.toObject();
    } catch {}
  }
  loadLocalUsers();
  return localUsers.find((u) => String(u.email).toLowerCase() === normalized) || null;
}

export async function createUser({ name, email, password, avatar }) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  if (mongoActive) {
    try {
      const created = await User.create({ name, email: normalizedEmail, password, avatar });
      return serializeUser(created);
    } catch (e) {
      console.warn('Mongo user create error, falling back to local store:', e.message);
    }
  }

  const newRecord = {
    _id: `user-${Date.now()}`,
    name,
    email: normalizedEmail,
    password,
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  localUsers.push(newRecord);
  saveLocalUsers();
  return serializeUser(newRecord);
}

export async function getUserById(id) {
  if (mongoActive && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const doc = await User.findById(id);
      if (doc) return serializeUser(doc);
    } catch {}
  }
  loadLocalUsers();
  const found = localUsers.find((u) => String(u._id) === String(id));
  return serializeUser(found);
}
