import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  build: {
    rollupOptions: {
      input: [
        resolve(root, 'index.html'),
        resolve(root, 'about.html'),
        resolve(root, 'work.html'),
        resolve(root, 'service.html'),
        resolve(root, 'contact.html'),
        resolve(root, 'terms.html'),
        resolve(root, 'booking.html'),
        resolve(root, 'account.html'),
        resolve(root, 'admin.html')
      ]
    }
  }
});