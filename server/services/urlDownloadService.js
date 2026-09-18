import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import youtubedl from 'yt-dlp-exec';

const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
const allowedHosts = new Set(['instagram.com', 'www.instagram.com', 'youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']);

export async function downloadPublicVideo(sourceUrl) {
  const url = new URL(sourceUrl);
  if (!allowedHosts.has(url.hostname.toLowerCase())) throw new Error('Only public Instagram and YouTube URLs are supported. Upload the video file for other sources.');
  await fs.mkdir(uploadsDir, { recursive: true });
  const before = new Map(await Promise.all((await fs.readdir(uploadsDir)).map(async (name) => {
    const stat = await fs.stat(path.join(uploadsDir, name));
    return [name, `${stat.size}:${stat.mtimeMs}`];
  })));
  let downloaderOutput = '';
  try {
    downloaderOutput = String(await youtubedl(sourceUrl, { noPlaylist: true, noWarnings: true, format: 'mp4/best', output: path.join(uploadsDir, 'url-%(id)s.%(ext)s'), restrictFilenames: true, print: 'after_move:filepath' }));
  } catch (error) {
    throw new Error('This public video could not be downloaded. Instagram may require login or block this Reel. Download the Reel in Instagram and upload the MP4 instead.');
  }
  const outputPath = downloaderOutput.split(/\r?\n/).map((line) => line.trim()).reverse().find((line) => line && path.isAbsolute(line));
  const candidates = await Promise.all((await fs.readdir(uploadsDir)).filter((name) => /\.(mp4|mov|webm|mkv)$/i.test(name)).map(async (name) => ({ name, stat: await fs.stat(path.join(uploadsDir, name)) })));
  const printedName = outputPath && path.basename(outputPath);
  const changed = candidates.filter(({ name, stat }) => before.get(name) !== `${stat.size}:${stat.mtimeMs}`).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  const fileName = (printedName && candidates.find(({ name }) => name === printedName)?.name) || changed[0]?.name;
  if (!fileName) throw new Error('The video downloader finished but did not return its output file. Please retry the link once, or upload the MP4 instead.');
  return { filePath: path.join(uploadsDir, fileName), fileUrl: `/uploads/${fileName}` };
}
