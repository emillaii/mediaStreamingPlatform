import express from 'express';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

const app = express();
const port = process.env.PORT || 3001;
const TEMP_DIR = path.join(process.cwd(), 'temp');
const PROFILES_PATH = path.join(process.cwd(), 'encoding-profiles.json');
const RESOURCE_SPACE_ENDPOINT = 'https://mmer.hkmu.edu.hk/resourcespace/pages/download_mp4.php';
const RESOURCE_SPACE_REFERER = process.env.RESOURCE_SPACE_REFERER ?? 'https://ole.hkmu.edu.hk/';
const RESOURCE_SPACE_COOKIE =
  process.env.RESOURCE_SPACE_COOKIE ?? 'css_reload_key=242; cookiecheck=true';

const sanitizeForFs = (value) => value.replace(/[^a-zA-Z0-9-_]/g, '_');

const JOB_STATUSES = Object.freeze({
  queued: 'queued',
  downloading: 'downloading',
  encoding: 'encoding',
  completed: 'completed',
  failed: 'failed'
});

const jobs = new Map();
const jobQueue = [];
let activeJobs = 0;

const processorConfig = {
  concurrency: 1
};

const createJobRecord = (ref) => {
  const now = new Date().toISOString();
  const job = {
    id: randomUUID(),
    ref,
    status: JOB_STATUSES.queued,
    progressMessage: 'Queued',
    createdAt: now,
    updatedAt: now
  };
  jobs.set(job.id, job);
  return job;
};

const updateJob = (job, updates = {}) => {
  Object.assign(job, updates);
  job.updatedAt = new Date().toISOString();
  jobs.set(job.id, job);
  return job;
};

const setJobStatus = (job, status, updates = {}) => {
  return updateJob(job, { status, ...updates });
};

const getJobSummary = (job) => ({
  queryId: job.id,
  ref: job.ref,
  status: job.status,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  sanitizedRef: job.sanitizedRef,
  sourceUrl: job.sourceUrl,
  directories: job.directories,
  mp4: job.result?.mp4,
  hls: job.result?.hls,
  thumbnail: job.result?.thumbnail,
  progressMessage: job.progressMessage ?? null,
  error: job.error ?? null
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'media-processing',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const runFfmpegDownload = (inputUrl, outputPath, headers) => new Promise((resolve, reject) => {
  const ffmpegArgs = ['-y'];

  if (headers) {
    ffmpegArgs.push('-headers', headers);
  }

  ffmpegArgs.push('-i', inputUrl, '-c', 'copy', outputPath);

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.on('error', reject);

  ffmpeg.stderr.on('data', (data) => {
    console.log(`[ffmpeg] ${data}`.trimEnd());
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      resolve(outputPath);
    } else {
      reject(new Error(`ffmpeg exited with code ${code}`));
    }
  });
});

const captureFrameFromSource = (source, outputPath, { seekSeconds = 0, headers } = {}) =>
  new Promise((resolve, reject) => {
    const args = ['-y'];

    if (seekSeconds > 0) {
      args.push('-ss', String(seekSeconds));
    }

    if (headers) {
      args.push('-headers', headers);
    }

    args.push('-i', source, '-frames:v', '1', '-q:v', '2', outputPath);

    const ffmpeg = spawn('ffmpeg', args);

    ffmpeg.on('error', reject);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`[ffmpeg-thumb] ${data}`.trimEnd());
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });

