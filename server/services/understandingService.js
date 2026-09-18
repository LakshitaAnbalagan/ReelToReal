import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile as execFileCallback } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import ffmpegPath from 'ffmpeg-static';
import { createLocalEmbedding } from './embeddingService.js';
import { downloadPublicVideo } from './urlDownloadService.js';

const execFile = promisify(execFileCallback);
const categories = ['Food', 'Travel', 'Fitness', 'Shopping', 'Recipes', 'Entertainment', 'Events', 'Education', 'Lifestyle', 'Other'];
const asList = (value) => Array.isArray(value) ? value.filter(Boolean).map(String) : [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runFfmpeg(args) {
  const binary = process.env.FFMPEG_PATH && process.env.FFMPEG_PATH !== 'ffmpeg' ? process.env.FFMPEG_PATH : ffmpegPath;
  if (!binary) throw new Error('FFmpeg is unavailable. Run npm install, then restart the server.');
  await execFile(binary, ['-y', ...args], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
}

async function extractMedia(videoPath, tempDir) {
  const audioPath = path.join(tempDir, 'audio.mp3');
  const framePattern = path.join(tempDir, 'frame-%02d.jpg');
  await runFfmpeg(['-i', videoPath, '-vf', 'fps=1/4,scale=768:-2', '-frames:v', '5', '-q:v', '4', framePattern]);
  let audioAvailable = true;
  try { await runFfmpeg(['-i', videoPath, '-t', '90', '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', audioPath]); } catch { audioAvailable = false; }
  const frameNames = (await fsp.readdir(tempDir)).filter((name) => /^frame-\d+\.jpg$/.test(name)).sort();
  if (!frameNames.length) throw new Error('No readable video frames could be extracted from this upload.');
  return { audioPath, audioAvailable, framePaths: frameNames.map((name) => path.join(tempDir, name)) };
}

async function withRetry(operation, label) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      const retryable = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(error?.cause?.code);
      if (!retryable || attempt === 2) break;
      await pause(1000 * (attempt + 1));
    }
  }
  throw new Error(`${label} failed: ${lastError?.message || lastError?.cause?.code || 'unknown provider error'}`);
}

function prompt() {
  return `Analyze this saved short video using its representative frames and audio. Return JSON only. Do not invent a restaurant, location, brand, price, ingredient, or fact that is not visible or spoken. Unknown values must be [] or "Not mentioned". Create the transcript from the supplied audio; if there is no speech, say "No spoken words were detected." Required schema: {"title":"","summary":"","transcript":"","category":"Food|Travel|Fitness|Shopping|Recipes|Entertainment|Events|Education|Lifestyle|Other","subcategory":"","tags":[""],"entities":[{"name":"","type":""}],"locations":[""],"foods":[""],"products":[""],"activities":[""],"price":"","actionableIdeas":[""],"visualAnalysis":""}.`;
}

function normalize(raw) {
  const transcript = String(raw.transcript || 'No spoken words were detected.');
  const result = {
    title: String(raw.title || 'Saved video'), summary: String(raw.summary || 'AI analyzed this saved video.'), transcript,
    category: categories.includes(raw.category) ? raw.category : 'Other', subcategory: String(raw.subcategory || 'Saved video'),
    tags: asList(raw.tags).slice(0, 10), entities: Array.isArray(raw.entities) ? raw.entities.filter((item) => item?.name).slice(0, 10).map((item) => ({ name: String(item.name), type: String(item.type || 'item') })) : [],
    locations: asList(raw.locations).slice(0, 8), foods: asList(raw.foods).slice(0, 10), products: asList(raw.products).slice(0, 10), activities: asList(raw.activities).slice(0, 8),
    price: String(raw.price || 'Not mentioned'), actionableIdeas: asList(raw.actionableIdeas).slice(0, 5), visualAnalysis: String(raw.visualAnalysis || 'Representative frames were analyzed.')
  };
  result.embedding = createLocalEmbedding([result.title, result.summary, transcript, ...result.tags, ...result.locations, ...result.foods, ...result.activities].join(' '));
  return result;
}

async function analyzeWithGemini(media) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini. Add it to .env and restart the server.');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const parts = [{ text: prompt() }];
  if (media.audioAvailable) parts.push({ inlineData: { mimeType: 'audio/mpeg', data: await fsp.readFile(media.audioPath, 'base64') } });
  for (const framePath of media.framePaths) parts.push({ inlineData: { mimeType: 'image/jpeg', data: await fsp.readFile(framePath, 'base64') } });
  const response = await withRetry(() => ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', contents: [{ role: 'user', parts }], config: { responseMimeType: 'application/json', temperature: 0.2 } }), 'Gemini analysis');
  return JSON.parse(response.text || '{}');
}

async function analyzeWithOpenAI(media) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai. Add it to .env and restart the server.');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 90_000 });
  let transcript = 'No audio track was available in this video.';
  if (media.audioAvailable) {
    try { const response = await withRetry(() => openai.audio.transcriptions.create({ file: fs.createReadStream(media.audioPath), model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe' }), 'OpenAI transcription'); transcript = response.text || transcript; }
    catch (error) { console.warn(error.message); transcript = 'Audio transcription was temporarily unavailable. Visual analysis is based on the actual video frames.'; }
  }
  const images = await Promise.all(media.framePaths.map(async (framePath) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await fsp.readFile(framePath, 'base64')}`, detail: 'low' } })));
  const response = await withRetry(() => openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', response_format: { type: 'json_object' }, temperature: 0.2, messages: [{ role: 'system', content: 'You extract accurate structured knowledge from short videos.' }, { role: 'user', content: [{ type: 'text', text: `${prompt()}\nTranscript:\n${transcript}` }, ...images] }] }), 'OpenAI visual analysis');
  return { ...JSON.parse(response.choices[0]?.message?.content || '{}'), transcript };
}

export async function understandVideo({ filePath, sourceUrl }) {
  let savedFileUrl;
  if (!filePath || !fs.existsSync(filePath)) { const downloaded = await downloadPublicVideo(sourceUrl); filePath = downloaded.filePath; savedFileUrl = downloaded.fileUrl; }
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'reeltoreal-'));
  try {
    const media = await extractMedia(filePath, tempDir);
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const raw = provider === 'gemini' ? await analyzeWithGemini(media) : await analyzeWithOpenAI(media);
    return { ...normalize(raw), ...(savedFileUrl ? { fileUrl: savedFileUrl } : {}) };
  } finally { await fsp.rm(tempDir, { recursive: true, force: true }); }
}
