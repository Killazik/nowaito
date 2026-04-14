import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import http from 'http';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Server } from 'socket.io';
import { prisma } from './prisma';
import { redis } from './redis';
import { auth, AuthRequest } from './utils/auth-middleware';
import { signAccess, signRefresh, verifyAccess, verifyRefresh } from './utils/jwt';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));

const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, '');
const getMessageWithRelations = (id: string) => prisma.message.findUnique({
  where: { id },
  include: { sender: true, media: true },
});

const requireAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.isAdmin ? user : null;
};

const emitMessage = async (chatId: string, messageId: string) => {
  const message = await getMessageWithRelations(messageId);
  if (!message) return null;
  io.to(`chat:${chatId}`).emit('new_message', message);
  return message;
};

const authSchema = z.object({
  phoneNumber: z.string().min(7),
  password: z.string().min(4),
  deviceName: z.string().min(2),
  firstName: z.string().optional(),
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { phoneNumber, password, deviceName, firstName } = parsed.data;
  const normalizedPhone = normalizePhone(phoneNumber);
  const user = await prisma.user.create({ data: { phoneNumber: normalizedPhone, firstName, username: `user_${normalizedPhone.slice(-4)}` } }).catch(() => null);
  if (!user) return res.status(409).json({ message: 'Phone exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.userPassword.create({ data: { userId: user.id, passwordHash } });
  const session = await prisma.session.create({ data: { userId: user.id, deviceName, lastActive: new Date() } });
  const accessToken = signAccess({ userId: user.id, sessionId: session.id });
  const refreshToken = signRefresh({ userId: user.id, sessionId: session.id });
  await prisma.session.update({ where: { id: session.id }, data: { refreshToken } });
  await redis.set(`session:${session.id}`, user.id, 'EX', 60 * 60 * 24 * 30);
  return res.json({ user, accessToken, refreshToken });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { phoneNumber, password, deviceName } = parsed.data;
  const normalizedPhone = normalizePhone(phoneNumber);
  const user = await prisma.user.findUnique({ where: { phoneNumber: normalizedPhone } });
  if (!user) return res.status(404).json({ message: 'Not found' });
  if (user.isBlocked) return res.status(403).json({ message: 'Account blocked' });
  const pass = await prisma.userPassword.findUnique({ where: { userId: user.id } });
  const ok = pass ? await bcrypt.compare(password, pass.passwordHash) : false;
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const session = await prisma.session.create({ data: { userId: user.id, deviceName, lastActive: new Date() } });
  const accessToken = signAccess({ userId: user.id, sessionId: session.id });
  const refreshToken = signRefresh({ userId: user.id, sessionId: session.id });
  await prisma.session.update({ where: { id: session.id }, data: { refreshToken } });
  await redis.set(`session:${session.id}`, user.id, 'EX', 60 * 60 * 24 * 30);
  return res.json({ user, accessToken, refreshToken });
});

app.post('/api/auth/refresh', async (req, res) => {
  const token = String(req.body.refreshToken || '');
  try {
    const payload = verifyRefresh(token);
    const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
    const cached = await redis.get(`session:${payload.sessionId}`);
    if (!session || session.refreshToken !== token) return res.status(401).json({ message: 'Invalid token' });
    if (!cached) await redis.set(`session:${payload.sessionId}`, payload.userId, 'EX', 60 * 60 * 24 * 30);
    const accessToken = signAccess(payload);
    const refreshToken = signRefresh(payload);
    await prisma.session.update({ where: { id: payload.sessionId }, data: { refreshToken, lastActive: new Date() } });
    return res.json({ accessToken, refreshToken });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

app.post('/api/auth/logout', auth, async (req: AuthRequest, res) => {
  await prisma.session.deleteMany({ where: { userId: req.user!.userId } });
  res.json({ ok: true });
});

app.get('/api/me', auth, async (req: AuthRequest, res) => res.json(await prisma.user.findUnique({ where: { id: req.user!.userId } })));
app.put('/api/me/profile', auth, async (req: AuthRequest, res) => res.json(await prisma.user.update({ where: { id: req.user!.userId }, data: req.body })));
app.post('/api/me/upload-profile-media', auth, upload.single('file'), async (req: AuthRequest, res) => {
  const target = String(req.body.target || '');
  const durationSec = Number(req.body.durationSec || 0);
  if (!req.file) return res.status(400).json({ message: 'File required' });
  if (target !== 'avatar' && target !== 'banner') return res.status(400).json({ message: 'Invalid target' });

  const mediaKind = req.file.mimetype.startsWith('video/') ? 'video' : req.file.mimetype.startsWith('image/') ? 'image' : '';
  if (!mediaKind) return res.status(400).json({ message: 'Only image/video allowed' });
  if (mediaKind === 'video' && (durationSec <= 0 || durationSec > 10)) {
    return res.status(400).json({ message: 'Video duration must be <= 10 seconds' });
  }

  const url = `/uploads/${req.file.filename}`;
  const data = target === 'avatar'
    ? { avatarUrl: url, avatarType: mediaKind }
    : { bannerUrl: url, bannerType: mediaKind };

  const user = await prisma.user.update({ where: { id: req.user!.userId }, data });
  return res.json(user);
});
app.get('/api/me/sessions', auth, async (req: AuthRequest, res) => res.json(await prisma.session.findMany({ where: { userId: req.user!.userId } })));
app.delete('/api/me/sessions/:id', auth, async (req: AuthRequest, res) => { await prisma.session.delete({ where: { id: String(req.params.id) } }); res.json({ ok: true }); });

app.get('/api/chats', auth, async (req: AuthRequest, res) => {
  const chats = await prisma.chat.findMany({ where: { participants: { some: { userId: req.user!.userId } } }, include: { participants: { include: { user: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { media: true } } } });
  res.json(chats);
});

app.post('/api/chats', auth, async (req: AuthRequest, res) => {
  const { type, title, category, participantIds, participantQueries } = req.body as {
    type: 'private' | 'group' | 'channel';
    title?: string;
    category?: string;
    participantIds?: string[];
    participantQueries?: string[];
  };
  const queryValues = (participantQueries ?? []).map((v) => v.trim()).filter(Boolean);
  const byQuery = queryValues.length
    ? await prisma.user.findMany({
      where: {
        OR: queryValues.flatMap((q) => [
          { username: { equals: q } },
          { phoneNumber: { equals: q } },
        ]),
      },
      select: { id: true },
    })
    : [];
  const ids = Array.from(new Set([req.user!.userId, ...(participantIds ?? []), ...byQuery.map((u) => u.id)]));
  if (type === 'group' && ids.length > 200) return res.status(400).json({ message: 'Group max 200 participants' });
  if ((type === 'private' || type === 'group') && ids.length < 2) return res.status(400).json({ message: 'Add at least one participant' });
  const chat = await prisma.chat.create({ data: { type, title: title ?? null, category: type === 'channel' ? category ?? null : null, participants: { create: ids.map((userId) => ({ userId, role: userId === req.user!.userId ? 'admin' : 'member' })) } } });
  res.json(chat);
});

app.get('/api/channels/by-category/:category', auth, async (req: AuthRequest, res) => {
  const category = String(req.params.category || '');
  const channels = await prisma.chat.findMany({
    where: { type: 'channel', category },
    include: {
      participants: { include: { user: true } },
      _count: { select: { participants: true, messages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(channels);
});

app.get('/api/chats/:id/messages', auth, async (req: AuthRequest, res) => {
  const chatId = String(req.params.id);
  const messages = await prisma.message.findMany({ where: { chatId }, include: { sender: true, media: true }, orderBy: { createdAt: 'asc' } });
  res.json(messages);
});

app.post('/api/chats/:id/messages', auth, async (req: AuthRequest, res) => {
  const chatId = String(req.params.id);
  const text = String(req.body.text || '').trim();
  const replyToId = req.body.replyToId ? String(req.body.replyToId) : null;

  if (!text) return res.status(400).json({ message: 'Text required' });

  const message = await prisma.message.create({
    data: { chatId, text, replyToId, senderId: req.user!.userId } as any,
  });
  const fullMessage = await emitMessage(chatId, message.id);
  return res.json(fullMessage);
});

app.post('/api/chats/:id/leave', auth, async (req: AuthRequest, res) => { await prisma.chatParticipant.deleteMany({ where: { chatId: String(req.params.id), userId: req.user!.userId } }); res.json({ ok: true }); });
app.post('/api/chats/:id/join', auth, async (req: AuthRequest, res) => {
  const chatId = String(req.params.id);
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.type !== 'channel') return res.status(404).json({ message: 'Channel not found' });
  await prisma.chatParticipant.upsert({
    where: { chatId_userId: { chatId, userId: req.user!.userId } },
    update: {},
    create: { chatId, userId: req.user!.userId, role: 'member' },
  });
  const fullChat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { participants: { include: { user: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { media: true } } },
  });
  res.json(fullChat);
});

app.get('/api/admin/users', auth, async (req: AuthRequest, res) => {
  const admin = await requireAdmin(req.user!.userId);
  if (!admin) return res.status(403).json({ message: 'Admin only' });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      phoneNumber: true,
      username: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isAdmin: true,
      isBlocked: true,
      createdAt: true,
    },
  });
  res.json(users);
});

app.patch('/api/admin/users/:id', auth, async (req: AuthRequest, res) => {
  const admin = await requireAdmin(req.user!.userId);
  if (!admin) return res.status(403).json({ message: 'Admin only' });

  const targetId = String(req.params.id);
  if (targetId === req.user!.userId && req.body.isBlocked === true) {
    return res.status(400).json({ message: 'Cannot block yourself' });
  }

  const data: Record<string, boolean> = {};
  if (typeof req.body.isAdmin === 'boolean') data.isAdmin = req.body.isAdmin;
  if (typeof req.body.isBlocked === 'boolean') data.isBlocked = req.body.isBlocked;
  if (!Object.keys(data).length) return res.status(400).json({ message: 'No changes provided' });

  const updated = await prisma.user.update({
    where: { id: targetId },
    data,
    select: {
      id: true,
      phoneNumber: true,
      username: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      isAdmin: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  res.json(updated);
});

app.get('/api/admin/channels', auth, async (req: AuthRequest, res) => {
  const admin = await requireAdmin(req.user!.userId);
  if (!admin) return res.status(403).json({ message: 'Admin only' });

  const channels = await prisma.chat.findMany({
    where: { type: 'channel' },
    orderBy: { createdAt: 'desc' },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              phoneNumber: true,
            },
          },
        },
      },
      _count: { select: { participants: true, messages: true } },
    },
  });

  res.json(channels);
});

app.patch('/api/admin/channels/:id/participants/:userId', auth, async (req: AuthRequest, res) => {
  const admin = await requireAdmin(req.user!.userId);
  if (!admin) return res.status(403).json({ message: 'Admin only' });

  const chatId = String(req.params.id);
  const userId = String(req.params.userId);
  const role = req.body.role === 'admin' ? 'admin' : 'member';

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.type !== 'channel') return res.status(404).json({ message: 'Channel not found' });

  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId } },
  });
  if (!participant) return res.status(404).json({ message: 'Participant not found' });

  const updated = await prisma.chatParticipant.update({
    where: { chatId_userId: { chatId, userId } },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          phoneNumber: true,
        },
      },
    },
  });

  res.json(updated);
});

