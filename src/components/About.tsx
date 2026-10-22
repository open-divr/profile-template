import type { Profile } from '@divr/profile-sdk';
import { useProfileApi, type QueryResult } from '@divr/profile-sdk/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { ErrorNote, ICON, Panel, PixelIcon, Skeleton, ownersTitle } from './ui';

/** The owner's description (required to be visible, and may be empty); `clamp` cuts it to its first lines. */
export function AboutBox({ profile, clamp = false }: { profile: QueryResult<Profile>; clamp?: boolean }) {
  const p = profile.data;
  // No title bar: the "About me" label says what the box is, and is its heading.
  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="about-title">
      <h2 id="about-title" className="label">
        About me
      </h2>
      {p === undefined ? (
        profile.error !== undefined ? (
          <div className="mt-3">
            <ErrorNote error={profile.error} onRetry={() => void profile.refetch()} />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )
      ) : p.description !== '' ? (
        clamp ? (
          <ClampedDescription text={p.description} />
        ) : (
          <p className="prose-text mt-2">{p.description}</p>
        )
      ) : (
        <p className="mt-2 text-muted [overflow-wrap:anywhere]">{p.name} hasn’t written anything here yet.</p>
      )}
    </section>
  );
}

/**
 * The description cut to its first lines, with a control to show the rest: it must stay visible, but up to 500
 * characters above the wall would push the posts off a phone's first screen. The control appears only when the
 * text is actually cut, which depends on the width.
 */
export function ClampedDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [cut, setCut] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || expanded) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="mt-2">
      <p ref={ref} id="profile-description" className={`prose-text ${expanded ? '' : 'line-clamp-4'}`}>
        {text}
      </p>
      {(cut || expanded) && (
        <button type="button" className="btn-text" aria-expanded={expanded} aria-controls="profile-description" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

/** `github.com` and `/ada` from `https://www.github.com/ada/`, so the host can stand out from the path. */
function splitUrl(url: string): { host: string; rest: string } {
  try {
    const u = new URL(url);
    return { host: u.host.replace(/^www\./, ''), rest: `${u.pathname}${u.search}${u.hash}`.replace(/\/$/, '') };
  } catch {
    return { host: url, rest: '' };
  }
}

/** The owner's links (optional to show; each opens through the platform's "You're leaving" page). */
export function LinksBox({ profile }: { profile: Profile | undefined }) {
  const api = useProfileApi();
  if (profile === undefined || profile.links.length === 0) return null;
  return (
    <Panel id="links-title" title={ownersTitle(profile.name, 'Links')}>
      <ul className="divide-y divide-line">
        {profile.links.map((url) => {
          const { host, rest } = splitUrl(url);
          return (
            <li key={url}>
              <button
                type="button"
                className="flex min-h-11 w-full min-w-0 items-center gap-3 px-4 py-2 text-left hover:bg-raised"
                title={url}
                onClick={() => api.openLink(url)}
              >
                <PixelIcon rows={ICON.link} className="h-3 w-3 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-bold text-primary">{host}</span>
                  <span className="text-muted">{rest}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
