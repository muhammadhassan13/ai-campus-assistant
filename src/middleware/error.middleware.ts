import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  void _next;

  console.error('Unhandled Error:', err);

  // Surface upstream API errors (LlamaParse, Groq, etc.) with their real message
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 502;
    const upstreamData = err.response?.data;
    let detail = 'Upstream service error';
    if (typeof upstreamData === 'string') {
      detail = upstreamData;
    } else if (upstreamData && typeof upstreamData === 'object') {
      const d = upstreamData as Record<string, unknown>;
      detail = String(d.detail ?? d.error ?? d.message ?? JSON.stringify(d));
    } else if (err.message) {
      detail = err.message;
    }

    res.status(status).json({
      success: false,
      error: `Upstream API error: ${detail}`,
      upstreamStatus: err.response?.status,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
};
