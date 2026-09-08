import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { serializeUser } from '../lib/dto';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password' });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'Incorrect email or password' });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Incorrect email or password' });

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: serializeUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: serializeUser(req.user!) });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, req.user!.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
  res.json({ ok: true });
});
