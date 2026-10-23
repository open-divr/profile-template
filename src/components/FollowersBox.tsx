import { useFollowers, useProfileApi, type QueryResult } from '@divr/profile-sdk/react';
import { useEffect } from 'react';
import { errorFields, log } from '../log';
import { Avatar } from './Avatar';
import { ICON, Panel, PixelIcon, Skeleton, ownersTitle } from './ui';

/** How many of the newest followers get a face in the box; "View all" opens the platform's full list. */
const SHOWN = 8;

/**
 * The Friend Space: the newest followers' faces and the control that opens the platform's Followers page. Both
 * are optional (the counts, which are required, sit in the header); when the faces cannot be fetched the box is
 * the View all control alone. In the two-column layout the box stands in the narrow left column, so the faces
 * run two across and down; in a phone sheet they run four or eight across.
 */
export function FollowersBox({
  name,
  followerCount,
  inColumn,
}: {
  name: string | undefined;
  followerCount: QueryResult<number>;
  inColumn: boolean;
}) {
  const api = useProfileApi();
  const { followers, error, isLoading } = useFollowers({ limit: SHOWN });
  const facesFailed = error !== undefined && followers.length === 0;

  useEffect(() => {
    if (facesFailed) log('warn', 'profile.followers', 'newest followers unavailable', { ...errorFields(error), recovery: 'left the faces out; View all still shown' });
  }, [facesFailed, error]);

  const none = followerCount.data === 0 || (!isLoading && error === undefined && followers.length === 0);
  const showFaces = !none && (followers.length > 0 || isLoading);

  return (
    <Panel id="friends-title" title={ownersTitle(name, 'Friend Space')}>
      <div className="p-4 sm:p-5">
        {none && <p className="text-muted [overflow-wrap:anywhere]">Nobody follows {name ?? 'this profile'} yet.</p>}

        {showFaces && (
          <div>
            <h3 className="label">Newest followers</h3>
            <ul className={`mt-2 grid gap-1 ${inColumn ? 'grid-cols-2' : 'grid-cols-4 sm:grid-cols-8'}`}>
              {followers.length === 0
                ? Array.from({ length: Math.min(SHOWN, followerCount.data ?? 4) }, (_, i) => (
                    <li key={i} className="flex flex-col items-center gap-1.5 p-1.5" aria-hidden="true">
                      <Skeleton className="mt-[18px] h-3 w-12" />
                      <Skeleton className="h-14 w-14 rounded-full sm:h-12 sm:w-12" />
                    </li>
                  ))
                : followers.slice(0, SHOWN).map((f) => (
                    <li key={f.handle} className="min-w-0">
                      <button
                        type="button"
                        className="flex w-full min-w-0 flex-col items-center gap-1.5 p-1.5 text-center hover:bg-raised"
                        title={`${f.name} (@${f.handle})`}
                        onClick={() => api.openProfile(f.handle)}
                      >
                        {/* Name above the picture, as friend boxes always had it; two lines' room keeps the pictures level. */}
                        <span className="flex min-h-[2lh] w-full items-end justify-center text-[11px] leading-tight font-semibold text-primary">
                          <span className="line-clamp-2 [overflow-wrap:anywhere]">{f.name}</span>
                        </span>
                        <Avatar src={f.avatarUrl} name={f.name} size={48} className="max-sm:h-14! max-sm:w-14!" />
                      </button>
                    </li>
                  ))}
            </ul>
          </div>
        )}

        <div className={`flex justify-end ${none || showFaces ? 'mt-4 border-t border-line pt-1' : ''}`}>
          <button type="button" className="btn-text" onClick={() => api.openFollowers()}>
            View all followers
            <PixelIcon rows={ICON.arrow} className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Panel>
  );
}