app.delete('/api/admin/channels/:id', auth, async (req: AuthRequest, res) => {
  const admin = await requireAdmin(req.user!.userId);
  if (!admin) return res.status(403).json({ message: 'Admin only' });

  await prisma.chat.delete({ where: { id: String(req.params.id) } });
  res.json({ ok: true });
});

app.post('/api/chats/:id/media', auth, upload.single('file'), async (req: AuthRequest, res) => {
  const chatId = String(req.params.id);
  const text = String(req.body.text || '').trim();
  const kind = String(req.body.kind || '');

  if (!req.file) return res.status(400).json({ message: 'file required' });

  const mediaType = kind === 'voice'
    ? 'audio'
    : kind === 'video-note'
      ? 'video'
      : req.file.mimetype.startsWith('audio/')
        ? 'audio'
        : req.file.mimetype.startsWith('video/')
          ? 'video'
          : req.file.mimetype.startsWith('image/')
            ? 'photo'
            : 'file';

  const message = await prisma.message.create({
    data: { chatId, text: text || null, senderId: req.user!.userId } as any,
  });

  await prisma.media.create({
    data: {
      messageId: message.id,
      type: mediaType,
      url: `/uploads/${req.file.filename}`,
      size: BigInt(req.file.size),
      duration: req.body.duration ? Number(req.body.duration) : null,
      width: req.body.width ? Number(req.body.width) : null,
      height: req.body.height ? Number(req.body.height) : null,
    },
  });

  const fullMessage = await emitMessage(chatId, message.id);
  return res.json(fullMessage);
});

