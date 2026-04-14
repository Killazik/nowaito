import jwt from 'jsonwebtoken';

export type JwtPayload = { userId: string; sessionId: string };

export const signAccess = (payload: JwtPayload) => jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '15m' });
export const signRefresh = (payload: JwtPayload) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh', { expiresIn: '30d' });
export const verifyAccess = (token: string) => jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JwtPayload;
export const verifyRefresh = (token: string) => jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev-refresh') as JwtPayload;