const isImageMostlyDark = async (imagePath, threshold = 12) =>
  new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-i', imagePath, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);

    let total = 0;
    let count = 0;

    ffmpeg.stdout.on('data', (chunk) => {
      for (let i = 0; i < chunk.length; i += 1) {
        total += chunk[i];
      }
      count += chunk.length;
    });

    ffmpeg.on('error', reject);

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg luminance analysis exited with code ${code}`));
      }

      if (count === 0) {
        return resolve(true);
      }

      const average = total / count;
      resolve(average <= threshold);
    });
  });

const createThumbnailFromSource = async (source, outputPath, options = {}) => {
  const seekAttempts = Array.isArray(options.seeks) && options.seeks.length > 0 ? options.seeks : [0, 3, 6, 9];

  for (const seekSeconds of seekAttempts) {
    await captureFrameFromSource(source, outputPath, { ...options, seekSeconds });

    try {
      const isDark = await isImageMostlyDark(outputPath);

      if (!isDark) {
        return outputPath;
      }

      console.warn(`Thumbnail captured at ${seekSeconds}s appears dark; trying next offset.`);
    } catch (analysisError) {
      console.warn('Thumbnail brightness analysis failed; using current frame.', analysisError);
      return outputPath;
    }
  }

  return outputPath;
};

const parseBitrate = (bitrate) => {
  if (typeof bitrate === 'number') {
    return bitrate;
  }

  if (typeof bitrate !== 'string') {
    return 0;
  }

  const match = bitrate.trim().match(/^(\d+(?:\.\d+)?)([kKmM]?)$/);

  if (!match) {
    return 0;
  }

  let value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'k') {
    value *= 1000;
  } else if (unit === 'm') {
    value *= 1000 * 1000;
  }

  return Math.round(value);
};

const profilesCache = {
  promise: null,
  value: null
};

const loadEncodingProfiles = async () => {
  if (profilesCache.value) {
    return profilesCache.value;
  }

  if (!profilesCache.promise) {
    profilesCache.promise = fs
      .readFile(PROFILES_PATH, 'utf-8')
      .then((raw) => JSON.parse(raw))
      .catch((error) => {
        console.error('Failed to load encoding profiles:', error);
        throw new Error('Unable to load encoding profiles configuration');
      });
  }

  profilesCache.value = await profilesCache.promise;
  return profilesCache.value;
};

const createVariantHls = async (inputPath, outputDir, profile, variantName) => {
  const variantDir = path.join(outputDir, variantName);
  await fs.mkdir(variantDir, { recursive: true });

  const playlistPath = path.join(variantDir, 'playlist.m3u8');
  const segmentPattern = path.join(variantDir, 'segment_%03d.ts');
  const videoBitrate = profile.videoBitrate ?? '3000k';
  const audioBitrate = profile.audioBitrate ?? '128k';
  const maxVideoBitrate = profile.maxVideoBitrate ?? videoBitrate;
  const videoBufsize = profile.videoBufsize ?? maxVideoBitrate;
  const scaleWidth = profile.width ?? -2;
  const hlsTime = `${profile.hlsTime ?? 6}`;
  const audioChannels = `${profile.audioChannels ?? 2}`;

  const ffmpegArgs = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    `scale=${scaleWidth}:${profile.height}`,
    '-c:v',
    profile.videoCodec ?? 'libx264',
    '-preset',
    profile.preset ?? 'veryfast',
    '-profile:v',
    profile.profile ?? 'main',
    '-b:v',
    videoBitrate,
    '-maxrate',
    maxVideoBitrate,
    '-bufsize',
    videoBufsize,
    '-c:a',
    profile.audioCodec ?? 'aac',
    '-b:a',
    audioBitrate,
    '-ac',
    audioChannels,
    '-hls_time',
    hlsTime,
    '-hls_playlist_type',
    'vod',
    '-hls_segment_filename',
    segmentPattern,
    '-hls_flags',
    'independent_segments',
    playlistPath
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.on('error', reject);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`[ffmpeg-hls:${variantName}] ${data}`.trimEnd());
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const bandwidth =
          parseBitrate(videoBitrate) + parseBitrate(audioBitrate);
        const widthValue = typeof profile.width === 'number' ? profile.width : 0;
        const resolution = `${widthValue}x${profile.height}`;
        resolve({
          name: profile.name ?? variantName,
          playlistPath,
          relativePlaylist: path.posix.join(variantName, 'playlist.m3u8'),
          bandwidth,
          resolution
        });
      } else {
        reject(new Error(`ffmpeg HLS conversion exited with code ${code} for profile ${variantName}`));
      }
    });
  });
};

const createMasterPlaylist = async (outputDir, variants) => {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];

  for (const variant of variants) {
    const bandwidth = Math.max(variant.bandwidth, 1);
    const [widthText] = variant.resolution.split('x');
    const widthValue = Number.parseInt(widthText, 10);
    const resolutionAttribute =
      Number.isFinite(widthValue) && widthValue > 0
        ? `,RESOLUTION=${variant.resolution}`
        : '';
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth}${resolutionAttribute}`);
    lines.push(variant.relativePlaylist);
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  await fs.writeFile(masterPath, `${lines.join('\n')}\n`, 'utf-8');
  return masterPath;
};