app.post('/api/media/upload', auth, upload.single('file'), async (req, res) => {
  const messageId = String(req.body.messageId || '');
  if (!req.file || !messageId) return res.status(400).json({ message: 'file and messageId required' });
  const media = await prisma.media.create({ data: { messageId, type: req.body.type || 'file', url: `/uploads/${req.file.filename}`, size: BigInt(req.file.size) } });
  res.json(media);
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = verifyAccess(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = String(socket.data.userId || '');
  if (userId) socket.join(`user:${userId}`);

  socket.on('join_chat', ({ chatId }) => socket.join(`chat:${chatId}`));
  socket.on('send_message', async ({ chatId, text, replyToId }, cb) => {
    try {
      const message = await prisma.message.create({
        data: { chatId, text, replyToId: replyToId ?? null, senderId: userId } as any,
      });
      const fullMessage = await emitMessage(chatId, message.id);
      cb?.({ ok: true, data: fullMessage });
    } catch {
      cb?.({ ok: false });
    }
  });
  socket.on('typing_start', ({ chatId }) => socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, isTyping: true }));
  socket.on('typing_stop', ({ chatId }) => socket.to(`chat:${chatId}`).emit('typing', { chatId, userId, isTyping: false }));
});

app.get('/health', (_, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`API listening on ${port}`));
