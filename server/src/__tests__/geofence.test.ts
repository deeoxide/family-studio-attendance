import { describe, expect, it } from 'vitest';
import { distanceMeters } from '../lib/geofence';

describe('distanceMeters', () => {
  it('is zero for identical coordinates', () => {
    expect(distanceMeters(17.9757, 102.6331, 17.9757, 102.6331)).toBe(0);
  });

  it('is roughly symmetric', () => {
    const a = distanceMeters(17.9757, 102.6331, 17.977, 102.6345);
    const b = distanceMeters(17.977, 102.6345, 17.9757, 102.6331);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });

  it('one hundredth of a degree of latitude is roughly 1.1km', () => {
    const d = distanceMeters(17.9757, 102.6331, 17.9857, 102.6331);
    expect(d).toBeGreaterThan(1050);
    expect(d).toBeLessThan(1150);
  });

  it('is small (within the 10-40m geofence range) for nearby points', () => {
    // ~0.00009 deg lat ~= 10m
    const d = distanceMeters(17.9757, 102.6331, 17.97579, 102.6331);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(15);
  });
});
