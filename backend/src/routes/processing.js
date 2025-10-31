import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createProcessingJob,
  getLatestProcessingJobByRef,
  getProcessingJobById,
  getProcessingJobByProcessorId,
  listProcessingJobsPaginated,
  countProcessingJobs,
  summarizeProcessingJobsByStatus,
  updateProcessingJob
} from '../data/processingJobsStore.js';
import { getMediaItemById, getMediaItemByRef } from '../data/mediaLibraryStore.js';
import { enqueueProcessorJob } from '../services/mediaProcessing.js';
import {
  IN_PROGRESS_STATUSES,
  normalizeStatus,
  syncJobWithProcessor
} from '../services/processingSync.js';

const router = express.Router();

router.post(
  '/jobs',
  asyncHandler(async (req, res) => {
    const { mediaId, ref, priority, queuedBy } = req.body ?? {};

    if (!mediaId && !ref) {
      return res.status(400).json({ error: 'mediaId or ref is required to enqueue processing.' });
    }

    let targetMedia = null;
    if (mediaId) {
      targetMedia = await getMediaItemById(mediaId);
      if (!targetMedia) {
        return res.status(404).json({ error: 'Media item not found for provided mediaId.' });
      }
    }

    const reference = targetMedia?.ref ?? `${ref ?? ''}`.trim();
    if (!reference) {
      return res.status(400).json({ error: 'A valid media reference is required to enqueue processing.' });
    }

    if (!targetMedia && reference) {
      targetMedia = await getMediaItemByRef(reference);
    }

    let worker;
    let processorPayload;

    try {
      const result = await enqueueProcessorJob(reference);
      worker = result.worker;
      processorPayload = result.payload;
    } catch (error) {
      if (
        error?.message?.includes?.('No active media processing workers') ||
        error?.message?.includes?.('No registered media worker')
      ) {
        return res.status(error.status ?? 503).json({ error: 'No registered media worker' });
      }
      throw error;
    }

    const job = await createProcessingJob({
      mediaItemId: targetMedia?.id ?? null,
      ref: reference,
      status: normalizeStatus(processorPayload.status) || 'queued',
      progressMessage: processorPayload.progressMessage ?? 'Queued',
      processorJobId: processorPayload.queryId,
      processorWorkerId: worker?.id ?? null,
      queuedBy: queuedBy ?? null,
      priority: priority ?? 'normal'
    });

    const syncedJob = await syncJobWithProcessor(job);

    return res.status(202).json({
      job: syncedJob
    });
  })
);

router.get(
  '/jobs',
  asyncHandler(async (req, res) => {
    const { page: rawPage, pageSize: rawPageSize } = req.query ?? {};

    const parsedPage = Number.parseInt(rawPage ?? '1', 10);
    const parsedPageSize = Number.parseInt(rawPageSize ?? '20', 10);

    const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? Math.min(parsedPageSize, 200)
      : 20;

    const totalCount = await countProcessingJobs();
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    const normalizedPage =
      totalPages === 0
        ? 1
        : Math.min(Math.max(Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1, 1), totalPages);

    const offset = totalCount === 0 ? 0 : (normalizedPage - 1) * pageSize;

    const jobs = totalCount === 0
      ? []
      : await listProcessingJobsPaginated({
          limit: pageSize,
          offset
        });

    const syncedJobs = [];

    for (const job of jobs) {
      const synced = await syncJobWithProcessor(job);
      syncedJobs.push(synced);
    }

    const statusSummary = await summarizeProcessingJobsByStatus();

    return res.status(200).json({
      jobs: syncedJobs,
      count: syncedJobs.length,
      totalCount,
      page: totalCount === 0 ? 0 : normalizedPage,
      pageSize,
      totalPages,
      statusSummary
    });
  })
);

router.get(
  '/jobs/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const job = await getProcessingJobById(id);

    if (!job) {
      return res.status(404).json({ error: 'Processing job not found.' });
    }

    const syncedJob = await syncJobWithProcessor(job);

    return res.status(200).json({ job: syncedJob });
  })
);

router.post(
  '/jobs/status',
  asyncHandler(async (req, res) => {
    const { ref, status, progressMessage, result, error, processorJobId, processorWorkerId } = req.body ?? {};

    const normalizedRef = `${ref ?? ''}`.trim();
    if (!normalizedRef) {
      return res.status(400).json({ error: 'ref is required to update processing status.' });
    }

    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      return res.status(400).json({ error: 'status is required to update processing status.' });
    }

    let job = null;

    if (processorJobId) {
      job = await getProcessingJobByProcessorId(processorJobId);
    }

    if (!job) {
      job = await getLatestProcessingJobByRef(normalizedRef);
    }

    if (!job) {
      const media = await getMediaItemByRef(normalizedRef);
      job = await createProcessingJob({
        mediaItemId: media?.id ?? null,
        ref: normalizedRef,
        status: normalizedStatus,
        progressMessage: progressMessage ?? null,
        processorJobId: processorJobId ?? null,
        processorWorkerId: processorWorkerId ?? null,
        priority: 'normal',
        result: result ?? null
      });
    }

    const updates = {
      status: normalizedStatus,
      progressMessage: progressMessage ?? job.progressMessage ?? null,
      result: result ?? job.result ?? null,
      error: error ?? null,
      lastSyncedAt: new Date().toISOString()
    };

    if (processorWorkerId) {
      updates.processorWorkerId = processorWorkerId;
    }

    if (!job.startedAt && IN_PROGRESS_STATUSES.has(normalizedStatus) && normalizedStatus !== 'queued') {
      updates.startedAt = new Date().toISOString();
    }

    if (normalizedStatus === 'completed' && !job.completedAt) {
      updates.completedAt = new Date().toISOString();
    }

    const updatedJob = await updateProcessingJob(job.id, updates);
    const syncedJob = await syncJobWithProcessor(updatedJob);

    return res.status(200).json({ job: syncedJob });
  })
);

export default router;
