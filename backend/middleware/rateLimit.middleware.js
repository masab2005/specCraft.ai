export function createRateLimiter({ windowMs, max, message }) {
  const store = new Map();

  // Periodically clean up expired rate limit records
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 60000);

  // Unref the timer to avoid blocking server shutdown/testing exit
  if (interval && typeof interval.unref === 'function') {
    interval.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    let identifier = `ip:${req.ip}`;
    
    // Resolve identifier by authenticated User ID, token hash, or fallback to Client IP
    if (req.user && req.user.id) {
      identifier = `user:${req.user.id}`;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) {
          identifier = `token:${token.substring(0, 32)}`;
        }
      } else if (req.query.token) {
        identifier = `token:${req.query.token.substring(0, 32)}`;
      }
    }

    const now = Date.now();
    let record = store.get(identifier);

    if (!record || now > record.resetTime) {
      record = {
        hits: 0,
        resetTime: now + windowMs
      };
      store.set(identifier, record);
    }

    record.hits += 1;

    const remaining = Math.max(0, max - record.hits);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.hits > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: message || 'You have exceeded the rate limit. Please try again later.',
        retryAfter
      });
    }

    next();
  };
}
