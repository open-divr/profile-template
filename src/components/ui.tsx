import { isProfileApiError } from '@divr/profile-sdk';
import { createContext, useContext, type ReactNode } from 'react';

/** Short, viewer-facing text for a failed read. */
export function describeError(error: unknown): string {
  if (isProfileApiError(error)) {
    switch (error.code) {
      case 'rate_limited': {
        const seconds = Math.max(1, Math.ceil((error.retryAfterMs ?? 1000) / 1000));
        return `Too many requests. Try again in ${seconds} s.`;
      }
      case 'not_found':
        return 'This profile is not available.';
      case 'not_allowed':
        return 'That is not allowed here.';
      case 'unavailable':
        return 'The platform did not answer. Try again.';
    }
  }
  return 'Something went wrong. Try again.';
}

/** A box title in the owner's name, `Alice’s Posts`, or just `Posts` while the name is still loading. */
export function ownersTitle(name: string | undefined, noun: string): string {
  return name === undefined ? noun : `${name}’s ${noun}`;
}

/** Closes the sheet a panel is shown in (see MoreMenu); null when the panel sits on the page. */
export const SheetClose = createContext<(() => void) | null>(null);

/**
 * One box of the page: a section with its title in the bar across the top. The title is the section's heading,
 * so screen reader users can jump between boxes the way sighted readers scan the bars. Inside a sheet the bar
 * also carries the sheet's Close button.
 */
export function Panel({ id, title, className = '', children }: { id: string; title: string; className?: string; children: ReactNode }) {
  const close = useContext(SheetClose);
  return (
    <section className={`panel ${className}`} aria-labelledby={id}>
      {close === null ? (
        <h2 id={id} className="panel-bar">
          {title}
        </h2>
      ) : (
        <div className="panel-bar">
          <h2 id={id} className="min-w-0 flex-1">
            {title}
          </h2>
          <button type="button" className="-my-2 -mr-3 inline-flex h-11 w-11 shrink-0 items-center justify-center hover:bg-raised" aria-label="Close" onClick={close}>
            <PixelIcon rows={ICON.close} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorNote({ error, onRetry, children }: { error: unknown; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-warn/50 bg-warn/[0.06] px-3 py-2 text-sm text-ink">
      <PixelIcon rows={ICON.warn} className="h-4 w-4 shrink-0 text-warn" />
      <span className="min-w-0 flex-1">{children ?? describeError(error)}</span>
      {onRetry !== undefined && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/** A still placeholder in the shape of what is coming. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-placeholder ${className}`} />;
}

/** `example.com` from a URL, for compact link labels. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** A URL without its scheme or trailing slash, e.g. `github.com/ada`. */
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/** Icons drawn on an 8 × 8 grid ('#' is a lit pixel). */
export const ICON = {
  plus: ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...'],
  minus: ['........', '........', '........', '########', '########', '........', '........', '........'],
  dots: ['........', '........', '........', '##.##.##', '##.##.##', '........', '........', '........'],
  fork: ['##....##', '##....##', '.#....#.', '.##..##.', '..####..', '...##...', '...##...', '..####..'],
  arrow: ['........', '....#...', '....##..', '#######.', '########', '#######.', '....##..', '....#...'],
  link: ['..######', '......##', '.....###', '....##.#', '...##..#', '..##....', '.##.....', '##......'],
  repost: ['.....#..', '.#######', '.#...#..', '.#......', '......#.', '..#...#.', '#######.', '..#.....'],
  star: ['...##...', '...##...', '########', '.######.', '..####..', '..####..', '.##..##.', '##....##'],
  person: ['...##...', '..####..', '..####..', '...##...', '........', '.######.', '########', '########'],
  close: ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'],
  warn: ['...##...', '...##...', '...##...', '...##...', '...##...', '........', '...##...', '...##...'],
} as const;

const pathCache = new Map<readonly string[], string>();

function pixelPath(rows: readonly string[]): string {
  const cached = pathCache.get(rows);
  if (cached !== undefined) return cached;
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) if (row[x] === '#') d += `M${x} ${y}h1v1h-1z`;
  });
  pathCache.set(rows, d);
  return d;
}

/** A small blocky icon in the current text colour; decorative, so hidden from assistive technology. */
export function PixelIcon({ rows, className = 'h-4 w-4' }: { rows: readonly string[]; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${rows[0]?.length ?? 8} ${rows.length}`} shapeRendering="crispEdges" className={`fill-current ${className}`}>
      <path d={pixelPath(rows)} />
    </svg>
  );
}
