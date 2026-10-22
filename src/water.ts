/**
 * The crests along the top of each layer of water behind the profile, drawn like cartoon waves: a row of concave
 * scoops, each a circular arc, meeting in pointed peaks. Each scoop's width and depth, and the height of each peak,
 * come from a seeded generator, so each layer has its own irregular but stable outline. The scoops of one period add
 * up to exactly `period` px and the last peak matches the first, so the outline repeats seamlessly across the row.
 * The seeds and sizes match the platform's own front page, so the profile sits in the same water.
 */

export interface CrestSpec {
  seed: number;
  /** Width of one repeat, px. */
  period: number;
  width: [min: number, max: number];
  /** Depth of a scoop as a fraction of its width; around 0.25–0.3 gives the classic round scoop and sharp peak. */
  depth: [min: number, max: number];
  /** How far below the highest peak a peak may sit, px, so the peaks are not all level. */
  peakDrop: number;
}

interface Scoop {
  width: number;
  /** Depth below the line between its two peaks, px. */
  depth: number;
  /** How far its left peak sits below the highest possible peak, px. */
  drop: number;
}

/** mulberry32: a small, fast, seedable generator; quality is irrelevant here, determinism is the point. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One period of scoops; their widths are scaled so they sum to `spec.period` exactly. */
function crestScoops(spec: CrestSpec): Scoop[] {
  const random = seeded(spec.seed);
  const between = ([min, max]: [number, number]) => min + (max - min) * random();
  const raw: Array<{ width: number; ratio: number; drop: number }> = [];
  let total = 0;
  while (total < spec.period) {
    const width = between(spec.width);
    raw.push({ width, ratio: between(spec.depth), drop: spec.peakDrop * random() });
    total += width;
  }
  const scale = spec.period / total;
  return raw.map((s) => ({ width: s.width * scale, depth: s.width * scale * s.ratio, drop: s.drop }));
}

/** Height of the box the crests are drawn in: the lowest peak plus the deepest scoop, and a pixel of room. */
export function crestBoxHeight(spec: CrestSpec): number {
  return Math.ceil(spec.peakDrop + spec.width[1] * spec.depth[1]) + 1;
}

const r = (v: number) => Math.round(v * 10) / 10;

/**
 * An SVG path of `repeats` periods of scoops hanging from the top of a box `boxHeight` tall, closed along the bottom
 * so it can be filled. Each scoop is the minor arc of the circle through its two peaks that dips `depth` below
 * them: radius (c²/4 + d²) / 2d for a chord c, swept so it bows downwards.
 */
export function crestPath(spec: CrestSpec, boxHeight: number, repeats: number): string {
  const scoops = crestScoops(spec);
  const first = scoops[0]?.drop ?? 0;
  const parts = [`M0 ${r(first)}`];
  let x = 0;
  for (let i = 0; i < repeats; i++) {
    scoops.forEach((scoop, j) => {
      // The last peak of a period is the first of the next, so the row tiles.
      const nextDrop = scoops[(j + 1) % scoops.length]?.drop ?? first;
      const end = x + scoop.width;
      const radius = (scoop.width * scoop.width) / 4 / (2 * scoop.depth) + scoop.depth / 2;
      parts.push(`A${r(radius)} ${r(radius)} 0 0 0 ${r(end)} ${r(nextDrop)}`);
      x = end;
    });
  }
  parts.push(`V${boxHeight + 1}H0Z`);
  return parts.join('');
}
