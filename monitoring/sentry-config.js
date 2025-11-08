/**
 * Sentry Configuration for VeggieScore
 * Error tracking and performance monitoring
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

function initSentry(options = {}) {
  const {
    dsn = process.env.SENTRY_DSN,
    environment = process.env.NODE_ENV || 'development',
    serviceName = 'veggiescore-api',
    tracesSampleRate = 0.1,
    profilesSampleRate = 0.1,
  } = options;

  if (!dsn) {
    console.warn('[Sentry] No DSN provided, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    serverName: serviceName,

    // Performance Monitoring
    tracesSampleRate,  // 10% of transactions
    profilesSampleRate,  // 10% profiling

    // Integrations
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: true }),
    ],

    // Before send hook to filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }

      // Filter sensitive data from query params
      if (event.request?.query_string) {
        event.request.query_string = event.request.query_string
          .replace(/api_key=[^&]*/g, 'api_key=REDACTED')
          .replace(/token=[^&]*/g, 'token=REDACTED');
      }

      return event;
    },

    // Breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter console breadcrumbs in production
      if (breadcrumb.category === 'console' && environment === 'production') {
        return null;
      }
      return breadcrumb;
    },

    // Error filtering
    ignoreErrors: [
      // Browser errors
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      // Network errors
      'NetworkError',
      'Network request failed',
      // Known issues
      'AbortError',
    ],
  });

  console.log(`[Sentry] Initialized for ${environment} environment`);
}

// Express middleware
function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

// Manual error reporting
function captureException(error, context = {}) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

function captureMessage(message, level = 'info', context = {}) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

// Performance monitoring
function startTransaction(name, op = 'http') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

module.exports = {
  initSentry,
  sentryRequestHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  startTransaction,
  Sentry,
};
