import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:8000';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const routes = [
    '/dashboard', '/search?q=co', '/products', '/products/create', '/products/1',
    '/categories', '/units', '/inventory', '/inventory/stock', '/inventory/variants/1',
    '/suppliers', '/suppliers/1', '/purchases', '/purchases/create', '/purchases/1',
    '/customers', '/customers/1', '/pos', '/sales', '/sales/3', '/sales/3/return',
    '/expenses', '/rent', '/finance', '/reports?type=daily', '/reports?type=monthly',
    '/reports?type=yearly', '/tax', '/insights', '/notifications', '/audit',
    '/users', '/roles', '/settings', '/settings/backup', '/onboarding', '/no-such-page',
];

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

let current = 'init';
const issues = [];
page.on('pageerror', (e) => issues.push({ route: current, kind: 'pageerror', msg: e.message }));
page.on('console', (m) => {
    if (m.type() === 'error') {
        const text = m.text();
        if (text.includes('favicon') || text.includes('net::ERR_')) return;
        if (text.includes('Failed to load resource') && current.includes('no-such-page')) return;
        issues.push({ route: current, kind: 'console', msg: text.slice(0, 300) });
    }
});

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
const clearField = (selector) =>
    page.$eval(selector, (el) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });

await clearField('input[type="email"]');
await page.type('input[type="email"]', 'admin@smartshop.et');
await clearField('input[type="password"]');
await page.type('input[type="password"]', 'password');
await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
    page.click('button[type="submit"]'),
]);
if (!page.url().includes('/dashboard')) {
    console.log('LOGIN FAILED at', page.url());
    console.log((await page.evaluate(() => document.body.innerText.slice(0, 250))).replace(/\s+/g, ' '));
    await browser.close();
    process.exit(1);
}

const results = [];
for (const route of routes) {
    current = route;
    const before = issues.length;
    let status = 'ok';
    let detail = '';
    try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 350));
        const info = await page.evaluate(() => {
            const app = document.getElementById('app');
            const text = document.body.innerText || '';
            const mainText = ((document.querySelector('main') || {}).innerText || '').trim();
            return {
                mounted: !!app && app.children.length > 0 && (app.innerText || '').trim().length > 0,
                mainText: mainText.slice(0, 160).replace(/\s+/g, ' '),
                mainLen: mainText.length,
                text: text.slice(0, 160).replace(/\s+/g, ' '),
                hasErrorPage: /Whoops|SQLSTATE|Internal Server Error|Exception occurred/i.test(text),
                loginPage: text.includes('Sign in to manage your shop'),
            };
        });
        if (info.hasErrorPage) { status = 'FAIL'; detail = 'error page: ' + info.text; }
        else if (info.loginPage) { status = 'FAIL'; detail = 'redirected to login (session lost)'; }
        else if (!info.mounted) { status = 'FAIL'; detail = 'app not mounted / empty render'; }
        else if (info.mainLen < 20 && !route.includes('no-such-page')) { status = 'FAIL'; detail = 'empty main content'; }
        else detail = info.mainText.slice(0, 70);
    } catch (e) {
        status = 'FAIL';
        detail = e.message.slice(0, 200);
    }
    const newIssues = issues.slice(before);
    if (status === 'ok' && newIssues.length > 0) status = 'WARN';
    results.push({ route, status, detail, issues: newIssues });
}

// mobile pass on a few key routes
await page.setViewport({ width: 390, height: 844, isMobile: true });
for (const route of ['/dashboard', '/pos', '/products', '/finance']) {
    current = route + ' (mobile)';
    const before = issues.length;
    try {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 300));
        const info = await page.evaluate(() => {
            const app = document.getElementById('app');
            const text = document.body.innerText || '';
            return { mounted: !!app && app.children.length > 0 && (app.innerText || '').trim().length > 0, loginPage: text.includes('Sign in to manage your shop') };
        });
        results.push({ route: current, status: info.mounted && !info.loginPage ? 'ok' : 'FAIL', detail: info.loginPage ? 'redirected to login' : info.mounted ? '' : 'not mounted', issues: issues.slice(before) });
    } catch (e) {
        results.push({ route: current, status: 'FAIL', detail: e.message.slice(0, 150), issues: issues.slice(before) });
    }
}

