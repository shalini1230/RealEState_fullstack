require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ExifReader = require('exifreader');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

const app = express();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// email → expiry timestamp (ms). Cleared on success or expiry.
const otpExpiry = new Map();

app.use(cors());
app.use(express.json());

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Try custom JWT first (existing users fast-path)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { profile: true } });
    if (user) { req.user = user; return next(); }
  } catch (_) { /* not a custom JWT — try Supabase */ }

  // Fall back to Supabase JWT (new users after OTP verify)
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

  const user = await prisma.user.findUnique({ where: { email: data.user.email } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  req.user = user;
  next();
}

// ── Zod schemas ───────────────────────────────────────────────────────────────
const optionalNum = z.union([z.coerce.number(), z.literal(""), z.null()]).transform(v => (v === "" || v === null) ? undefined : Number(v)).optional();

const ApartmentSchema = z.object({
  rooms: z.coerce.number().int().min(1),
  bathrooms: z.coerce.number().int().min(1),
  floor: optionalNum,
  balcony: z.boolean().default(false),
  furnished: z.boolean().default(false),
  lift: z.boolean().default(false),
  maintenanceCharges: optionalNum,
});

const HostelSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE', 'MIXED']),
  sharing: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD']),
  wifi: z.boolean().default(false),
  food: z.boolean().default(false),
});

const LandSchema = z.object({
  sizeAcres: z.coerce.number().positive(),
  roadAccess: z.boolean().default(false),
  usage: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'AGRICULTURAL']),
});

const CommercialSchema = z.object({
  shopType: z.string().min(1),
  floorArea: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().optional(),
});

const PropertySchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  city: z.string().min(1),
  area: z.string().min(1),
  address: z.string().optional(),
  type: z.enum(['APARTMENT', 'HOSTEL', 'LAND', 'COMMERCIAL']),
  details: z.record(z.unknown()),
  images: z.array(z.string().url()).optional().default([]),
  gpsLat: z.coerce.number().optional(),
  gpsLng: z.coerce.number().optional(),
});

// ── Upload route ─────────────────────────────────────────────────────────────
app.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { buffer, mimetype, originalname } = req.file;

  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimetype)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are allowed' });
  }

  const filename = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;

  const { data, error } = await supabaseAdmin.storage
    .from('property-images')
    .upload(filename, buffer, { contentType: mimetype, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('property-images')
    .getPublicUrl(data.path);

  res.json({ url: publicUrl });
});

// ── Auth routes ───────────────────────────────────────────────────────────────

// Check if email is already registered
app.get('/auth/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  res.json({ exists: !!user, name: user?.profile?.name || null });
});

// Existing user — instant login with custom JWT (no Supabase, no rate limits)
app.post('/auth/signin', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  if (!dbUser) return res.status(404).json({ error: 'Account not found.' });

  const token = jwt.sign(
    { userId: dbUser.id, email: dbUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ user: dbUser, session: { access_token: token } });
});

