import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { serializeUser } from '../lib/dto';
import { requireAuth } from '../middleware/auth';
import { parse } from '../http/validate';
import { badRequest, unauthorized } from '../http/errors';
import { nullifyBlanks } from '../lib/nullify';
import { optionalText, optionalDate } from '../lib/validators';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body, 'Enter a valid email and password');

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw unauthorized('Incorrect email or password');

  res.json({ token: signToken({ sub: user.id, role: user.role }), user: serializeUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: serializeUser(req.user!) });
});

/**
 * Self-service personal information. Anyone may edit their own contact details
 * and payroll bank account; name, job title, role, salary, employee code and
 * start date are set by HR/Admin (see /api/people/:id), never here.
 */
const updateMeSchema = z.object({
  phone: optionalText(),
  address: optionalText(240),
  dateOfBirth: optionalDate,
  nationalId: optionalText(),
  bankAccount: optionalText(),
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const data = nullifyBlanks(parse(updateMeSchema, req.body, 'Invalid details'));
  const user = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ user: serializeUser(user) });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = parse(
    changePasswordSchema,
    req.body,
    'New password must be at least 6 characters',
  );
  if (!(await bcrypt.compare(currentPassword, req.user!.passwordHash))) {
    throw badRequest('Current password is incorrect');
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
  res.json({ ok: true });
});
