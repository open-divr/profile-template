import { useFollowerCount, useFollowingCount, useGithubProjects, useProfile } from '@divr/profile-sdk/react';
import type { ReactNode } from 'react';
import { AboutBox, LinksBox } from './components/About';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FollowersBox } from './components/FollowersBox';
import { MoreMenu, type MenuSection } from './components/MoreMenu';
import { PostList } from './components/PostList';
import { ContactBox, ProfileHeader } from './components/ProfileHeader';
import { Projects } from './components/Projects';
import { ICON } from './components/ui';
import { Water } from './components/Water';
import { useWideLayout } from './layout';

/**
 * The example profile, laid out like the profile pages of the mid-2000s on the platform's water. Two columns from
 * 1024 px: who it is and how to reach them on the left (identity with both counts, the Follow / More / Fork box,
 * links, projects); what they say on the right (About me, the Friend Space and the wall). One column below
 * that: identity with the counts and the owner's controls, About me cut to its first lines, a menu row
 * opening the Friend Space, links and projects as sheets, then the wall, which scrolls without end.
 *
 * The profile, the counts and the projects are read once here and handed down, so no box repeats a read another
 * already made. Every box sits in its own error boundary.
 */
export function App({ onError }: { onError: (error: unknown) => void }) {
  const profile = useProfile();
  const followerCount = useFollowerCount();
  const followingCount = useFollowingCount();
  const projects = useGithubProjects();
  const wide = useWideLayout();
  const p = profile.data;
  const name = p?.name;
  const box = (key: string, node: ReactNode) => (
    <ErrorBoundary key={key} onError={onError}>
      {node}
    </ErrorBoundary>
  );

  const identity = box(
    'identity',
    <ProfileHeader profile={profile} followerCount={followerCount} followingCount={followingCount} withControls={!wide} />,
  );
  const contact = box('contact', <ContactBox name={name} />);
  const about = box('about', <AboutBox profile={profile} clamp={!wide} />);
  const links = box('links', <LinksBox profile={p} />);
  const friends = box('friends', <FollowersBox name={name} followerCount={followerCount} />);
  const projectsBox = box('projects', <Projects name={name} projects={projects} />);
  const posts = box('posts', <PostList name={name} />);

  const sections: MenuSection[] = [{ key: 'friends', label: 'Friend Space', icon: ICON.person, content: friends }];
  if (p !== undefined && p.links.length > 0) sections.push({ key: 'links', label: 'Links', icon: ICON.link, content: links });
  if ((projects.data?.length ?? 0) > 0 || (projects.data === undefined && projects.error !== undefined)) {
    sections.push({ key: 'projects', label: 'Projects', icon: ICON.star, content: projectsBox });
  }

  // Both layouts keep the same two columns, and the wall stays in the second, so crossing the breakpoint (a tablet
  // turned on its side) moves boxes instead of remounting the wall and losing the pages it has loaded.
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip">
      <Water />
      <main
        className={`relative mx-auto grid w-full px-4 pt-[7.5rem] pb-16 sm:px-6 ${wide ? 'max-w-[61rem] grid-cols-[19rem_minmax(0,1fr)] items-start gap-6' : 'max-w-[42rem] gap-4'}`}
      >
        <div className={`flex min-w-0 flex-col ${wide ? 'gap-6' : 'gap-4'}`}>
          {wide
            ? [identity, contact, links, projectsBox]
            : [identity, ...(p?.description === '' ? [] : [about]), box('menu', <MoreMenu name={name} sections={sections} />)]}
        </div>
        <div className={`flex min-w-0 flex-col ${wide ? 'gap-6' : 'gap-4'}`}>
          {wide ? [about, friends, posts] : [posts]}
        </div>
      </main>
    </div>
  );
}
