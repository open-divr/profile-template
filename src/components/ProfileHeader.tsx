import type { Profile } from '@divr/profile-sdk';
import { FollowButton, ForkButton, MoreButton, useViewerFollowsOwner, useViewerIsOwner, type QueryResult } from '@divr/profile-sdk/react';
import { Avatar } from './Avatar';
import { ErrorNote, ICON, PixelIcon, Skeleton, shortUrl } from './ui';

interface ProfileHeaderProps {
  profile: QueryResult<Profile>;
  followerCount: QueryResult<number>;
  followingCount: QueryResult<number>;
  /** Carry the owner's controls here (the single column, which has no contact box). */
  withControls: boolean;
}

/**
 * The owner's identity: name, picture, handle, profile address and both follow counts, the first things a visitor
 * sees, and in one column the Follow / More / Fork controls under them. Name, avatar and counts are required to be
 * visible; the name is the page's only first-level heading.
 */
export function ProfileHeader({ profile, followerCount, followingCount, withControls }: ProfileHeaderProps) {
  const p = profile.data;

  if (p === undefined) {
    return (
      <section className="panel p-4 sm:p-5" aria-label="Profile">
        {profile.error !== undefined ? (
          <ErrorNote error={profile.error} onRetry={() => void profile.refetch()} />
        ) : (
          <>
            <Skeleton className="h-8 w-3/4" />
            <div className="mt-4 flex gap-4">
              <Skeleton className="h-[114px] w-[114px] shrink-0" />
              <div className="flex-1 space-y-3 pt-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <Skeleton className="mt-4 h-[66px] w-full" />
          </>
        )}
      </section>
    );
  }

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="profile-name">
      <h1 id="profile-name" className="text-[26px] leading-[1.15] font-extrabold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
        {p.name}
      </h1>
      <div className="mt-4 flex items-start gap-4">
        {/* The photo sits in a square frame, the way profile photos did before everything was a circle. */}
        <div className="shrink-0 border border-edge bg-abyss p-1.5 shadow-[3px_3px_0_rgb(0_0_0/0.45)]">
          <Avatar src={p.avatarUrl} name={p.name} size={100} />
        </div>
        <dl className="min-w-0 flex-1 space-y-3 pt-1">
          <div>
            <dt className="label">Handle</dt>
            <dd className="mt-1 font-semibold [overflow-wrap:anywhere]">@{p.handle}</dd>
          </div>
          {p.profileUrl !== '' && (
            <div>
              <dt className="label">Divr URL</dt>
              <dd className="mt-1 text-[13px] text-muted select-all [overflow-wrap:anywhere]">{shortUrl(p.profileUrl)}</dd>
            </div>
          )}
        </dl>
      </div>
      <Counts followerCount={followerCount} followingCount={followingCount} />
      {withControls && (
        <div className="mt-4">
          <OwnerControls />
        </div>
      )}
    </section>
  );
}

/** Followers and following, side by side under the picture. */
function Counts({ followerCount, followingCount }: { followerCount: QueryResult<number>; followingCount: QueryResult<number> }) {
  const failed = [followerCount, followingCount].find((q) => q.data === undefined && q.error !== undefined);
  return (
    <>
      <dl className="mt-4 grid grid-cols-2 divide-x divide-line border border-line bg-abyss/40">
        <Stat label={followerCount.data === 1 ? 'Follower' : 'Followers'} query={followerCount} />
        <Stat label="Following" query={followingCount} />
      </dl>
      {failed !== undefined && (
        <div className="mt-3">
          <ErrorNote
            error={failed.error}
            onRetry={() => {
              void followerCount.refetch();
              void followingCount.refetch();
            }}
          />
        </div>
      )}
    </>
  );
}

function Stat({ label, query }: { label: string; query: QueryResult<number> }) {
  return (
    <div className="flex flex-col-reverse items-center gap-0.5 px-3 py-2.5">
      <dt className="label">{label}</dt>
      <dd className="text-2xl leading-tight font-extrabold text-primary tabular-nums">
        {query.data !== undefined ? (
          query.data.toLocaleString()
        ) : query.error !== undefined ? (
          <span className="text-muted">?</span>
        ) : (
          <Skeleton className="my-1 h-6 w-10" />
        )}
      </dd>
    </div>
  );
}

/** The owner's controls in their own untitled box, as the two-column layout's left column has them. */
export function ContactBox({ name }: { name: string | undefined }) {
  return (
    <section className="panel p-3 sm:p-4" aria-label={name === undefined ? 'Profile actions' : `${name}: profile actions`}>
      <OwnerControls />
    </section>
  );
}

/**
 * The three owner controls, required for every viewer but the owner (the SDK's buttons render nothing on the
 * owner's own profile, and nothing until the platform has said who is looking). Follow is the one solid button on
 * the page; once the viewer follows the owner it reads Unfollow and steps back to the secondary style (the
 * platform asks before unfollowing). More and Fork keep static labels: whether forking is open to this viewer is
 * the platform's to say in its sheet.
 */
function OwnerControls() {
  const owner = useViewerIsOwner();
  const following = useViewerFollowsOwner();

  return (
    // One row of three controls when there is room (single column on a tablet), Follow on its own row otherwise.
    <div className="@container">
      {owner === true ? (
        <p className="text-sm text-muted">This is your profile. Visitors see Follow, More and Fork here.</p>
      ) : owner === undefined ? (
        <div className="grid grid-cols-2 gap-2 @md:grid-cols-[2fr_1fr_1fr]" aria-hidden="true">
          <Skeleton className="col-span-2 h-12 @md:col-span-1" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 @md:grid-cols-[2fr_1fr_1fr]">
          {following === undefined ? (
            <Skeleton className="col-span-2 h-12 @md:col-span-1" />
          ) : (
            <FollowButton className={`col-span-2 @md:col-span-1 ${following ? 'btn-secondary min-h-12 text-base' : 'btn-primary'}`}>
              {(f) => (
                <>
                  <PixelIcon rows={f ? ICON.minus : ICON.plus} className="h-3.5 w-3.5" />
                  {f ? 'Unfollow' : 'Follow'}
                </>
              )}
            </FollowButton>
          )}
          <MoreButton className="btn-secondary">
            <PixelIcon rows={ICON.dots} className="h-3.5 w-3.5" />
            More
          </MoreButton>
          <ForkButton className="btn-secondary">
            <PixelIcon rows={ICON.fork} className="h-3.5 w-3.5" />
            Fork
          </ForkButton>
        </div>
      )}
    </div>
  );
}
