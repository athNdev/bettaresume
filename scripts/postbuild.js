import { copyFileSync } from 'node:fs';

// Copy custom 404.html for GitHub Pages SPA support
copyFileSync('public/404.html', 'out/404.html');
console.log('✓ Copied 404.html for GitHub Pages SPA redirect');
