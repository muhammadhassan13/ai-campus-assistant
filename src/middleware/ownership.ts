import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';

export const checkOwnership = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Safely parse URL parameter id as string to avoid TypeScript array error
  const paramId = req.params.id;
  const idString = Array.isArray(paramId) ? paramId[0] : paramId;
  const targetStudentId = parseInt(idString, 10);

  const loggedInStudentId = req.user?.student_id;

  console.log(
    `[Ownership Check] LoggedIn Student ID: ${loggedInStudentId} | Target Student ID: ${targetStudentId}`
  );

  if (!loggedInStudentId) {
    return res
      .status(401)
      .json({ error: 'Unauthorized. User context missing.' });
  }

  if (Number(loggedInStudentId) !== targetStudentId) {
    return res
      .status(403)
      .json({ error: 'Forbidden. You can only modify your own account.' });
  }

  next();
};
