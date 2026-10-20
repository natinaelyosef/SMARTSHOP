import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight, BadgeCheck, Banknote, BarChart3, Bell, Boxes, Check, ChevronDown, CircleDollarSign,
    Globe, Home as HomeIcon, Languages, Lock, Package, Receipt, ScanBarcode, ShieldCheck,
    ShoppingCart, Sparkles, Star, Truck, Users, Wallet, Zap,
} from 'lucide-react';
import { motion } from '@/components/motion';
import { CountUp } from '@/components/CountUp';
import { TrendAreaChart } from '@/components/Charts';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/lib/theme';
import type { SharedProps } from '@/types';

type Locale = 'en' | 'am';

const COPY: Record<Locale, Record<string, string>> = {
    en: {
        announcement: 'New: Business Insights + Amharic support — ETB built in',
        sign_in: 'Sign in',
        open_app: 'Open dashboard',
        get_started: 'Get started free',
        create_account: 'Create account',
        watch_demo: 'Try demo login',
        hero_badge: 'Inventory · POS · Finance · Insights',
        hero_title_a: 'Run your shop with',
        hero_title_b: 'confidence.',
        hero_sub: 'SmartShop Manager tracks stock, sells faster at the POS, watches profit, rent and cash flow — in English and Amharic, with ETB built in.',
        hero_note: 'No credit card · Works on phone & desktop · Backup included',
        stat_modules: 'Business modules',
        stat_lang: 'Languages (EN + አማ)',
        stat_currency: 'ETB-ready reports',
        stat_uptime: 'Alerts & insights',
        trusted: 'Everything a neighborhood shop needs — in one place',
        features_kicker: 'Why SmartShop',
        features_title: 'One system for your whole shop',
        features_sub: 'Same cards, colors and buttons you already know from the dashboard — now explained for new staff and owners.',
        showcase_kicker: 'See it in action',
        showcase_title: 'Sell. Stock. Profit. On repeat.',
        showcase_sub: 'Switch tabs to see how each part of the day looks inside SmartShop.',
        steps_kicker: 'Get going in an afternoon',
        steps_title: 'From signup to first sale in 3 steps',
        demo_kicker: 'Try it now',
        demo_title: 'One click demo accounts',
        demo_sub: 'Password for all demo accounts is',
        gallery_kicker: 'Built for real shops',
        gallery_title: 'From kiosk to mini-market',
        reviews_kicker: 'Loved by shop owners',
        reviews_title: 'Owners feel the difference in week one',
        faq_kicker: 'Questions',
        faq_title: 'Frequently asked',
        cta_title: 'Ready to run your shop with confidence?',
        cta_sub: 'Sign in with a demo account or open the live dashboard. Your stock, sales and profit are waiting.',
        footer_tag: 'Inventory · POS · Finance · Insights — made for Ethiopian shops.',
    },
    am: {
        announcement: 'አዲስ: የንግድ ግንዛቤ + የአማርኛ ድጋፍ — ብር አብሮ የተሰራ',
        sign_in: 'ግባ',
        open_app: 'ዳሽቦርድ ክፈት',
        get_started: 'በነጻ ጀምር',
        create_account: 'መለያ ፍጠር',
        watch_demo: 'ናሙና ሞክር',
        hero_badge: 'ጋዘን · የሽያጭ መስኮት · ፋይናንስ · ግንዛቤ',
        hero_title_a: 'ሱቅዎን በ',
        hero_title_b: 'ልበ ሙሉነት ያሂዱ።',
        hero_sub: 'SmartShop Manager ጋዘን ይከታተላል፣ በPOS ፈጣን ሽያጭ፣ ትርፍ፣ ኪራይ እና የገንዘብ ፍሰት — በእንግሊዝኛ እና በአማርኛ፣ በብር።',
        hero_note: 'ክሬዲት ካርድ አያስፈልግም · በስልክ እና በኮምፒውተር ይሰራል · ቤክአፕ ተካቷል',
        stat_modules: 'የንግድ ሞጁሎች',
        stat_lang: 'ቋንቋዎች (EN + አማ)',
        stat_currency: 'በብር ሪፖርቶች',
        stat_uptime: 'ማንቂያዎች እና ግንዛቤ',
        trusted: 'የሰፈር ሱቅ የሚፈልገው ሁሉ — በአንድ ቦታ',
        features_kicker: 'ለምን SmartShop',
        features_title: 'ለሱቅዎ ሁሉ አንድ ስርዓት',
        features_sub: 'በዳሽቦርድ የሚያውቋቸው ካርዶች፣ ቀለሞች እና አዝራሮች — ለአዲስ ሰራተኞች እና ባለቤቶች።',
        showcase_kicker: 'በተግባር ይመልከቱ',
        showcase_title: 'ሽጥ። ጋዘን። ትርፍ። እንደገና።',
        showcase_sub: 'የቀኑ እያንዳንዱ ክፍል በSmartShop ውስጥ እንዴት እንደሚታይ ለማየት ትሮችን ቀይር።',
        steps_kicker: 'በአንድ ከሰዓት በኋላ ይጀምሩ',
        steps_title: 'ከመመዝገብ ወደ መጀመሪያ ሽያጭ በ3 ደረጃዎች',
        demo_kicker: 'አሁን ሞክር',
        demo_title: 'ባንድ ጠቅታ የናሙና መለያዎች',
        demo_sub: 'ለሁሉም የናሙና መለያዎች የይለፍ ቃል',
        gallery_kicker: 'ለእውነተኛ ሱቆች የተሰራ',
        gallery_title: 'ከኪዮስክ እስከ ሚኒ-ማርኬት',
        reviews_kicker: 'በሱቅ ባለቤቶች የተወደደ',
        reviews_title: 'ባለቤቶች ልዩነቱን በראשኛው ሳምንት ይሰማሉ',
        faq_kicker: 'ጥያቄዎች',
        faq_title: 'ብዙ ጊዜ የሚጠየቁ',
        cta_title: 'ሱቅዎን በልበ ሙሉነት ለማሂድ ዝግጁ ነዎት?',
        cta_sub: 'በናሙና መለያ ይግቡ ወይም ቀጥታ ዳሽቦርድ ይክፈቱ። ጋዘን፣ ሽያጭ እና ትርፍዎ ይጠብቁዎታል።',
        footer_tag: 'ጋዘን · POS · ፋይናንስ · ግንዛቤ — ለኢትዮጵያ ሱቆች የተሰራ።',
    },
};