const createHlsOutputs = async (inputPath, outputDir, profiles) => {
  const variants = [];

  for (const profile of profiles) {
    const variantName = sanitizeForFs(profile.name ?? `${profile.height}p`);
    const variant = await createVariantHls(inputPath, outputDir, profile, variantName);
    variants.push(variant);
  }

  if (variants.length === 0) {
    throw new Error('No encoding variants were produced');
  }

  const masterPlaylist = await createMasterPlaylist(outputDir, variants);
  return { variants, masterPlaylist };
};

const runDownloadJob = async (job) => {
  try {
    const { sanitizedRef, refDir, mp4Dir, hlsDir } = await ensureOutputDirs(job.ref);
    updateJob(job, {
      sanitizedRef,
      directories: {
        refDir,
        mp4Dir,
        hlsDir
      },
      progressMessage: 'Preparing directories'
    });

    setJobStatus(job, JOB_STATUSES.downloading, {
      progressMessage: 'Downloading source media'
    });

    const outputFilename = `${randomUUID()}.mp4`;
    const outputPath = path.join(mp4Dir, outputFilename);

    const downloadUrl = await fetchMediaDownloadUrl(job.ref);
    updateJob(job, { sourceUrl: downloadUrl });

    const headerString = `Referer: ${RESOURCE_SPACE_REFERER}\r\nCookie: ${RESOURCE_SPACE_COOKIE}\r\n`;
    await runFfmpegDownload(downloadUrl, outputPath, headerString);

    let thumbnailRecord = null;
    const primaryThumbnailPath = path.join(refDir, 'thumbnail.jpg');
    try {
      const chosenThumbnailPath = await createThumbnailFromSource(outputPath, primaryThumbnailPath);
      thumbnailRecord = {
        path: chosenThumbnailPath,
        filename: path.basename(chosenThumbnailPath)
      };
    } catch (thumbnailError) {
      console.error(`Thumbnail generation failed for job ${job.id}`, thumbnailError);
    }

    setJobStatus(job, JOB_STATUSES.encoding, {
      progressMessage: 'Encoding HLS variants'
    });

    const profiles = await loadEncodingProfiles();

    if (!Array.isArray(profiles) || profiles.length === 0) {
      throw new Error('No encoding profiles configured');
    }

    const { variants, masterPlaylist } = await createHlsOutputs(outputPath, hlsDir, profiles);

    setJobStatus(job, JOB_STATUSES.completed, {
      progressMessage: 'Completed',
      result: {
        mp4: {
          path: outputPath,
          filename: outputFilename
        },
        hls: {
          masterPlaylist,
          variants: variants.map((variant) => ({
            name: variant.name,
            playlistPath: variant.playlistPath,
            relativePlaylist: variant.relativePlaylist,
            bandwidth: variant.bandwidth,
            resolution: variant.resolution
          }))
        },
        thumbnail: thumbnailRecord
      }
    });
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    setJobStatus(job, JOB_STATUSES.failed, {
      progressMessage: 'Failed',
      error: error.message,
      result: undefined
    });
  }
};

