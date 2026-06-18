import { defineConfig } from 'wxt'

export default defineConfig({
  // @ts-expect-error - framework is runtime-validated but type definitions might differ based on latest WXT modules
  framework: 'react',
  manifest: {
    name:        'Memex — Visual Bookmarks',
    description: 'Save anything from the web. Find it instantly.',
    version:     '0.0.3',
    permissions: ['activeTab', 'storage', 'tabs', 'contextMenus'],
    host_permissions: [
      'http://localhost:3001/*',
      'https://api.memex.com/*',
      "https://memexapi-production.up.railway.app/*"
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Save to Memex',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
    browser_action: {
      default_popup: 'popup.html',
      default_title: 'Save to Memex',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
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