// RBAC checks as cashier: forbidden pages render the 403 error page, allowed pages render normally
const rbacContext = await browser.createBrowserContext();
const rbac = await rbacContext.newPage();
const rbacIssues = [];
rbac.on('pageerror', (e) => rbacIssues.push({ kind: 'pageerror', msg: e.message }));
rbac.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) rbacIssues.push({ kind: 'console', msg: m.text().slice(0, 200) }); });

const login = async (targetPage, email) => {
    await targetPage.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
    await targetPage.evaluate((value) => {
        const input = document.querySelector('input[type="email"]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, email);
    await targetPage.type('input[type="password"]', 'password');
    await Promise.all([
        targetPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        targetPage.click('button[type="submit"]'),
    ]);
};

await login(rbac, 'cashier@smartshop.et');
if (!rbac.url().includes('/dashboard')) {
    results.push({ route: 'rbac login (cashier)', status: 'FAIL', detail: rbac.url(), issues: rbacIssues.splice(0) });
} else {
    results.push({ route: 'rbac login (cashier)', status: 'ok', detail: 'authenticated', issues: rbacIssues.splice(0) });
    const rbacRoutes = [
        ['/settings', 'forbidden'],
        ['/users', 'forbidden'],
        ['/reports?type=daily', 'forbidden'],
        ['/pos', 'allowed'],
        ['/sales', 'allowed'],
    ];
    for (const [route, expectation] of rbacRoutes) {
        current = 'rbac ' + route;
        const before = rbacIssues.length;
        try {
            await rbac.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise((r) => setTimeout(r, 300));
            const info = await rbac.evaluate(() => {
                const text = document.body.innerText || '';
                const mainText = ((document.querySelector('main') || {}).innerText || '').trim();
                return { forbidden: text.includes('Access denied'), mainLen: mainText.length, first: mainText.slice(0, 60).replace(/\s+/g, ' '), hasErrorPage: /Whoops|SQLSTATE/i.test(text) };
            });
            const ok = !info.hasErrorPage && (expectation === 'forbidden' ? info.forbidden : !info.forbidden && info.mainLen > 20);
            results.push({ route: current, status: ok ? 'ok' : 'FAIL', detail: expectation + ': ' + (info.forbidden ? '403 shown' : info.first), issues: rbacIssues.slice(before) });
        } catch (e) {
            results.push({ route: current, status: 'FAIL', detail: e.message.slice(0, 150), issues: rbacIssues.slice(before) });
        }
    }
}
await rbacContext.close();

// guest checks: login page + error page without a session (isolated cookie jar)
const context = await browser.createBrowserContext();
const guest = await context.newPage();
current = 'guest /login';
const guestIssues = [];
guest.on('pageerror', (e) => guestIssues.push({ kind: 'pageerror', msg: e.message }));
guest.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) guestIssues.push({ kind: 'console', msg: m.text().slice(0, 200) }); });
for (const route of ['/login', '/no-such-page']) {
    current = 'guest ' + route;
    const before = guestIssues.length;
    try {
        await guest.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 300));
        const info = await guest.evaluate(() => {
            const app = document.getElementById('app');
            const text = document.body.innerText || '';
            return { mounted: !!app && app.children.length > 0 && (app.innerText || '').trim().length > 0, text: text.slice(0, 90).replace(/\s+/g, ' '), errorShown: text.includes('404'), hasErrorPage: /Whoops|SQLSTATE/i.test(text) };
        });
        const expect = route === '/login' ? info.text.includes('Sign in to manage your shop') : info.errorShown;
        results.push({ route: current, status: info.mounted && expect && !info.hasErrorPage ? 'ok' : 'FAIL', detail: info.text, issues: guestIssues.slice(before) });
    } catch (e) {
        results.push({ route: current, status: 'FAIL', detail: e.message.slice(0, 150), issues: guestIssues.slice(before) });
    }
}
await context.close();

await browser.close();

let fail = 0;
for (const r of results) {
    if (r.status === 'FAIL') fail++;
    console.log(`${r.status.padEnd(5)} ${r.route.padEnd(34)} ${r.detail}`);
    for (const i of r.issues) console.log(`        [${i.kind}] ${i.msg}`);
}
console.log(`\nFAIL=${fail} WARN=${results.filter((r) => r.status === 'WARN').length} TOTAL=${results.length}`);
process.exit(fail > 0 ? 1 : 0);
