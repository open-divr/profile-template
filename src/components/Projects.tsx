import type { GithubProject } from '@divr/profile-sdk';
import { useProfileApi, type QueryResult } from '@divr/profile-sdk/react';
import { ErrorNote, ICON, Panel, PixelIcon, ownersTitle } from './ui';

/**
 * The owner's pinned GitHub projects (optional), as a two-column table. Once requested, each project's name and
 * link must be shown; the link opens through the platform's "You're leaving" page. Nothing renders while they load
 * or when there are none: the box is the last in its column, so its arrival moves nothing else. The read is the
 * page's (App), which also decides whether the single column's menu offers the box at all.
 */
export function Projects({ name, projects }: { name: string | undefined; projects: QueryResult<GithubProject[]> }) {
  const api = useProfileApi();
  const { data, error, refetch } = projects;

  if (data === undefined) {
    return error !== undefined ? (
      <Panel id="projects-title" title={ownersTitle(name, 'Projects')}>
        <div className="p-4">
          <ErrorNote error={error} onRetry={() => void refetch()} />
        </div>
      </Panel>
    ) : null;
  }
  if (data.length === 0) return null;

  return (
    <Panel id="projects-title" title={ownersTitle(name, 'Projects')}>
      <div aria-hidden="true" className="label grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-line bg-abyss/40 px-4 py-2">
        <span>Project</span>
        <span>Stars</span>
      </div>
      <ul className="divide-y divide-line">
        {data.map((p) => (
          <li key={p.url}>
            <button
              type="button"
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3 text-left hover:bg-raised"
              title={p.url}
              onClick={() => api.openLink(p.url)}
            >
              <span className="min-w-0">
                <span className="block font-bold text-primary [overflow-wrap:anywhere]">{p.name}</span>
                {p.description !== null && p.description !== '' && (
                  <span className="mt-0.5 line-clamp-2 text-sm text-muted [overflow-wrap:anywhere]">{p.description}</span>
                )}
                {p.language !== null && <span className="mt-1.5 inline-block border border-line px-1.5 text-[11px] leading-5 font-semibold text-muted">{p.language}</span>}
              </span>
              <span className="flex items-center gap-1 self-start pt-0.5 text-sm font-semibold text-ink tabular-nums">
                <PixelIcon rows={ICON.star} className="h-3 w-3 text-muted" />
                {p.stars.toLocaleString()}
                <span className="sr-only"> stars</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
