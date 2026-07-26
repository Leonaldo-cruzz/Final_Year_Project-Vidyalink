// ─── Async Handler Utility ────────────────────────────────────────────────────
//
// A higher-order function that wraps Express async route handlers.
//
// Problem it solves:
//   Without this, every async controller method needs a manual try/catch block
//   to forward errors to Express's centralized error middleware. This is
//   repetitive, error-prone (forgetting `next(error)` causes silent hangs),
//   and violates the DRY principle.
//
// Usage:
//   router.post('/register', asyncHandler(authController.register));
//
// How it works:
//   - Calls the wrapped handler function with (req, res, next).
//   - If the handler throws or returns a rejected Promise, the error is
//     automatically forwarded to `next(error)` — which triggers the global
//     error middleware (error.middleware.js).

/**
 * Wraps an async Express route handler to automatically catch any thrown
 * errors or rejected Promises and forward them to Express's `next()`.
 *
 * @param {Function} fn - An async Express handler: (req, res, next) => Promise
 * @returns {Function} A standard Express middleware function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
