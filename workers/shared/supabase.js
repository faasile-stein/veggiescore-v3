/**
 * Shared Supabase Client
 * This module provides a configured Supabase client for workers
 */

const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variable is required');
}

// Use service key for workers (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Upload file to Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @param {Buffer|File} file - File to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
async function uploadFile(bucket, path, file, options = {}) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      ...options,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return data;
}

/**
 * Download file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<Blob>} File data
 */
async function downloadFile(bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  return data;
}

/**
 * Get public URL for a file
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {string} Public URL
 */
function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Create or update a job in the jobs table
 * @param {string} jobType - Type of job
 * @param {Object} payload - Job payload
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Created job
 */
async function createJob(jobType, payload, options = {}) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_type: jobType,
      payload,
      priority: options.priority || 0,
      max_attempts: options.maxAttempts || 3,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return data;
}

/**
 * Update job status
 * @param {string} jobId - Job ID
 * @param {string} status - New status
 * @param {Object} updates - Additional updates
 * @returns {Promise<Object>} Updated job
 */
async function updateJobStatus(jobId, status, updates = {}) {
  const { data, error } = await supabase
    .from('jobs')
    .update({
      status,
      ...updates,
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }

  return data;
}

/**
 * Mark job as processing
 * @param {string} jobId - Job ID
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object>} Updated job
 */
async function markJobProcessing(jobId, workerId) {
  return updateJobStatus(jobId, 'processing', {
    worker_id: workerId,
    started_at: new Date().toISOString(),
    attempts: supabase.raw('attempts + 1'),
  });
}

/**
 * Mark job as completed
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Updated job
 */
async function markJobCompleted(jobId) {
  return updateJobStatus(jobId, 'completed', {
    completed_at: new Date().toISOString(),
  });
}

/**
 * Mark job as failed
 * @param {string} jobId - Job ID
 * @param {string} error - Error message
 * @returns {Promise<Object>} Updated job
 */
async function markJobFailed(jobId, error) {
  return updateJobStatus(jobId, 'failed', {
    error,
    completed_at: new Date().toISOString(),
  });
}

module.exports = {
  supabase,
  uploadFile,
  downloadFile,
  getPublicUrl,
  createJob,
  updateJobStatus,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
};