const MODULES = [
    { icon: <ScanBarcode size={20} />, tint: 'bg-brand-50 text-brand-600', href: '/pos', en: 'Point of Sale', am: 'የሽያጭ መስኮት', desc_en: 'Barcode scan, cart, cash / bank / mobile / credit, receipts.', desc_am: 'ባርኮድ፣ ጋሪ፣ ጥሬ/ባንክ/ሞባይል/ብድር፣ ደረሰኝ።' },
    { icon: <Package size={20} />, tint: 'bg-violet-50 text-violet-600', href: '/products', en: 'Products & variants', am: 'ምርቶች', desc_en: 'SKU, barcode, price history, margins, expiry batches.', desc_am: 'SKU፣ ባርኮድ፣ የዋጋ ታሪክ፣ ትርፍ፣ የጊዜ ማብቂያ።' },
    { icon: <Boxes size={20} />, tint: 'bg-sky-50 text-sky-600', href: '/inventory/stock', en: 'Stock levels', am: 'የጋዘን መጠን', desc_en: 'Low / out alerts, adjustments, damage & expiry.', desc_am: 'ዝቅተኛ/ያለቀ ማንቂያ፣ ማስተካከያ፣ ጉዳት።' },
    { icon: <Truck size={20} />, tint: 'bg-orange-50 text-orange-600', href: '/purchases', en: 'Purchases', am: 'ግዢዎች', desc_en: 'Suppliers, invoices, receive stock, pay balances.', desc_am: 'አቅራቢዎች፣ ደረሰኞች፣ ጋዘን መቀበያ፣ ክፍያ።' },
    { icon: <Users size={20} />, tint: 'bg-teal-50 text-teal-600', href: '/customers', en: 'Customers & credit', am: 'ደንበኞች እና ብድር', desc_en: 'Debtors, balances, payment history in one click.', desc_am: 'ዕዳኞች፣ ቀሪ ሒሳብ፣ የክፍያ ታሪክ።' },
    { icon: <CircleDollarSign size={20} />, tint: 'bg-emerald-50 text-emerald-600', href: '/finance', en: 'Profit & cash flow', am: 'ትርፍ እና የገንዘብ ፍሰት', desc_en: 'Gross profit, rent split, cash in vs cash out.', desc_am: 'ጠቅላላ ትርፍ፣ ኪራይ፣ ገቢ مقابل ወጪ።' },
    { icon: <HomeIcon size={20} />, tint: 'bg-amber-50 text-amber-600', href: '/rent', en: 'Rent contracts', am: 'የኪራይ ውሎች', desc_en: 'Monthly dues, overdue flags, payment schedule.', desc_am: 'ወርኃዊ ክፍያ፣ የዘገየ ማ flag፣ መርሃ ግብር።' },
    { icon: <BarChart3 size={20} />, tint: 'bg-indigo-50 text-indigo-600', href: '/reports', en: 'Reports & export', am: 'ሪፖርቶች', desc_en: 'Daily / monthly / yearly CSV for sales & stock.', desc_am: 'ዕለታዊ/ወርኃዊ/ዓመታዊ CSV ሪፖርት።' },
    { icon: <Sparkles size={20} />, tint: 'bg-pink-50 text-pink-600', href: '/insights', en: 'AI Insights', am: 'የንግድ ግንዛቤ', desc_en: 'Ask questions, spot losing products early.', desc_am: 'ጥያቄዎች ይጠይቁ፣ አሳች ምርቶችን ይለዩ።' },
];

