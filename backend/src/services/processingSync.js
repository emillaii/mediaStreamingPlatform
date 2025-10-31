import {
  updateProcessingJob
} from '../data/processingJobsStore.js';
import { getProcessorJobStatus } from './mediaProcessing.js';

export const TERMINAL_STATUSES = new Set(['completed', 'failed']);
export const IN_PROGRESS_STATUSES = new Set(['queued', 'downloading', 'encoding', 'processing']);

export const normalizeStatus = (status) => (typeof status === 'string' ? status.toLowerCase() : 'queued');

export const syncJobWithProcessor = async (job) => {
  if (!job?.processorJobId || TERMINAL_STATUSES.has(normalizeStatus(job.status))) {
    return job;
  }

  try {
    const processorStatus = await getProcessorJobStatus(job.processorWorkerId ?? null, job.processorJobId);
    const nextStatus = normalizeStatus(processorStatus.status) || job.status;
    const updates = {
      status: nextStatus,
      progressMessage: processorStatus.progressMessage ?? job.progressMessage ?? null,
      lastSyncedAt: new Date().toISOString(),
      result: processorStatus.result ?? job.result ?? null
    };

    if (processorStatus.error) {
      updates.error = processorStatus.error;
    }

    if (!job.startedAt && IN_PROGRESS_STATUSES.has(nextStatus) && nextStatus !== 'queued') {
      updates.startedAt = new Date().toISOString();
    }

    if (nextStatus === 'completed' && !job.completedAt) {
      updates.completedAt = new Date().toISOString();
    }

    if (nextStatus === 'failed' && !updates.error) {
      updates.error = processorStatus.error ?? 'Processing failed';
    }

    const updatedJob = await updateProcessingJob(job.id, updates);
    return updatedJob ?? job;
  } catch (error) {
    if (error?.status === 404) {
      return (
        (await updateProcessingJob(job.id, {
          status: 'failed',
          progressMessage: 'Processor job missing',
          error: 'The media processor could not find this job.',
          lastSyncedAt: new Date().toISOString()
        })) ?? job
      );
    }

    console.error(`Failed to sync processing job ${job.id} with processor`, error);
    return job;
  }
};
