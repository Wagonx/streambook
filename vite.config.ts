import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 5173,
		strictPort: false,
		cors: {
			origin: [
				'http://localhost:5173',
				'http://localhost:4173',
				'http://127.0.0.1:5173',
				'http://127.0.0.1:4173',
				'https://better.wagonnet.com'
			],
			credentials: true
		}
	}
});


