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
const fs = require('fs');
const path = require('path');

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

// OTP sessions persisted to disk so nodemon restarts don't wipe them
const OTP_FILE = path.join(__dirname, '.otp-sessions.json');
function readOtpSessions() {
  try { return JSON.parse(fs.readFileSync(OTP_FILE, 'utf8')); } catch { return {}; }
}
function writeOtpSessions(sessions) {
  fs.writeFileSync(OTP_FILE, JSON.stringify(sessions));
}
function getOtp(email) {
  const sessions = readOtpSessions();
  return sessions[email] || null;
}
function setOtp(email, record) {
  const sessions = readOtpSessions();
  sessions[email] = record;
  writeOtpSessions(sessions);
}
function deleteOtp(email) {
  const sessions = readOtpSessions();
  delete sessions[email];
  writeOtpSessions(sessions);
}

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
  vacancies: z.coerce.number().int().min(1).default(1),
  details: z.record(z.unknown()),
  images: z.array(z.string().url()).optional().default([]),
  gpsLat: z.coerce.number().optional(),
  gpsLng: z.coerce.number().optional(),
});

const BookingSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email required'),
  message: z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function createNotification(userId, type, title, body, link) {
  return prisma.notification.create({ data: { userId, type, title, body, link } });
}

function propertyInclude() {
  return {
    apartment: true,
    hostel: true,
    land: true,
    commercial: true,
    owner: { select: { id: true, email: true, profile: { select: { name: true, phone: true } } } },
    _count: { select: { bookingQueue: { where: { status: 'ACCEPTED' } } } },
  };
}

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

app.get('/auth/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  res.json({ exists: !!user, name: user?.profile?.name || null });
});

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

app.post('/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  setOtp(email, { otp, expiry: Date.now() + 10 * 60_000 });

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
          <p style="color:#888">This code expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Email error:', err.message);
    return res.status(500).json({ error: 'Failed to send OTP email.' });
  }

  res.json({ message: 'OTP sent to email' });
});

app.post('/auth/verify', async (req, res) => {
  const { email, token, name } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Email and token required' });

  const record = getOtp(email);
  if (!record) return res.status(400).json({ error: 'No active OTP session. Please request a new code.' });
  if (Date.now() > record.expiry) {
    deleteOtp(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== token) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  deleteOtp(email);

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
  await prisma.profile.upsert({
    where: { userId: req.user.id },
    update: { name: name || null, phone: phone || null },
    create: { userId: req.user.id, name: name || null, phone: phone || null },
  });
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });
  res.json(user);
});

// ── Property routes ───────────────────────────────────────────────────────────

app.post('/properties', requireAuth, async (req, res) => {
  try {
    const parsed = PropertySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { type, details, images, gpsLat, gpsLng, vacancies, ...base } = parsed.data;

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
        vacancies: vacancies ?? 1,
        images: images ?? [],
        gpsLat: gpsLat ?? null,
        gpsLng: gpsLng ?? null,
        ownerId: req.user.id,
        [extensionKey]: { create: detailsParsed.data },
      },
      include: propertyInclude(),
    });

    res.status(201).json(property);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create property' });
  }
});

app.get('/properties', async (req, res) => {
  const { city, area, type, status } = req.query;

  const where = {};
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (area) where.area = { contains: area, mode: 'insensitive' };
  if (type) where.type = type;
  if (status) where.status = status;

  const properties = await prisma.property.findMany({
    where,
    include: propertyInclude(),
    orderBy: { createdAt: 'desc' },
  });

  res.json(properties);
});

app.get('/properties/:id', async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: propertyInclude(),
  });

  if (!property) return res.status(404).json({ error: 'Property not found' });
  res.json(property);
});

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
    include: propertyInclude(),
  });

  res.json(property);
});

