import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targets = process.argv.slice(2);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });

for (const url of targets) {
    const page = await browser.newPage();
    const msgs = [];
    page.on('console', (m) => msgs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
    page.on('pageerror', (e) => msgs.push(`[pageerror] ${e.message.slice(0, 300)}`));
    page.on('requestfailed', (r) => msgs.push(`[requestfailed] ${r.url()} :: ${r.failure()?.errorText}`));
    let status = 'n/a';
    try {
        const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        status = resp ? resp.status() : 'no-response';
        await new Promise((r) => setTimeout(r, 500));
        const info = await page.evaluate(() => ({
            appChildren: document.getElementById('app')?.children.length ?? -1,
            text: document.body.innerText.slice(0, 120).replace(/\s+/g, ' '),
            styles: document.styleSheets.length,
        }));
        const shot = 'C:\\Users\\natin\\AppData\\Local\\Temp\\opencode\\shot-' + url.replace(/[^a-z0-9]+/gi, '_') + '.png';
        await page.screenshot({ path: shot });
        console.log(`\n== ${url}\n   status=${status} styles=${info.styles} appChildren=${info.appChildren}\n   body="${info.text}"\n   screenshot=${shot}`);
    } catch (e) {
        console.log(`\n== ${url}\n   NAV-ERROR: ${e.message.slice(0, 200)}`);
    }
    for (const m of msgs) console.log('   ' + m);
    await page.close();
}
await browser.close();
