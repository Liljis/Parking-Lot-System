const LOG_LEVELS = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function sanitize(data) {
  if (!data) return data;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [] : {};
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'email', 'w3id'];

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...sanitize(meta),
  };

  const output = JSON.stringify(logEntry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
