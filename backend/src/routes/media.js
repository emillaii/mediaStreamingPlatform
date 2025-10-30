import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAllMediaItems, upsertMediaEntries } from '../data/mediaLibraryStore.js';
import { fetchMediaDownloadUrl } from '../services/resourceSpace.js';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search } = req.query ?? {};
    const media = await getAllMediaItems({ search });

    return res.status(200).json({
      media,
      count: media.length
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
    const media = await getAllMediaItems();

    return res.status(201).json({
      imported,
      invalid,
      count: media.length,
      media
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
