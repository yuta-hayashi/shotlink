import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    permissions: ['activeTab', 'clipboardWrite', 'offscreen'],
    host_permissions: ['<all_urls>'],
  },
});
