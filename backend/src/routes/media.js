import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAllMediaItems, upsertMediaEntries } from '../data/mediaLibraryStore.js';
import { getLatestProcessingJobByRef } from '../data/processingJobsStore.js';
import { fetchMediaDownloadUrl } from '../services/resourceSpace.js';
import { syncJobWithProcessor } from '../services/processingSync.js';

const router = express.Router();

const refreshMediaStatuses = async (mediaItems) => {
  const refs = [...new Set(mediaItems.map((item) => item.ref).filter(Boolean))];

  if (refs.length === 0) {
    return false;
  }

  let updated = false;

  for (const ref of refs) {
    const job = await getLatestProcessingJobByRef(ref);

    if (!job) {
      continue;
    }

    const previousStatus = job.status;
    const syncedJob = await syncJobWithProcessor(job);

    if (syncedJob && syncedJob.status !== previousStatus) {
      updated = true;
    }
  }

  return updated;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = req.query ?? {};

    const pageNumber = Math.max(Number.parseInt(page ?? '1', 10) || 1, 1);
    const pageSizeNumberRaw = Number.parseInt(pageSize ?? '20', 10);
    const pageSizeNumber = Math.min(Math.max(pageSizeNumberRaw || 20, 1), 200);

    let mediaResult = await getAllMediaItems({
      search,
      page: pageNumber,
      pageSize: pageSizeNumber
    });

    const statusesUpdated = await refreshMediaStatuses(mediaResult.items);

    if (statusesUpdated) {
      mediaResult = await getAllMediaItems({
        search,
        page: pageNumber,
        pageSize: pageSizeNumber
      });
    }

    const totalPages = Math.max(1, Math.ceil(mediaResult.total / mediaResult.pageSize));

    return res.status(200).json({
      media: mediaResult.items,
      total: mediaResult.total,
      page: mediaResult.page,
      pageSize: mediaResult.pageSize,
      totalPages
    });
  })
);

router.post(
  '/import',
  asyncHandler(async (req, res) => {
    const payload = req.body;

    const entries = Array.isArray(payload) ? payload : payload?.items ?? payload?.media;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Upload payload must be an array of metadata entries' });
    }

    const { imported, invalid } = await upsertMediaEntries(entries);
    const mediaResult = await getAllMediaItems({ page: 1, pageSize: 20 });
    const totalPages = Math.max(1, Math.ceil(mediaResult.total / mediaResult.pageSize));

    return res.status(201).json({
      imported,
      invalid,
      total: mediaResult.total,
      page: mediaResult.page,
      pageSize: mediaResult.pageSize,
      totalPages,
      media: mediaResult.items
    });
  })
);

router.get(
  '/:ref/download-url',
  asyncHandler(async (req, res) => {
    const { ref } = req.params ?? {};

    if (!ref) {
      return res.status(400).json({ error: 'Media reference is required' });
    }

    const downloadUrl = await fetchMediaDownloadUrl(ref);

    return res.status(200).json({
      ref,
      downloadUrl
    });
  })
);

export default router;
