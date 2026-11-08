// Blowing at the device: loudness only. The threshold comes from the room's own quiet,
// measured for half a second when the microphone opens, so a quiet or noisy room both work.
export const FLOOR = 0.03;
export const thresholdFrom = baselineRms => Math.max(FLOOR, baselineRms * 3 + 0.01);

// How much the balloon fills in one frame (60 a second). A full balloon needs a second or more.
export const MAX_STEP = 0.015;
export const HOLD_STEP = 0.009;
export function fillStep(rms, threshold) {
  if (!(rms > threshold)) return 0;
  return Math.min(MAX_STEP, (rms - threshold) * 0.05 + 0.002);
}
