import { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma';
import { verifyAccess } from './jwt';

export type AuthRequest = Request & { user?: { userId: string; sessionId: string } };

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

  try {
    req.user = verifyAccess(header.split(' ')[1]);
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isBlocked: true },
    });

    if (!user || user.isBlocked) return res.status(403).json({ message: 'Account blocked' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
