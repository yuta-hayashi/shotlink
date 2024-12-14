import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    permissions: ['activeTab', 'clipboardWrite'],
    host_permissions: ['<all_urls>'],
  },
});
