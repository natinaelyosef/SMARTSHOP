import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.APP_HOST || '127.0.0.1';
const port = Number(process.env.APP_PORT || 8000);
const baseUrl = `http://${host}:${port}`;
const shouldOpen = !process.argv.slice(2).includes('--no-open');

const children = [];

function start(name, command, args, options = {}) {
    const child = spawn(command, args, { cwd: root, windowsHide: true, shell: false, ...options });
    children.push({ name, child });

    const pipe = (stream, target) => {
        stream.on('data', (chunk) => {
            String(chunk)
                .split(/\r?\n/)
                .filter(Boolean)
                .forEach((line) => target.write(`[${name}] ${line}\n`));
        });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);

    child.on('exit', (code, signal) => {
        if (shuttingDown) return;
        console.error(`[${name}] exited unexpectedly (code=${code}, signal=${signal}). Stopping...`);
        shutdown(typeof code === 'number' ? code : 1);
    });

    return child;
}

function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const { child } of children) {
        if (child.exitCode === null && !child.killed) {
            try {
                child.kill();
            } catch {}
        }
    }
    setTimeout(() => process.exit(code), 300);
}

let shuttingDown = false;
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function isOurApp(url = `${baseUrl}/login`) {
    try {
        const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
        const body = await res.text();
        return res.status === 200 && (body.includes('csrf-token') || body.includes('data-page'));
    } catch {
        return false;
    }
}

async function waitFor(check, { timeoutMs = 60000, intervalMs = 400 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return true;
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
}

function open(url) {
    if (!shouldOpen) return;
    const [cmd, args] =
        process.platform === 'win32'
            ? ['cmd', ['/c', 'start', '', url]]
            : process.platform === 'darwin'
                ? ['open', [url]]
                : ['xdg-open', [url]];
    try {
        spawn(cmd, args, { cwd: root, windowsHide: true, stdio: 'ignore', detached: true }).unref();
    } catch {}
}

console.log('Starting SmartShop Manager dev environment...');

// 1. Laravel (reuse an already running server if it is ours)
if (await isOurApp()) {
    console.log(`[app] Laravel is already running at ${baseUrl} - reusing it.`);
} else {
    console.log(`[app] starting php artisan serve on ${baseUrl}`);
    start('app', 'php', ['artisan', 'serve', `--host=${host}`, `--port=${port}`]);
}

// 2. Vite (hot reload + React refresh). Serving is done by Laravel.
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (existsSync(viteBin)) {
    console.log('[vite] starting dev server (hot reload enabled)');
    start('vite', process.execPath, [viteBin]);
} else {
    console.error('[vite] vite is not installed. Run: npm install && npm run build');
    shutdown(1);
}

// 3. Wait until the app answers with assets ready, then open it
const ready = await waitFor(async () => (await isOurApp()) && existsSync(path.join(root, 'public', 'hot')), {
    timeoutMs: 90000,
});
if (!ready) {
    console.error(`[app] did not become ready at ${baseUrl}. Check the logs above.`);
    shutdown(1);
} else {
    console.log('');
    console.log(`  App is ready -> ${baseUrl}`);
    console.log('  Login: admin@smartshop.et / password');
    console.log('  Stop with Ctrl+C');
    console.log('');
    open(`${baseUrl}/login`);
}