app.delete('/properties/:id', requireAuth, async (req, res) => {
  const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Property not found' });
  if (existing.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  await prisma.property.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
});

app.get('/my-properties', requireAuth, async (req, res) => {
  const properties = await prisma.property.findMany({
    where: { ownerId: req.user.id },
    include: propertyInclude(),
    orderBy: { createdAt: 'desc' },
  });
  res.json(properties);
});

// ── Booking routes ────────────────────────────────────────────────────────────

// POST /bookings — tenant joins queue
app.post('/bookings', requireAuth, async (req, res) => {
  try {
    const parsed = BookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { propertyId, name, phone, email, message } = parsed.data;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: { include: { profile: true } } },
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.ownerId === req.user.id) return res.status(400).json({ error: 'Cannot book your own property' });
    if (property.status !== 'AVAILABLE') return res.status(400).json({ error: 'Property is not available for booking' });

    // Check existing booking
    const existing = await prisma.bookingQueue.findUnique({
      where: { propertyId_tenantId: { propertyId, tenantId: req.user.id } },
    });
    if (existing && existing.status === 'PENDING') {
      return res.status(400).json({ error: 'You already have a pending request for this property' });
    }

    // Create or re-create booking (reset createdAt for fair FIFO on re-join)
    let booking;
    if (existing) {
      booking = await prisma.bookingQueue.update({
        where: { id: existing.id },
        data: { status: 'PENDING', name, phone, email, message: message || null, createdAt: new Date() },
      });
    } else {
      booking = await prisma.bookingQueue.create({
        data: { propertyId, tenantId: req.user.id, name, phone, email, message: message || null },
      });
    }

    // Queue position
    const position = await prisma.bookingQueue.count({
      where: { propertyId, status: 'PENDING', createdAt: { lt: booking.createdAt } },
    }) + 1;

    // Notify owner
    await createNotification(
      property.ownerId,
      'BOOKING_RECEIVED',
      'New Booking Request',
      `${name} has requested to book "${property.title}"`,
      `/requests`
    );

    res.status(201).json({ ...booking, position });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to submit booking' });
  }
});

// GET /bookings/my — tenant's bookings with positions
app.get('/bookings/my', requireAuth, async (req, res) => {
  const bookings = await prisma.bookingQueue.findMany({
    where: { tenantId: req.user.id },
    include: {
      property: { include: propertyInclude() },
    },
    orderBy: { createdAt: 'desc' },
  });

  const withPositions = await Promise.all(bookings.map(async (b) => {
    if (b.status !== 'PENDING') return { ...b, position: null };
    const position = await prisma.bookingQueue.count({
      where: { propertyId: b.propertyId, status: 'PENDING', createdAt: { lt: b.createdAt } },
    }) + 1;
    return { ...b, position };
  }));

  res.json(withPositions);
});

// GET /bookings/check/:propertyId — check my booking status for a property
app.get('/bookings/check/:propertyId', requireAuth, async (req, res) => {
  const booking = await prisma.bookingQueue.findUnique({
    where: { propertyId_tenantId: { propertyId: req.params.propertyId, tenantId: req.user.id } },
  });
  if (!booking) return res.json(null);

  let position = null;
  if (booking.status === 'PENDING') {
    position = await prisma.bookingQueue.count({
      where: { propertyId: req.params.propertyId, status: 'PENDING', createdAt: { lt: booking.createdAt } },
    }) + 1;
  }
  res.json({ ...booking, position });
});

