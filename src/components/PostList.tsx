import type { Post, PostImage } from '@divr/profile-sdk';
import { LoadMoreButton, LoadMoreSentinel, PostActions, usePosts, useProfileApi } from '@divr/profile-sdk/react';
import { useState } from 'react';
import { Avatar } from './Avatar';
import { ErrorNote, ICON, Panel, PixelIcon, Skeleton, hostOf, ownersTitle } from './ui';

/** Longer texts start collapsed so one long post does not push the rest of the wall away. */
const COLLAPSE_AT = 600;

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFormat.format(d);
}

/**
 * The owner's wall: every post's content, the four required per-post controls (via `<PostActions>`), and
 * paging (an infinite-scroll sentinel plus an explicit "load more" control for keyboard users). The wall is the
 * last box in its column at every width, so it can load for as long as the viewer scrolls.
 */
export function PostList({ name }: { name: string | undefined }) {
  const { posts, error, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = usePosts();
  const more = () => void fetchNextPage();

  return (
    <Panel id="posts-title" title={ownersTitle(name, 'Posts')}>
      {error !== undefined && posts.length === 0 ? (
        <div className="p-4 sm:p-5">
          <ErrorNote error={error} onRetry={() => void refetch()} />
        </div>
      ) : isLoading ? (
        <div className="divide-y divide-line" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3 px-4 py-4 sm:px-5">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-lg font-bold">Nothing posted yet.</p>
          <p className="mt-1 text-sm text-muted">New posts will show up here.</p>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {posts.map((post) => (
            <li key={post.id}>
              <PostEntry post={post} />
            </li>
          ))}
        </ol>
      )}

      {posts.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-5">
          {error !== undefined && <ErrorNote error={error} onRetry={more} />}
          <LoadMoreSentinel onVisible={more} disabled={!hasNextPage || isFetchingNextPage || error !== undefined} />
          {hasNextPage ? (
            <LoadMoreButton onClick={more} disabled={isFetchingNextPage} className="btn-secondary self-center px-6">
              {isFetchingNextPage ? 'Loading…' : 'Load more posts'}
            </LoadMoreButton>
          ) : (
            <p className="text-center text-sm text-muted">That’s everything.</p>
          )}
        </div>
      )}
    </Panel>
  );
}

/**
 * One entry on the wall, dated like a blog entry. The owner's own posts need no byline (the box is theirs); a
 * repost credits the original's author above the quoted original.
 */
function PostEntry({ post }: { post: Post }) {
  const api = useProfileApi();
  const original = post.repostOf;

  return (
    <article className="px-4 py-4 sm:px-5">
      {original === null ? (
        <>
          <p className="label">
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          </p>
          <PostBody post={post} />
        </>
      ) : (
        <>
          <p className="label flex items-center gap-1.5">
            <PixelIcon rows={ICON.repost} className="h-3 w-3" />
            <span>
              Reposted · <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            </span>
          </p>
          <div className="mt-3 border-l-2 border-edge pl-3 sm:pl-4">
            <button
              type="button"
              className="flex min-h-11 max-w-full min-w-0 items-center gap-2.5 text-left hover:[&_.author]:underline"
              title={`@${original.author.handle}`}
              onClick={() => api.openProfile(original.author.handle)}
            >
              <Avatar src={original.author.avatarUrl} name={original.author.name} size={36} />
              <span className="min-w-0">
                <span className="author block truncate text-sm font-bold text-primary">{original.author.name}</span>
                <time dateTime={original.createdAt} className="block text-xs text-muted">
                  {formatDate(original.createdAt)}
                </time>
              </span>
            </button>
            <PostBody post={original} />
          </div>
        </>
      )}

      <PostActions
        post={post}
        className="mt-4 grid grid-cols-4 divide-x divide-line border border-line"
        buttonClassName="min-h-11 min-w-0 px-0.5 py-1 text-xs leading-tight sm:px-1 sm:text-[13px] font-semibold text-muted [overflow-wrap:anywhere] hover:bg-raised hover:text-primary"
      />
    </article>
  );
}

function PostBody({ post }: { post: Post }) {
  const api = useProfileApi();
  const link = post.link;
  return (
    <>
      {post.text !== null && post.text !== '' && <PostText text={post.text} />}
      {post.images.length > 0 && <ImageGrid images={post.images} />}
      {link !== null && (
        <button
          type="button"
          className="mt-3 flex w-full min-w-0 items-center gap-3 border border-line bg-abyss/40 p-3 text-left hover:border-edge hover:bg-raised"
          title={link}
          onClick={() => api.openLink(link)}
        >
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center border border-edge text-primary">
            <PixelIcon rows={ICON.link} className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-primary">{hostOf(link)}</span>
            <span className="block truncate text-xs text-muted">{link}</span>
          </span>
        </button>
      )}
    </>
  );
}

function PostText({ text }: { text: string }) {
  const long = text.length > COLLAPSE_AT;
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <p className={`prose-text ${long && !open ? 'line-clamp-6' : ''}`}>{text}</p>
      {long && (
        <button type="button" className="btn-text" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function ImageGrid({ images }: { images: PostImage[] }) {
  const single = images.length === 1;
  return (
    <div className={`mt-3 grid gap-1 border border-line bg-line ${single ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {images.map((img, i) => (
        <img
          key={`${img.url}#${i}`}
          src={img.url}
          alt={img.alt}
          width={img.width}
          height={img.height}
          loading="lazy"
          decoding="async"
          className={`h-full w-full bg-raised object-cover ${images.length === 3 && i === 0 ? 'col-span-2' : ''}`}
          style={{ aspectRatio: single ? `${img.width} / ${img.height}` : '4 / 3', maxHeight: single ? 520 : undefined }}
        />
      ))}
    </div>
  );
}
