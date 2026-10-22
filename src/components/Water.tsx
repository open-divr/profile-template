import { crestBoxHeight, crestPath, type CrestSpec } from '../water';

interface WaterLayer {
  color: string;
  crest: CrestSpec;
  /** Where the base of the crests sits, px from the top of the page. Peaks rise up to the crest box height above it. */
  waterline: number;
  /** The water below the crests darkens to near-black with depth (`.water-fade`) instead of staying `color`. */
  fades?: boolean;
}

/**
 * The two layers of the platform's front-page water, at rest: the lighter back layer and the deep front layer in
 * front of it, filling the page below a thin band of black and fading back to near-black further down. Purely
 * decorative, drawn once, never animated.
 */
const LAYERS: readonly WaterLayer[] = [
  { color: 'var(--color-surf)', waterline: 72, crest: { seed: 7, period: 1180, width: [80, 140], depth: [0.22, 0.3], peakDrop: 4 } },
  { color: 'var(--color-deep)', waterline: 108, fades: true, crest: { seed: 23, period: 960, width: [64, 120], depth: [0.22, 0.3], peakDrop: 3 } },
];

/** Periods drawn per row: enough to cover a frame about 4,000 px wide. */
const REPEATS = 5;

const DRAWN = LAYERS.map((layer) => {
  const box = crestBoxHeight(layer.crest);
  const width = layer.crest.period * REPEATS;
  return { ...layer, box, width, d: crestPath(layer.crest, box, REPEATS) };
});

export function Water() {
  return (
    <div className="water" aria-hidden="true">
      {DRAWN.map((layer) => (
        <div
          key={layer.crest.seed}
          className={layer.fades ? 'water-layer water-fade' : 'water-layer'}
          style={{ top: layer.waterline, background: layer.fades ? undefined : layer.color }}
        >
          <svg className="water-crest" width={layer.width} height={layer.box + 1} viewBox={`0 0 ${layer.width} ${layer.box + 1}`}>
            <path d={layer.d} style={{ fill: layer.color }} />
          </svg>
        </div>
      ))}
    </div>
  );
}
