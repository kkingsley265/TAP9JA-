import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type { D1DatabaseLike, D1PreparedStatementLike } from './functions/lib/db.ts';
import { handleApiRequest, type EnvBindings } from './functions/lib/router.ts';

function createSqliteD1Adapter(dbPath: string): D1DatabaseLike {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');

  function makeStatement(query: string, boundArgs: unknown[] = []): D1PreparedStatementLike {
    return {
      bind(...values: unknown[]) {
        return makeStatement(query, values);
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const row = sqlite.prepare(query).get(...boundArgs) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (colName) return (row[colName] as T) ?? null;
        return row as T;
      },
      async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
        const rows = sqlite.prepare(query).all(...boundArgs) as T[];
        return { results: rows };
      },
      async run() {
        const info = sqlite.prepare(query).run(...boundArgs);
        return { success: true, meta: { changes: info.changes } };
      },
    };
  }

  return {
    prepare(query: string) {
      return makeStatement(query);
    },
  };
}

// Ephemeral fallback JWT secret for local preview if JWT_SECRET is not yet set in .env
const ephemeralJwtSecret = crypto.randomBytes(32).toString('hex');

async function startServer() {
  const app = express();
  const port = 3000;
  const dbPath = path.resolve(process.cwd(), 'data', 'tap9ja.db');
  const dbAdapter = createSqliteD1Adapter(dbPath);

  const envBindings: EnvBindings = {
    DB: dbAdapter,
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || ephemeralJwtSecret,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
    PRO_PRICE: process.env.PRO_PRICE || '1000',
  };

  // Mount all /api/* routes through the shared Fetch-standard Cloudflare-compatible router
  app.use('/api', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
    try {
      const origin = `${req.protocol}://${req.get('host') || `localhost:${port}`}`;
      const fullUrl = new URL(req.originalUrl, origin).toString();
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headers.set(k, v);
        else if (Array.isArray(v)) headers.set(k, v.join(', '));
      }

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const bodyBuffer =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0 ? new Uint8Array(req.body) : undefined;

      const webRequest = new Request(fullUrl, {
        method: req.method,
        headers,
        body: bodyBuffer,
      });

      const webResponse = await handleApiRequest(webRequest, envBindings);
      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const text = await webResponse.text();
      res.send(text);
    } catch (err) {
      console.error('API bridge error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TAP9JA server running on http://0.0.0.0:${port}`);
  });
}

startServer();
