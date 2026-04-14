import { prisma } from '../src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const passwordHash = await bcrypt.hash('1234', 10);
  const u1 = await prisma.user.upsert({ where: { phoneNumber: '+10000000001' }, update: {}, create: { phoneNumber: '+10000000001', firstName: 'Alice', username: 'alice' } });
  const u2 = await prisma.user.upsert({ where: { phoneNumber: '+10000000002' }, update: {}, create: { phoneNumber: '+10000000002', firstName: 'Bob', username: 'bob' } });

  await prisma.userPassword.upsert({ where: { userId: u1.id }, update: { passwordHash }, create: { userId: u1.id, passwordHash } });
  await prisma.userPassword.upsert({ where: { userId: u2.id }, update: { passwordHash }, create: { userId: u2.id, passwordHash } });

  const existing = await prisma.chat.findFirst({ where: { type: 'private' } });
  if (!existing) {
    const chat = await prisma.chat.create({ data: { type: 'private', participants: { create: [{ userId: u1.id, role: 'admin' }, { userId: u2.id, role: 'member' }] } } });
    await prisma.message.create({ data: { chatId: chat.id, senderId: u1.id, text: 'Welcome to Nowaito' } });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
