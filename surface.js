/** Visual-only continuity filter. Never persisted or used as road/training truth. */
export class SurfaceAlignmentService {
  constructor() { this.reset(); }
  reset() { this.height = null; this.point = null; this.candidate = null; }
  accept(height, point) {
    if (!Number.isFinite(height) || height < -100 || height > 1000) return false;
    if (this.height === null) {
      // Require corroboration: a single coarse tile must not establish a lock.
      const previous = this.candidate;
      this.candidate = height;
      if (previous === null || Math.abs(previous - height) > 0.5) return false;
    } else {
      const north = (point.lat - this.point.lat) * 111320;
      const east = (point.lon - this.point.lon) * 111320 * Math.cos(point.lat * Math.PI / 180);
      const maxChange = Math.min(2.5, 0.6 + Math.hypot(north, east) * 0.2);
      if (Math.abs(height - this.height) > maxChange) return false;
    }
    this.height = height;
    this.point = { ...point };
    return true;
  }
}
