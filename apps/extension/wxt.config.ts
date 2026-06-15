import { defineConfig } from 'wxt'

export default defineConfig({
  framework: 'react',
  manifest: {
    name:        'Memex — Visual Bookmarks',
    description: 'Save anything from the web. Find it instantly.',
    version:     '0.0.1',
    permissions: ['activeTab', 'storage', 'tabs', 'contextMenus'],
    host_permissions: [
      'http://localhost:3001/*',
      'https://api.memex.com/*',
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Save to Memex',
    },
    browser_specific_settings: {
      gecko: {
        id: 'memex-extension@johnaudu.com',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
})
