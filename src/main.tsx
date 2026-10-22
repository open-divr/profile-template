// Entry point of the profile. Inside the platform the SDK talks to the platform shell; opened on its own
// (`npm run dev`) it serves fixture data and shows a toolbar for switching scenarios and viewport widths.
import { ProfileAPI } from '@divr/profile-sdk';
import { ProfileProvider } from '@divr/profile-sdk/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { log } from './log';
import './index.css';

const api = new ProfileAPI();
const root = document.getElementById('root');

if (root === null) {
  log('error', 'profile.boot', 'missing #root element', { recovery: 'nothing rendered' });
} else {
  createRoot(root).render(
    <StrictMode>
      <ProfileProvider api={api}>
        <App onError={(error) => api.reportError(error)} />
      </ProfileProvider>
    </StrictMode>,
  );
}
