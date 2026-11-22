import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initDbPool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeeds } from '../src/db/seed.js';
import { processExpiredBookings, processAutoReleaseBookings } from '../src/scheduler/cronJobs.js';

test('Parking Lot System API End-to-End Suite', async (t) => {
  // Use in-memory DB for isolated tests
  process.env.USE_MEM_DB = 'true';
  process.env.DEV_AUTH_ENABLED = 'true';

  await initDbPool();
  await runMigrations();
  await runSeeds();

  const app = await createApp();
  const agent = request.agent(app); // Keeps session cookies across requests

  let availableSlotId = null;
  let activeBookingId = null;

  await t.test('Health check returns ok and lot boundary info', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.lot.radiusMeters > 0);
  });

  await t.test('Unauthenticated request to /api/slots returns 401', async () => {
    const res = await request(app).get('/api/slots');
    assert.equal(res.status, 401);
  });

  await t.test('Dev login creates session cookie and returns user', async () => {
    const res = await agent
      .post('/auth/dev-login')
      .send({
        w3id: 'test-user-01',
        name: 'Test Engineer',
        email: 'test.engineer@ibm.com',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.w3id, 'test-user-01');
  });

  await t.test('Auth check /auth/me returns current logged-in user', async () => {
    const res = await agent.get('/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.authenticated, true);
    assert.equal(res.body.user.email, 'test.engineer@ibm.com');
  });

  await t.test('GET /api/slots lists all 20 seeded slots', async () => {
    const res = await agent.get('/api/slots');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 20);
    assert.ok(Array.isArray(res.body.slots));
    availableSlotId = res.body.slots[0].id;
    assert.ok(availableSlotId);
  });

  await t.test('POST /api/bookings successfully reserves an available slot', async () => {
    const res = await agent
      .post('/api/bookings')
      .send({ slot_id: availableSlotId });

    assert.equal(res.status, 201);
    assert.equal(res.body.booking.status, 'pending');
    assert.ok(res.body.booking.expires_at);
    activeBookingId = res.body.booking.id;
  });

  await t.test('POST /api/bookings rejects reserving the same slot again (409 Conflict)', async () => {
    const res = await agent
      .post('/api/bookings')
      .send({ slot_id: availableSlotId });

    assert.equal(res.status, 409);
  });

  await t.test('POST /api/bookings allows reserving a 2nd slot (max limit = 2)', async () => {
    const slotsRes = await agent.get('/api/slots?status=available');
    const secondSlotId = slotsRes.body.slots[0].id;
    const res = await agent.post('/api/bookings').send({ slot_id: secondSlotId });

    assert.equal(res.status, 201);
    assert.equal(res.body.booking.status, 'pending');
  });

  await t.test('POST /api/bookings rejects reserving a 3rd slot (400 limit reached)', async () => {
    const slotsRes = await agent.get('/api/slots?status=available');
    const thirdSlotId = slotsRes.body.slots[0].id;
    const res = await agent.post('/api/bookings').send({ slot_id: thirdSlotId });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /Reservation limit reached.*maximum of 2/i);
  });

  await t.test('GET /api/bookings/my returns the pending booking', async () => {
    const res = await agent.get('/api/bookings/my');
    assert.equal(res.status, 200);
    assert.ok(res.body.bookings.length >= 1);
    const found = res.body.bookings.find((b) => b.id === activeBookingId);
    assert.ok(found);
    assert.equal(found.status, 'pending');
  });

  await t.test('POST /api/bookings/:id/confirm rejects GPS arrival when outside boundary (403)', async () => {
    const res = await agent
      .post(`/api/bookings/${activeBookingId}/confirm`)
      .send({
        lat: 38.000000, // far outside
        lng: -122.419416,
      });

    assert.equal(res.status, 403);
    assert.match(res.body.error, /GPS verification failed/);
  });

  await t.test('POST /api/bookings/:id/confirm accepts GPS arrival when inside boundary (200)', async () => {
    const res = await agent
      .post(`/api/bookings/${activeBookingId}/confirm`)
      .send({
        lat: 37.774929,
        lng: -122.419416,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'confirmed');
    assert.ok(res.body.confirmed_at);
    assert.ok(res.body.auto_release_at);
  });

  await t.test('POST /api/bookings/:id/release releases the occupied slot back to available', async () => {
    const res = await agent.post(`/api/bookings/${activeBookingId}/release`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'released');
    assert.ok(res.body.released_at);

    // Verify slot is available again
    const slotsRes = await agent.get('/api/slots');
    const slot = slotsRes.body.slots.find((s) => s.id === availableSlotId);
    assert.equal(slot.status, 'available');
  });

  await t.test('Scheduler processes expired and auto-release jobs cleanly', async () => {
    const expiredRes = await processExpiredBookings();
    assert.ok(expiredRes);
    const autoReleaseRes = await processAutoReleaseBookings();
    assert.ok(autoReleaseRes);
  });
});