// GET /properties/:id/queue — owner sees the queue for their property
app.get('/properties/:id/queue', requireAuth, async (req, res) => {
  const property = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!property) return res.status(404).json({ error: 'Property not found' });
  if (property.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const queue = await prisma.bookingQueue.findMany({
    where: { propertyId: req.params.id },
    include: {
      tenant: { select: { id: true, email: true, profile: { select: { name: true, phone: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  let pos = 1;
  const result = queue.map((b) => ({
    ...b,
    position: b.status === 'PENDING' ? pos++ : null,
  }));

  res.json(result);
});

// GET /requests — owner sees ALL requests across their properties
app.get('/requests', requireAuth, async (req, res) => {
  const properties = await prisma.property.findMany({
    where: { ownerId: req.user.id },
    select: { id: true },
  });
  const propertyIds = properties.map((p) => p.id);

  const bookings = await prisma.bookingQueue.findMany({
    where: { propertyId: { in: propertyIds } },
    include: {
      property: { select: { id: true, title: true, city: true, area: true, price: true, vacancies: true, images: true, _count: { select: { bookingQueue: { where: { status: 'ACCEPTED' } } } } } },
      tenant: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(bookings);
});

// PUT /bookings/:id/status — accept/reject (owner) or cancel (tenant)
app.put('/bookings/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await prisma.bookingQueue.findUnique({
      where: { id: req.params.id },
      include: {
        property: true,
        tenant: { include: { profile: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isOwner = booking.property.ownerId === req.user.id;
    const isTenant = booking.tenantId === req.user.id;

    if (!isOwner && !isTenant) return res.status(403).json({ error: 'Forbidden' });
    if (isTenant && status !== 'CANCELLED') return res.status(403).json({ error: 'Tenants can only cancel bookings' });
    if (isOwner && status === 'CANCELLED') return res.status(403).json({ error: 'Owners cannot cancel bookings' });
    if (booking.status !== 'PENDING') return res.status(400).json({ error: 'Booking is no longer pending' });

    await prisma.bookingQueue.update({ where: { id: req.params.id }, data: { status } });

    if (status === 'ACCEPTED') {
      const acceptedCount = await prisma.bookingQueue.count({
        where: { propertyId: booking.propertyId, status: 'ACCEPTED' },
      });

      // Notify accepted tenant
      await createNotification(
        booking.tenantId,
        'BOOKING_ACCEPTED',
        'Booking Accepted!',
        `Your booking request for "${booking.property.title}" has been accepted. The owner will contact you soon.`,
        `/bookings`
      );

      // If vacancies are now full, close the queue
      if (acceptedCount >= booking.property.vacancies) {
        await prisma.property.update({ where: { id: booking.propertyId }, data: { status: 'PENDING' } });

        const others = await prisma.bookingQueue.findMany({
          where: { propertyId: booking.propertyId, status: 'PENDING' },
        });

        for (const other of others) {
          await prisma.bookingQueue.update({ where: { id: other.id }, data: { status: 'REJECTED' } });
          await createNotification(
            other.tenantId,
            'BOOKING_REJECTED',
            'Booking Request Declined',
            `All vacancies for "${booking.property.title}" have been filled. Better luck next time!`,
            `/bookings`
          );
        }
      }
    } else if (status === 'REJECTED') {
      await createNotification(
        booking.tenantId,
        'BOOKING_REJECTED',
        'Booking Request Declined',
        `Your request for "${booking.property.title}" was declined by the owner.`,
        `/bookings`
      );
    } else if (status === 'CANCELLED') {
      await createNotification(
        booking.property.ownerId,
        'BOOKING_CANCELLED',
        'Booking Cancelled',
        `${booking.name} has withdrawn their booking request for "${booking.property.title}".`,
        `/requests`
      );
    }

    // Return updated property so UI can refresh vacancy count
    const updatedProperty = await prisma.property.findUnique({
      where: { id: booking.propertyId },
      include: propertyInclude(),
    });

    res.json({ message: 'Status updated', property: updatedProperty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update booking' });
  }
});

// ── Notification routes ───────────────────────────────────────────────────────

// IMPORTANT: /notifications/read-all must be before /notifications/:id/read
app.put('/notifications/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All notifications marked as read' });
});

app.get('/notifications', requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notifications);
});

app.put('/notifications/:id/read', requireAuth, async (req, res) => {
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json(updated);
});

// ── Wishlist routes ───────────────────────────────────────────────────────────

// GET /wishlist — all saved properties
app.get('/wishlist', requireAuth, async (req, res) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    include: { property: { include: propertyInclude() } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items.map((i) => i.property));
});

// GET /wishlist/check/:propertyId — is this property wishlisted?
app.get('/wishlist/check/:propertyId', requireAuth, async (req, res) => {
  const item = await prisma.wishlist.findUnique({
    where: { userId_propertyId: { userId: req.user.id, propertyId: req.params.propertyId } },
  });
  res.json({ wishlisted: !!item });
});

// POST /wishlist/:propertyId — add to wishlist
app.post('/wishlist/:propertyId', requireAuth, async (req, res) => {
  const { propertyId } = req.params;
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return res.status(404).json({ error: 'Property not found' });
  await prisma.wishlist.upsert({
    where: { userId_propertyId: { userId: req.user.id, propertyId } },
    update: {},
    create: { userId: req.user.id, propertyId },
  });
  res.json({ wishlisted: true });
});

// DELETE /wishlist/:propertyId — remove from wishlist
app.delete('/wishlist/:propertyId', requireAuth, async (req, res) => {
  await prisma.wishlist.deleteMany({
    where: { userId: req.user.id, propertyId: req.params.propertyId },
  });
  res.json({ wishlisted: false });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