// New user — generate OTP and send via nodemailer
app.post('/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpExpiry.set(email, { otp, expiry: Date.now() + 30_000 });

  try {
    await mailer.sendMail({
      from: `"NestFinder" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your NestFinder verification code',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto">
          <h2 style="color:#7c3aed">NestFinder</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:8px;color:#7c3aed">${otp}</h1>
          <p style="color:#888">This code expires in 30 seconds.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: 'Failed to send OTP email.' });
  }

  res.json({ message: 'OTP sent to email' });
});

// Verify OTP — enforces 30s server-side expiry
app.post('/auth/verify', async (req, res) => {
  const { email, token, name } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Email and token required' });

  const record = otpExpiry.get(email);
  if (!record) return res.status(400).json({ error: 'No active OTP session. Please request a new code.' });
  if (Date.now() > record.expiry) {
    otpExpiry.delete(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== token) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  otpExpiry.delete(email);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  if (name) {
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, name },
    });
  }

  const updatedUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  const jwtToken = jwt.sign(
    { userId: updatedUser.id, email: updatedUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ user: updatedUser, session: { access_token: jwtToken } });
});

// ── Profile routes ───────────────────────────────────────────────────────────

app.get('/profile', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });
  res.json(user);
});

app.put('/profile', requireAuth, async (req, res) => {
  const { name, phone } = req.body;
  const profile = await prisma.profile.upsert({
    where: { userId: req.user.id },
    update: { name: name || null, phone: phone || null },
    create: { userId: req.user.id, name: name || null, phone: phone || null },
  });
  // Update localStorage-compatible user shape
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });
  res.json(user);
});

// ── Property routes ───────────────────────────────────────────────────────────

// Create
app.post('/properties', requireAuth, async (req, res) => {
  try {
    const parsed = PropertySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { type, details, images, gpsLat, gpsLng, ...base } = parsed.data;

    const detailsParsers = {
      APARTMENT: ApartmentSchema,
      HOSTEL: HostelSchema,
      LAND: LandSchema,
      COMMERCIAL: CommercialSchema,
    };
    const detailsParsed = detailsParsers[type].safeParse(details);
    if (!detailsParsed.success) return res.status(400).json({ error: detailsParsed.error.flatten() });

    const extensionKey = { APARTMENT: 'apartment', HOSTEL: 'hostel', LAND: 'land', COMMERCIAL: 'commercial' }[type];

    const property = await prisma.property.create({
      data: {
        ...base,
        type,
        status: 'AVAILABLE',
        images: images ?? [],
        gpsLat: gpsLat ?? null,
        gpsLng: gpsLng ?? null,
        ownerId: req.user.id,
        [extensionKey]: { create: detailsParsed.data },
      },
      include: { apartment: true, hostel: true, land: true, commercial: true },
    });

    res.status(201).json(property);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create property' });
  }
});

// List (with optional filters)
app.get('/properties', async (req, res) => {
  const { city, area, type, status } = req.query;

  const where = {};
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (area) where.area = { contains: area, mode: 'insensitive' };
  if (type) where.type = type;
  if (status) where.status = status;

  const properties = await prisma.property.findMany({
    where,
    include: {
      apartment: true,
      hostel: true,
      land: true,
      commercial: true,
      owner: { select: { id: true, email: true, profile: { select: { name: true, phone: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(properties);
});

// Single
app.get('/properties/:id', async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      apartment: true,
      hostel: true,
      land: true,
      commercial: true,
      owner: { select: { id: true, email: true, profile: { select: { name: true, phone: true } } } },
    },
  });

  if (!property) return res.status(404).json({ error: 'Property not found' });
  res.json(property);
});

// Update
app.put('/properties/:id', requireAuth, async (req, res) => {
  const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Property not found' });
  if (existing.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const parsed = PropertySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { details, type, ...base } = parsed.data;

  const updateData = { ...base };

  if (details && type) {
    const detailsParsers = {
      APARTMENT: ApartmentSchema,
      HOSTEL: HostelSchema,
      LAND: LandSchema,
      COMMERCIAL: CommercialSchema,
    };
    const detailsParsed = detailsParsers[type].partial().safeParse(details);
    if (!detailsParsed.success) return res.status(400).json({ error: detailsParsed.error.flatten() });

    const extensionKey = { APARTMENT: 'apartment', HOSTEL: 'hostel', LAND: 'land', COMMERCIAL: 'commercial' }[type];
    updateData[extensionKey] = { update: detailsParsed.data };
  }

  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: updateData,
    include: { apartment: true, hostel: true, land: true, commercial: true },
  });

  res.json(property);
});

// Delete
app.delete('/properties/:id', requireAuth, async (req, res) => {
  const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Property not found' });
  if (existing.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  await prisma.property.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

// My properties
app.get('/my-properties', requireAuth, async (req, res) => {
  const properties = await prisma.property.findMany({
    where: { ownerId: req.user.id },
    include: { apartment: true, hostel: true, land: true, commercial: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(properties);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
