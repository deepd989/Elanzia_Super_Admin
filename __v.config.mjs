import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Verification-only config. Stubs screens another session has registered in
// navigation.js but not written yet, so this harness can exercise the
// Communications and Support work without waiting on them. Nothing in the
// repo is modified.
const stub = '/private/tmp/claude-501/-Users-deepdama-Desktop-Learning-Experiments-marketplaceb2bUI-elanzia-super-admin/b8fc2ac8-f263-4143-965c-d9cc901fde23/scratchpad/stub.jsx';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@/pages/Growth/ADM-074-ShowReporting.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-075-CmsPages.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-076-MediaLibrary.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-077-Collections.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-078-Banners.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-079-PageTemplates.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-080-SeoSettings.jsx', replacement: stub },
      { find: '@/pages/Growth/ADM-081-Redirects.jsx', replacement: stub },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
});
