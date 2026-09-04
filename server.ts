import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { app } from './src/server/app';

const PORT = 3000;

async function startServer() {
  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start listening when not running in Vercel serverless runtime
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`DataLens AI server running at http://0.0.0.0:${PORT}`);
    });
  }
}

// Start server if this is the main entry point
if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Failed to start DataLens AI server:', err);
    process.exit(1);
  });
}

export { app };
export default app;
