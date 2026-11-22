import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceInMeters, isInsideParkingLot } from '../src/utils/gpsService.js';

test('GPS Service - Haversine calculations', async (t) => {
  await t.test('calculates 0 distance for identical coordinates', () => {
    const distance = calculateDistanceInMeters(37.7749, -122.4194, 37.7749, -122.4194);
    assert.equal(Math.round(distance), 0);
  });

  await t.test('correctly identifies coordinates inside 150m parking lot boundary', () => {
    const lotLat = 37.774929;
    const lotLng = -122.419416;
    const radius = 150;

    // Point ~20 meters away
    const userLat = 37.77505;
    const userLng = -122.419416;

    const result = isInsideParkingLot(userLat, userLng, lotLat, lotLng, radius);
    assert.equal(result.isInside, true);
    assert.ok(result.distanceMeters < 150);
  });

  await t.test('correctly rejects coordinates outside 150m parking lot boundary', () => {
    const lotLat = 37.774929;
    const lotLng = -122.419416;
    const radius = 150;

    // Point ~1000 meters (1km) away
    const userLat = 37.784000;
    const userLng = -122.419416;

    const result = isInsideParkingLot(userLat, userLng, lotLat, lotLng, radius);
    assert.equal(result.isInside, false);
    assert.ok(result.distanceMeters > 150);
  });

  await t.test('throws error on non-numeric inputs', () => {
    assert.throws(() => {
      calculateDistanceInMeters('invalid', -122, 37, -122);
    });
  });
});
