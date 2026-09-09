/**
 * A route can `throw` one of these instead of writing `res.status(n).json(...)`
 * and returning. The terminal error middleware (see errorMiddleware.ts) turns it
 * into the response. Anything else that reaches the middleware — a Prisma error,
 * a bug — becomes a 500.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, extra?: Record<string, unknown>) =>
  new HttpError(400, message, extra);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message: string, extra?: Record<string, unknown>) =>
  new HttpError(409, message, extra);
export const unprocessable = (message: string, extra?: Record<string, unknown>) =>
  new HttpError(422, message, extra);