const IMAGES = {
    hero: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=80',
    pos: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
    stock: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
    shelves: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=900&q=80',
    owner: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80',
};

const DEMO = [
    { email: 'admin@smartshop.et', role: 'Super Admin' },
    { email: 'manager@smartshop.et', role: 'Manager' },
    { email: 'cashier@smartshop.et', role: 'Cashier' },
    { email: 'inventory@smartshop.et', role: 'Inventory' },
];

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export default function Home() {
    const { shop, locale } = usePage<SharedProps>().props;
    const [lang, setLang] = useState<Locale>(locale === 'am' ? 'am' : 'en');
    const [tab, setTab] = useState<'pos' | 'stock' | 'profit'>('pos');
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [mobile, setMobile] = useState(false);
    const t = (k: string) => COPY[lang][k] ?? k;
    const shopName = shop.name || 'SmartShop Manager';
    const symbol = shop.currency_symbol || 'Br';
    const startHref = '/register';
    const mobileLinks: [string, string][] = [
        ['#features', 'Features'],
        ['#modules', 'Modules'],
        ['#how', 'How it works'],
        ['#demo', 'Demo'],
        ['#faq', 'FAQ'],
        ['/login', `${t('sign_in')} →`],
        ['/register', `${t('create_account')} →`],
    ];

    const chartSample = [
        { label: 'Mon', sales: 8200, profit: 2100 },
        { label: 'Tue', sales: 12400, profit: 3400 },
        { label: 'Wed', sales: 9800, profit: 2600 },
        { label: 'Thu', sales: 15200, profit: 4300 },
        { label: 'Fri', sales: 18900, profit: 5600 },
        { label: 'Sat', sales: 23400, profit: 7100 },
        { label: 'Sun', sales: 17100, profit: 4900 },
    ];

    const tabs = {
        pos: {
            image: IMAGES.pos,
            badge: lang === 'am' ? 'ፈጣን ሽያጭ' : 'Fast checkout',
            title: lang === 'am' ? 'በሰከንዶች ውስጥ ሽያጭ' : 'Checkout in seconds',
            points: lang === 'am'
                ? ['ባርኮድ ስካን እና ብልጥ ፍለጋ', 'ጥሬ / ባንክ / ሞባይል / ብድር', 'አውቶማቲክ ደረሰኝ እና ቀሪ ስሌት']
                : ['Barcode scan + smart search', 'Cash / bank / mobile / credit', 'Auto receipt + change math'],
        },
        stock: {
            image: IMAGES.stock,
            badge: lang === 'am' ? 'ብልጥ ጋዘን' : 'Smart stock',
            title: lang === 'am' ? 'ዝቅተኛ ጋዘንን አያምልጥ' : 'Never miss low stock',
            points: lang === 'am'
                ? ['ዝቅተኛ እና ያለቀ ማንቂያዎች', 'የጉዳት እና የጊዜ ማብቂያ ክትትል', 'የመግቢያ እና የሽያጭ ታሪክ']
                : ['Low & out alerts', 'Damage & expiry tracking', 'Full movement history'],
        },
        profit: {
            image: IMAGES.shelves,
            badge: lang === 'am' ? 'እውነተኛ ትርፍ' : 'True profit',
            title: lang === 'am' ? 'ትርፍዎን ከኪራይ በኋላ ይወቁ' : 'Know profit after rent',
            points: lang === 'am'
                ? ['ጠቅላላ ትርፍ እና ወጪ መከፋፈል', 'የኪራይ እና የታክስ ግምት', 'ወርኃዊ የትርፍ አዝማሚያ']
                : ['Gross profit + expense split', 'Rent & tax estimates', 'Monthly profit trend'],
        },
    } as const;

    const faqs = lang === 'am' ? [
        { q: 'SmartShop Manager ለየትኛው ሱቅ ነው?', a: 'ለኪዮስክ፣ ሱፐር፣ ሚኒ-ማርኬት፣ ሱቅ እና መጋዘን — ምርቶች፣ ጋዘን፣ ሽያጭ እና ፋይናንስ የሚከታተሉ ሁሉ።' },
        { q: 'አማርኛ ይደግፋል?', a: 'አዎ። EN / አማ በአንድ ጠቅታ ይቀያይራል፣ ምንዛሬ ብር (Br) አብሮ የተሰራ ነው።' },
        { q: 'ባርኮድ ስካነር ያስፈልገኛል?', a: 'አይ። በቁልፍ ሰሌዳ መፈለግ ይችላሉ፣ ስካነር ካለ በፍጥነት ይሰራል።' },
        { q: 'መረጃዬ ደህንነቱ የተጠበቀ ነው?', a: 'አዎ — የሚና ፈቃዶች፣ የኦዲት ታሪክ እና የቤክአፕ/መመለስ አብሮ የተካተተ ነው።' },
        { q: 'እንዴት እጀምራለሁ?', a: 'ከታች ካለው ናሙና መለያ ይግቡ ወይም ዳሽቦርድ ይክፈቱ፣ ምርት ይጨምሩ እና የመጀመሪያ ሽያጭ ያድርጉ።' },
    ] : [
        { q: 'Who is SmartShop Manager for?', a: 'Kiosks, supers, mini-markets, shops and warehouses — anyone tracking products, stock, sales and money.' },
        { q: 'Does it support Amharic?', a: 'Yes. EN / አማ switches in one click and the currency is ETB (Br) by default.' },
        { q: 'Do I need a barcode scanner?', a: 'No. Type to search and sell; a scanner just makes it even faster.' },
        { q: 'Is my data safe?', a: 'Yes — role permissions, audit history and backup / restore are built in.' },
        { q: 'How do I start?', a: 'Sign in with a demo account below or open the dashboard, add a product and make your first sale.' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-200">
            <Head title={`${shopName} — Home`} />

            {/* Announcement */}
            <div className="bg-brand-600 px-4 py-2 text-center text-xs font-semibold text-white sm:text-[13px]">
                <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5">
                    <Sparkles size={12} /> NEW
                </span>
                {t('announcement')}
            </div>

            {/* Navbar */}
            <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
                <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-transform hover:scale-105">
                            <ShoppingCart size={18} />
                        </span>
                        <span className="text-[15px] font-bold tracking-tight text-slate-900">
                            Smart<span className="text-brand-600">Shop</span>
                        </span>
                    </Link>
                    <nav className="ml-8 hidden items-center gap-1 text-sm font-medium text-slate-600 lg:flex">
                        {[['#features', lang === 'am' ? 'ባህሪያት' : 'Features'], ['#modules', lang === 'am' ? 'ሞጁሎች' : 'Modules'], ['#how', lang === 'am' ? 'እንዴት ይሰራል' : 'How it works'], ['#demo', 'Demo'], ['#faq', 'FAQ']].map(([href, label]) => (
                            <a key={href} href={href} className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900">{label}</a>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                            <button type="button" onClick={() => setLang('en')} className={cn('rounded-lg px-2.5 py-1.5 transition', lang === 'en' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500')}>EN</button>
                            <button type="button" onClick={() => setLang('am')} className={cn('rounded-lg px-2.5 py-1.5 transition', lang === 'am' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500')}>አማ</button>
                        </div>
                        <ThemeToggle />
                        <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:block dark:text-slate-300 dark:hover:bg-slate-800">{t('sign_in')}</Link>
                        <Link href="/register" className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.98] sm:inline-flex">
                            {t('create_account')} <ArrowRight size={15} />
                        </Link>
                        <button type="button" onClick={() => setMobile(v => !v)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Menu">
                            <ChevronDown size={18} className={cn('transition-transform', mobile && 'rotate-180')} />
                        </button>
                    </div>
                </div>
                {mobile && (
                    <nav className="border-t border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-600 lg:hidden animate-fade-in">
                        {mobileLinks.map(([href, label]) => (
                            <a key={href} href={href} onClick={() => setMobile(false)} className="block rounded-lg px-3 py-2.5 transition hover:bg-slate-50">{label}</a>
                        ))}
                    </nav>
                )}
            </header>

            {/* HERO */}
            <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl animate-blob" />
                    <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
                    <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
                </div>

                <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-20">
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 animate-fade-in">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> {t('hero_badge')}
                        </span>
                        <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                            {t('hero_title_a')} <span className="bg-gradient-to-r from-brand-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">{t('hero_title_b')}</span>
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">{t('hero_sub')}</p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <Link href={startHref} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl active:scale-[0.98]">
                                <Zap size={16} /> {t('get_started')}
                            </Link>
                            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-md active:scale-[0.98]">
                                <ArrowRight size={16} /> {t('sign_in')}
                            </Link>
                        </div>
                        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                            <ShieldCheck size={14} className="text-emerald-500" /> {t('hero_note')}
                        </p>

                        {/* Mini stats with CountUp */}
                        <div className="mt-8 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { v: 9, suffix: '', label: t('stat_modules') },
                                { v: 2, suffix: '', label: t('stat_lang') },
                                { v: 100, suffix: '%', label: t('stat_currency') },
                                { v: 24, suffix: '/7', label: t('stat_uptime') },
                            ].map((s) => (
                                <div key={s.label} className="card p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                    <p className="text-xl font-bold tabular-nums text-slate-900"><CountUp value={s.v} />{s.suffix}</p>
                                    <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Hero visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="relative"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                            <img src={IMAGES.hero} alt="Shop checkout" className="h-64 w-full object-cover sm:h-80" loading="eager" />
                            <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 bg-gradient-to-b from-slate-900/50 to-transparent px-4 pb-8 pt-3">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                <span className="ml-2 rounded-md bg-white/20 px-2 py-0.5 font-mono text-[11px] text-white backdrop-blur">{shopName} · POS</span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{lang === 'am' ? 'የዛሬ ሽያጭ' : "Today's sales"}</p>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><TrendingUpDot /> +18%</span>
                                </div>
                                <TrendAreaChart data={chartSample} dataKey="sales" symbol={symbol} height={170} />
                                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                    {[['Cash', `${symbol} 24.5k`], ['Bank', `${symbol} 12.1k`], ['Credit', `${symbol} 3.2k`]].map(([k, v]) => (
                                        <div key={k} className="rounded-xl bg-slate-50 px-2 py-2.5">
                                            <p className="text-[11px] font-medium text-slate-400">{k}</p>
                                            <p className="text-sm font-bold tabular-nums text-slate-800">{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Floating cards */}
                        <div className="absolute -left-3 top-16 hidden animate-float rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur sm:block lg:-left-8 dark:border-slate-700 dark:bg-slate-900/95">
                            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Wallet size={14} className="text-emerald-500" /> {lang === 'am' ? 'የዛሬ ትርፍ' : "Today's profit"}</p>
                            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{symbol} <CountUp value={18450} /></p>
                        </div>
                        <div className="absolute -right-3 bottom-24 hidden animate-float rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur sm:block lg:-right-6 dark:border-slate-700 dark:bg-slate-900/95" style={{ animationDelay: '1.4s' }}>
                            <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Bell size={14} className="text-amber-500" /> {lang === 'am' ? 'ዝቅተኛ ጋዘን' : 'Low stock'}</p>
                            <p className="mt-1 text-lg font-bold tabular-nums text-amber-600"><CountUp value={7} /> <span className="text-xs font-medium text-slate-400">items</span></p>
                        </div>
                    </motion.div>
                </div>

                {/* Marquee strip */}
                <div className="relative border-y border-slate-200/80 bg-white/70 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="flex gap-3 overflow-hidden">
                        <div className="flex min-w-full shrink-0 animate-marquee items-center gap-3 pr-3">
                            {[...MODULES, ...MODULES].map((m, i) => (
                                <span key={i} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', m.tint)}>{m.icon}</span>
                                    {lang === 'am' ? m.am : m.en}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUSTED */}
            <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
                <Reveal><p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">{t('trusted')}</p></Reveal>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { icon: <Languages size={18} />, title: 'EN + አማ', sub: 'One-click switch' },
                        { icon: <Banknote size={18} />, title: `ETB (${symbol})`, sub: 'Built-in currency' },
                        { icon: <ShieldCheck size={18} />, title: 'Roles & audit', sub: 'Who did what' },
                        { icon: <Globe size={18} />, title: 'Phone + desktop', sub: 'Responsive UI' },
                    ].map((f, i) => (
                        <Reveal key={f.title} delay={i * 0.06}>
                            <div className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{f.icon}</span>
                                <span><span className="block text-sm font-bold text-slate-900">{f.title}</span><span className="block text-xs text-slate-500">{f.sub}</span></span>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
                <Reveal className="max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t('features_kicker')}</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('features_title')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">{t('features_sub')}</p>
                </Reveal>
                <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { icon: <ScanBarcode size={20} />, tint: 'bg-brand-50 text-brand-600', title: lang === 'am' ? 'ፈጣን POS' : 'Blazing-fast POS', desc: lang === 'am' ? 'ባርኮድ፣ ቅናሽ፣ ብድር እና ደረሰኝ — ሰልፉ አይቆምም።' : 'Barcode, discounts, credit and receipts — the queue never stops.' },
                        { icon: <Boxes size={20} />, tint: 'bg-sky-50 text-sky-600', title: lang === 'am' ? 'የጋዘን ቁጥጥር' : 'Stock control', desc: lang === 'am' ? 'ዝቅተኛ/ያለቀ ማንቂያ፣ ማስተካከያ እና የጊዜ ማብቂያ።' : 'Low/out alerts, adjustments and expiry batches.' },
                        { icon: <CircleDollarSign size={20} />, tint: 'bg-emerald-50 text-emerald-600', title: lang === 'am' ? 'ትርፍ ከኪራይ በኋላ' : 'Profit after rent', desc: lang === 'am' ? 'COGS፣ ወጪ፣ ኪራይ እና ታክስ — እውነተኛ ትርፍ።' : 'COGS, expenses, rent and tax — true net profit.' },
                        { icon: <Users size={20} />, tint: 'bg-teal-50 text-teal-600', title: lang === 'am' ? 'ደንበኞች እና ዕዳ' : 'Customers & debt', desc: lang === 'am' ? 'ዕዳኞች፣ ቀሪ ሒሳብ እና የክፍያ ታሪክ።' : 'Debtors, balances and full payment history.' },
                        { icon: <Truck size={20} />, tint: 'bg-orange-50 text-orange-600', title: lang === 'am' ? 'ግዢ እና አቅራቢዎች' : 'Purchases & suppliers', desc: lang === 'am' ? 'ደረሰኝ፣ ጋዘን መቀበያ እና የአቅራቢ ክፍያ።' : 'Invoices, stock receiving and supplier payments.' },
                        { icon: <Sparkles size={20} />, tint: 'bg-pink-50 text-pink-600', title: lang === 'am' ? 'የንግድ ግንዛቤ' : 'Business insights', desc: lang === 'am' ? 'አሳች ምርቶችን ቀድሞ ይለዩ፣ ጥያቄዎችን ይጠይቁ።' : 'Spot losing products early, ask anything.' },
                    ].map((f, i) => (
                        <Reveal key={f.title} delay={(i % 3) * 0.07}>
                            <div className="card group h-full p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                                <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110', f.tint)}>{f.icon}</span>
                                <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">Learn more <ArrowRight size={12} /></span>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* SHOWCASE TABS with images */}
            <section id="modules" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t('showcase_kicker')}</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('showcase_title')}</h2>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">{t('showcase_sub')}</p>
                </Reveal>
                <Reveal delay={0.1}>
                    <div className="mx-auto mt-6 flex w-fit gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 no-scrollbar">
                        {(['pos', 'stock', 'profit'] as const).map((k) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setTab(k)}
                                className={cn('whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all', tab === k ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200')}
                            >
                                {k === 'pos' ? (lang === 'am' ? 'ሽያጭ' : 'Sell') : k === 'stock' ? (lang === 'am' ? 'ጋዘን' : 'Stock') : (lang === 'am' ? 'ትርፍ' : 'Profit')}
                            </button>
                        ))}
                    </div>
                </Reveal>
                <Reveal delay={0.15}>
                    <div className="card mt-6 grid overflow-hidden p-0 lg:grid-cols-2">
                        <div className="group relative min-h-64 overflow-hidden">
                            <img key={tabs[tab].image} src={tabs[tab].image} alt={tabs[tab].title} className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105 lg:h-full lg:min-h-[380px] animate-fade-in" loading="lazy" />
                            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                                <BadgeCheck size={13} className="text-emerald-400" /> {tabs[tab].badge}
                            </span>
                        </div>
                        <div className="p-6 sm:p-8">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{tabs[tab].title}</h3>
                            <ul className="mt-4 space-y-3">
                                {tabs[tab].points.map((p) => (
                                    <li key={p} className="flex items-start gap-3 text-sm text-slate-600">
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14} /></span>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 grid grid-cols-3 gap-2">
                                {MODULES.slice(0, 3).map((m) => (
                                    <Link key={m.href} href={m.href} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-md">
                                        <span className={cn('mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg', m.tint)}>{m.icon}</span>
                                        {lang === 'am' ? m.am : m.en}
                                    </Link>
                                ))}
                            </div>
                            <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]">
                                {t('open_app')} <ArrowRight size={15} />
                            </Link>
                        </div>
                    </div>
                </Reveal>

                {/* Module grid linking to real routes */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {MODULES.map((m, i) => (
                        <Reveal key={m.href + m.en} delay={(i % 3) * 0.05}>
                            <Link href={m.href} className="card group flex items-start gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110', m.tint)}>{m.icon}</span>
                                <span className="min-w-0">
                                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">{lang === 'am' ? m.am : m.en} <ArrowRight size={13} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" /></span>
                                    <span className="mt-0.5 block truncate text-xs text-slate-500">{lang === 'am' ? m.desc_am : m.desc_en}</span>
                                </span>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* GALLERY */}
            <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
                <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t('gallery_kicker')}</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('gallery_title')}</h2>
                    </div>
                    <Link href="/products" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Browse products <ArrowRight size={14} /></Link>
                </Reveal>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        { src: IMAGES.shelves, tag: lang === 'am' ? 'መደርደሪያ' : 'Shelves', title: lang === 'am' ? 'ምድብ + ዋጋ' : 'Categories + prices' },
                        { src: IMAGES.stock, tag: lang === 'am' ? 'መጋዘን' : 'Warehouse', title: lang === 'am' ? 'ባች እና የጊዜ ማብቂያ' : 'Batches & expiry' },
                        { src: IMAGES.owner, tag: lang === 'am' ? 'ባለቤት' : 'Owner', title: lang === 'am' ? 'ዕለታዊ ትርፍ' : 'Daily profit' },
                    ].map((g, i) => (
                        <Reveal key={g.src} delay={i * 0.08}>
                            <figure className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                                <img src={g.src} alt={g.title} className="h-60 w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent opacity-80 transition group-hover:opacity-95" />
                                <figcaption className="absolute inset-x-0 bottom-0 p-4">
                                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">{g.tag}</span>
                                    <p className="mt-1.5 text-sm font-bold text-white">{g.title}</p>
                                </figcaption>
                            </figure>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* STEPS */}
            <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t('steps_kicker')}</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('steps_title')}</h2>
                </Reveal>
                <div className="mt-7 grid gap-4 md:grid-cols-3">
                    {[
                        { n: '01', icon: <Package size={20} />, title: lang === 'am' ? 'ሱቅ እና ምርቶች' : 'Shop + products', desc: lang === 'am' ? 'ስም፣ ምንዛሬ፣ ምድብ እና የመጀመሪያ ምርት።' : 'Name, currency, categories and first product.' },
                        { n: '02', icon: <Truck size={20} />, title: lang === 'am' ? 'ጋዘን ተቀበል' : 'Receive stock', desc: lang === 'am' ? 'በግዢ ጋዘን ይቀበሉ፣ ዝቅተኛ መጠን ያዘጋጁ።' : 'Receive via purchase, set min-stock levels.' },
                        { n: '03', icon: <ScanBarcode size={20} />, title: lang === 'am' ? 'ሽጥ እና ትርፍ' : 'Sell + profit', desc: lang === 'am' ? 'በPOS ይሽጡ፣ ትርፍ እና ደረሰኝ በራስ-ሰር።' : 'Sell on POS, profit + receipt automatic.' },
                    ].map((s, i) => (
                        <Reveal key={s.n} delay={i * 0.08}>
                            <div className="card group relative h-full overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                                <span className="pointer-events-none absolute -right-2 -top-4 text-7xl font-bold text-slate-100 transition group-hover:text-brand-50 dark:text-slate-800 dark:group-hover:text-slate-700">{s.n}</span>
                                <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/25 transition-transform group-hover:scale-110 group-hover:rotate-3">{s.icon}</span>
                                <h3 className="relative mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                                <p className="relative mt-1.5 text-sm text-slate-500">{s.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* DEMO */}
            <section id="demo" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
                <div className="card overflow-hidden p-0">
                    <div className="grid lg:grid-cols-2">
                        <div className="relative flex flex-col justify-center bg-slate-950 p-7 sm:p-10">
                            <div className="pointer-events-none absolute inset-0" aria-hidden>
                                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-600/30 blur-3xl animate-blob" />
                                <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
                            </div>
                            <div className="relative">
                                <p className="text-xs font-bold uppercase tracking-widest text-brand-400">{t('demo_kicker')}</p>
                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('demo_title')}</h2>
                                <p className="mt-2 text-sm text-slate-400">{t('demo_sub')} <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono font-semibold text-white">password</span></p>
                                <div className="mt-6 flex flex-wrap gap-2.5">
                                    <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:-translate-y-0.5 hover:bg-brand-500 active:scale-[0.98]">
                                        <Lock size={15} /> {t('sign_in')}
                                    </Link>
                                    <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.98]">
                                        {t('open_app')} <ArrowRight size={15} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2.5 bg-white p-5 sm:p-7">
                            {DEMO.map((d, i) => (
                                <motion.div key={d.email} initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.45 }}>
                                    <Link href="/login" className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                                        <span className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-bold text-brand-700">{d.email.charAt(0).toUpperCase()}</span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-mono text-[13px] font-semibold text-slate-800">{d.email}</span>
                                                <span className="block text-[11px] uppercase tracking-wide text-slate-400">{d.role}</span>
                                            </span>
                                        </span>
                                        <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
                                    </Link>
                                </motion.div>
                            ))}
                            <p className="flex items-center gap-1.5 px-1 pt-1 text-xs text-slate-400"><Receipt size={13} /> {lang === 'am' ? 'ሁሉም ፈቃዶች በተለያዩ ሚናዎች ይሞከራሉ።' : 'Each role shows different permissions inside.'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* REVIEWS */}
            <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
                <Reveal className="mx-auto max-w-2xl text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t('reviews_kicker')}</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('reviews_title')}</h2>
                </Reveal>
                <div className="mt-7 grid gap-4 md:grid-cols-3">
                    {[
                        { name: 'Hanna G.', shop: lang === 'am' ? 'ሚኒ-ማርኬት · አዲስ አበባ' : 'Mini-market · Addis Ababa', color: 'bg-brand-600', text: lang === 'am' ? 'ዝቅተኛ ጋዘን ከማለቁ በፊት እናውቃለን። ብድር መከታተል በጣም ቀላል ሆኗል።' : 'We know low stock before it runs out. Tracking credit became effortless.' },
                        { name: 'Dawit T.', shop: lang === 'am' ? 'ሱፐር · ሐዋሳ' : 'Super · Hawassa', color: 'bg-emerald-600', text: lang === 'am' ? 'POS በጣም ፈጣን ነው። ደረሰኝ እና ቀሪ ስሌት ስህተትን አስወግዷል።' : 'POS is so fast. Receipts and change math removed errors.' },
                        { name: 'Meron A.', shop: lang === 'am' ? 'ኪዮስክ · አዳማ' : 'Kiosk · Adama', color: 'bg-amber-500', text: lang === 'am' ? 'ከኪራይ በኋላ ያለውን ትርፍ ለመጀመሪያ ጊዜ በትክክል አይቻለሁ።' : 'For the first time I see true profit after rent, clearly.' },
                    ].map((r, i) => (
                        <Reveal key={r.name} delay={i * 0.08}>
                            <figure className="card h-full p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
                                <div className="flex gap-0.5 text-amber-400" aria-label="5 stars">
                                    {Array.from({ length: 5 }).map((_, s) => (<Star key={s} size={15} fill="currentColor" />))}
                                </div>
                                <blockquote className="mt-3 text-sm leading-relaxed text-slate-600">“{r.text}”</blockquote>
                                <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white', r.color)}>{r.name.charAt(0)}</span>
                                    <span><span className="block text-sm font-bold text-slate-900">{r.name}</span><span className="block text-xs text-slate-500">{r.shop}</span></span>
                                </figcaption>
                            </figure>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pt-16 sm:px-6">
                <Reveal className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t('faq_kicker')}</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('faq_title')}</h2>
                </Reveal>
                <div className="mt-6 space-y-2.5">
                    {faqs.map((f, i) => {
                        const open = openFaq === i;
                        return (
                            <Reveal key={f.q} delay={i * 0.04}>
                                <div className={cn('card overflow-hidden p-0 transition-all', open && 'border-brand-300 shadow-md')}>
                                    <button type="button" onClick={() => setOpenFaq(open ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold text-slate-900">
                                        {f.q}
                                        <ChevronDown size={17} className={cn('shrink-0 text-slate-400 transition-transform duration-300', open && 'rotate-180 text-brand-600')} />
                                    </button>
                                    <div className={cn('grid transition-all duration-300', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                                        <div className="overflow-hidden"><p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{f.a}</p></div>
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
                <Reveal>
                    <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center sm:px-12">
                        <div className="pointer-events-none absolute inset-0" aria-hidden>
                            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl animate-blob" />
                            <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
                            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
                        </div>
                        <div className="relative mx-auto max-w-2xl">
                            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-xl shadow-brand-500/30 animate-float"><ShoppingCart size={26} /></span>
                            <h2 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-4xl">{t('cta_title')}</h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">{t('cta_sub')}</p>
                            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                                <Link href={startHref} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-brand-600/30 transition-all hover:-translate-y-0.5 hover:bg-brand-500 active:scale-[0.98]">
                                    <Zap size={16} /> {t('get_started')}
                                </Link>
                                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.98]">
                                    {t('open_app')} <ArrowRight size={15} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* Footer */}
            <footer className="mt-14 border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
                    <div>
                        <span className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30"><ShoppingCart size={18} /></span>
                            <span className="text-[15px] font-bold text-slate-900">Smart<span className="text-brand-600">Shop</span></span>
                        </span>
                        <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">{t('footer_tag')}</p>
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"><Globe size={12} /> EN · አማ · {symbol}</p>
                    </div>
                    <nav aria-label="Shop">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Shop</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {[['/dashboard', 'Dashboard'], ['/pos', 'Point of Sale'], ['/products', 'Products'], ['/inventory/stock', 'Stock levels']].map(([href, label]) => (
                                <li key={href}><Link href={href} className="transition hover:text-brand-600">{label}</Link></li>
                            ))}
                        </ul>
                    </nav>
                    <nav aria-label="Money">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Money</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {[['/finance', 'Finance'], ['/expenses', 'Expenses'], ['/rent', 'Rent'], ['/tax', 'Tax'], ['/reports', 'Reports']].map(([href, label]) => (
                                <li key={href}><Link href={href} className="transition hover:text-brand-600">{label}</Link></li>
                            ))}
                        </ul>
                    </nav>
                    <nav aria-label="Account">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Account</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {[['/login', 'Sign in'], ['/insights', 'Insights'], ['/notifications', 'Notifications'], ['/settings', 'Settings']].map(([href, label]) => (
                                <li key={href}><Link href={href} className="transition hover:text-brand-600">{label}</Link></li>
                            ))}
                        </ul>
                    </nav>
                </div>
                <div className="border-t border-slate-100">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:px-6">
                        <span>© 2026 {shopName}. All rights reserved.</span>
                        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-500" /> Roles · Audit · Backup built in</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function TrendingUpDot() {
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />;
}

// Public page: render without the authenticated AppLayout sidebar.
(Home as unknown as { layout: (page: React.ReactNode) => React.ReactNode }).layout = (page: React.ReactNode) => <>{page}</>;
