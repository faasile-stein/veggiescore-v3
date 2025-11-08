/**
 * Shared Queue Manager using BullMQ
 * This module provides queue setup and utilities for all workers
 */

const { Queue, Worker, QueueEvents } = require('bullmq');

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Queue configurations
const QUEUE_CONFIGS = {
  crawl: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  },
  ocr: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  },
  parse: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  },
  label: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  },
};

/**
 * Create a queue instance
 * @param {string} queueName - Name of the queue
 * @returns {Queue} Queue instance
 */
function createQueue(queueName) {
  const config = QUEUE_CONFIGS[queueName] || {};
  return new Queue(queueName, {
    connection: redisConnection,
    ...config,
  });
}

/**
 * Create a worker instance
 * @param {string} queueName - Name of the queue
 * @param {Function} processor - Job processor function
 * @param {Object} options - Worker options
 * @returns {Worker} Worker instance
 */
function createWorker(queueName, processor, options = {}) {
  const defaultOptions = {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1'),
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  };

  const worker = new Worker(queueName, processor, {
    ...defaultOptions,
    ...options,
  });

  // Event listeners
  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${queueName}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[${queueName}] Worker error:`, err);
  });

  return worker;
}

/**
 * Create queue events listener
 * @param {string} queueName - Name of the queue
 * @returns {QueueEvents} QueueEvents instance
 */
function createQueueEvents(queueName) {
  return new QueueEvents(queueName, {
    connection: redisConnection,
  });
}

/**
 * Add a job to a queue
 * @param {string} queueName - Name of the queue
 * @param {string} jobName - Name of the job
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 * @returns {Promise<Job>} The created job
 */
async function addJob(queueName, jobName, data, options = {}) {
  const queue = createQueue(queueName);
  return await queue.add(jobName, data, options);
}

/**
 * Get queue metrics
 * @param {string} queueName - Name of the queue
 * @returns {Promise<Object>} Queue metrics
 */
async function getQueueMetrics(queueName) {
  const queue = createQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
}

/**
 * Graceful shutdown
 * @param {Worker} worker - Worker instance
 */
async function gracefulShutdown(worker) {
  console.log('Shutting down worker gracefully...');
  await worker.close();
  console.log('Worker shut down complete');
  process.exit(0);
}

module.exports = {
  createQueue,
  createWorker,
  createQueueEvents,
  addJob,
  getQueueMetrics,
  gracefulShutdown,
  redisConnection,
};
