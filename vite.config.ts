import { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { getErrorMessage } from './src/core/utils/errors';
import { DEEPSEEK_MAX_REQUEST_BYTES } from './src/core/services/deepSeekLimits';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_PROXY_PATH = '/api/deepseek/chat/completions';
const MAX_REQUEST_BYTES = DEEPSEEK_MAX_REQUEST_BYTES;
type NextFunction = (error?: unknown) => void;
async function readRequestBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_REQUEST_BYTES) {
            throw new Error(`DeepSeek request vượt quá giới hạn ${DEEPSEEK_MAX_REQUEST_BYTES / 1024 / 1024} MB.`);
        }
        chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
}
function getLatestApiKey(initialApiKey: string): string {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/VITE_DEEPSEEK_API_KEY=["']?([^"'\r\n]+)["']?/i) ||
                content.match(/DEEPSEEK_API_KEY=["']?([^"'\r\n]+)["']?/i);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
    }
    catch (error: unknown) {
        console.warn(`Không thể đọc khóa API mới nhất từ .env; sử dụng cấu hình ban đầu. ${getErrorMessage(error)}`);
    }
    return initialApiKey;
}
function deepSeekProxy(apiKey: string): Plugin {
    const middleware = async (request: IncomingMessage, response: ServerResponse, next: NextFunction) => {
        const pathname = request.url?.split('?')[0];
        if (pathname !== DEEPSEEK_PROXY_PATH) {
            next();
            return;
        }
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method !== 'POST') {
            response.statusCode = 405;
            response.end(JSON.stringify({ error: { message: 'Method not allowed.' } }));
            return;
        }
        const authHeader = request.headers['authorization'];
        const activeApiKey = (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '') || getLatestApiKey(apiKey);
        if (!activeApiKey) {
            response.statusCode = 503;
            response.end(JSON.stringify({
                error: { message: 'Chưa cấu hình VITE_DEEPSEEK_API_KEY trong file .env.' },
            }));
            return;
        }
        try {
            const body = await readRequestBody(request);
            const upstream = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${activeApiKey}`,
                    'Content-Type': 'application/json',
                },
                body,
            });
            const payload = await upstream.text();
            response.statusCode = upstream.status;
            response.end(payload);
        }
        catch (error: unknown) {
            const message = getErrorMessage(error, 'DeepSeek proxy gặp lỗi.');
            response.statusCode = 502;
            response.end(JSON.stringify({ error: { message } }));
        }
    };
    return {
        name: 'autoflow-deepseek-proxy',
        configureServer(server) {
            server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
            server.middlewares.use(middleware);
        },
    };
}
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const deepSeekApiKey = env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY || '';
    return {
        plugins: [react(), deepSeekProxy(deepSeekApiKey)],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 5173,
            host: true,
        },
    };
});
