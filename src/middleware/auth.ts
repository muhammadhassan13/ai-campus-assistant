import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    student_id: number;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const rawHeader = req.headers['authorization'];
  const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied. Token missing.' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as {
      student_id: number;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      res
        .status(401)
        .json({ error: 'Token has expired. Please log in again.' });
      return;
    }

    res.status(403).json({ error: 'Invalid token.' });
    return;
  }
};