const fetchMediaDownloadUrl = async (ref) => {
  const requestUrl = new URL(RESOURCE_SPACE_ENDPOINT);
  requestUrl.searchParams.set('ref', ref);
  requestUrl.searchParams.set('ext', 'mp4');
  requestUrl.searchParams.set('m', 'ajax');

  const response = await fetch(requestUrl, {
    headers: {
      Referer: RESOURCE_SPACE_REFERER,
      Cookie: RESOURCE_SPACE_COOKIE
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get media download url (status ${response.status})`);
  }

  const payloadText = (await response.text()).trim();
  let parsed;

  try {
    parsed = JSON.parse(payloadText);
  } catch {
    parsed = payloadText;
  }

  let downloadUrl;

  if (typeof parsed === 'string') {
    downloadUrl = parsed.replace(/\\\//g, '/');
  } else if (parsed && typeof parsed === 'object') {
    const candidates = [parsed.url, parsed.href, parsed.link, parsed.path];
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim() !== '') {
        downloadUrl = value.replace(/\\\//g, '/');
        break;
      }
    }
  }

  if (!downloadUrl || !downloadUrl.startsWith('http')) {
    throw new Error('Unexpected response format when fetching media URL');
  }

  return downloadUrl;
};

const ensureOutputDirs = async (ref) => {
  await fs.mkdir(TEMP_DIR, { recursive: true });

  const sanitizedRef = sanitizeForFs(ref);
  const refDir = path.join(TEMP_DIR, sanitizedRef);
  const mp4Dir = path.join(refDir, 'mp4');
  const hlsDir = path.join(refDir, 'hls');

  await fs.mkdir(mp4Dir, { recursive: true });
  await fs.mkdir(hlsDir, { recursive: true });

  return { sanitizedRef, refDir, mp4Dir, hlsDir };
};

const dispatchNextJobs = () => {
  while (activeJobs < processorConfig.concurrency && jobQueue.length > 0) {
    const jobId = jobQueue.shift();
    const job = jobs.get(jobId);

    if (!job || job.status !== JOB_STATUSES.queued) {
      continue;
    }

    activeJobs += 1;

    setImmediate(() => {
      runDownloadJob(job)
        .catch((error) => {
          console.error(`Unexpected job error for ${job.id}:`, error);
          setJobStatus(job, JOB_STATUSES.failed, {
            progressMessage: 'Failed',
            error: error.message,
            result: undefined
          });
        })
        .finally(() => {
          activeJobs = Math.max(activeJobs - 1, 0);
          dispatchNextJobs();
        });
    });
  }
};

const enqueueJobExecution = (job) => {
  jobQueue.push(job.id);
  dispatchNextJobs();
};

app.post('/media/download', async (req, res) => {
  const { ref } = req.body ?? {};

  if (typeof ref !== 'string' || ref.trim() === '') {
    return res.status(400).json({ error: 'ref is required' });
  }

  const trimmedRef = ref.trim();

  const job = createJobRecord(trimmedRef);

  enqueueJobExecution(job);

  return res.status(202).json({
    queryId: job.id,
    status: job.status,
    progressMessage: job.progressMessage,
    createdAt: job.createdAt
  });
});

app.post('/media/thumbnail', async (req, res) => {
  const { ref } = req.body ?? {};

  if (typeof ref !== 'string' || ref.trim() === '') {
    return res.status(400).json({ error: 'ref is required' });
  }

  const trimmedRef = ref.trim();

  try {
    const { sanitizedRef, refDir } = await ensureOutputDirs(trimmedRef);

    const downloadUrl = await fetchMediaDownloadUrl(trimmedRef);
    const headerString = `Referer: ${RESOURCE_SPACE_REFERER}\r\nCookie: ${RESOURCE_SPACE_COOKIE}\r\n`;

    const thumbnailPath = path.join(refDir, 'thumbnail.jpg');
    await createThumbnailFromSource(downloadUrl, thumbnailPath, { headers: headerString });

    return res.status(201).json({
      ref: trimmedRef,
      sanitizedRef,
      thumbnail: {
        path: thumbnailPath,
        filename: path.basename(thumbnailPath)
      },
      sourceUrl: downloadUrl
    });
  } catch (error) {
    console.error(`Thumbnail generation request failed for ref ${ref}:`, error);
    return res.status(500).json({ error: error.message ?? 'Failed to generate thumbnail' });
  }
});

app.get('/media/download/:queryId/status', (req, res) => {
  const { queryId } = req.params;
  const job = jobs.get(queryId);

  if (!job) {
    return res.status(404).json({ error: 'Query not found' });
  }

  return res.status(200).json(getJobSummary(job));
});

app.get('/config', (_req, res) => {
  res.status(200).json({
    concurrency: processorConfig.concurrency,
    queueSize: jobQueue.length,
    activeJobs
  });
});

app.put('/config', (req, res) => {
  const { concurrency } = req.body ?? {};
  const parsed = Number(concurrency);

  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 1) {
    return res.status(400).json({ error: 'concurrency must be a positive number' });
  }

  processorConfig.concurrency = Math.floor(parsed);
  dispatchNextJobs();

  return res.status(200).json({
    concurrency: processorConfig.concurrency,
    queueSize: jobQueue.length,
    activeJobs
  });
});

app.listen(port, () => {
  console.log(`Media processing service listening on port ${port}`);
});
