import { useState, type FormEvent } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft, ArrowRight, BadgeCheck, Check, Eye, EyeOff, Home, Lock, Mail,
    ScanBarcode, ShieldCheck, ShoppingCart, Sparkles, User, Wallet,
} from 'lucide-react';
import { Button, Field, Input, Checkbox, Spinner, ToastProvider, useToast } from '@/components/ui';
import { ThemeToggle } from '@/lib/theme';
import { motion } from '@/components/motion';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LoginPageProps {
    errors?: Record<string, string | string[]>;
    flash?: { success?: string | null; error?: string | null };
}

const DEMO_ACCOUNTS = [
    { email: 'admin@smartshop.et', role: 'Super Admin', color: 'bg-brand-600' },
    { email: 'manager@smartshop.et', role: 'Manager', color: 'bg-violet-600' },
    { email: 'cashier@smartshop.et', role: 'Cashier', color: 'bg-emerald-600' },
    { email: 'inventory@smartshop.et', role: 'Inventory', color: 'bg-sky-600' },
    { email: 'accountant@smartshop.et', role: 'Accountant', color: 'bg-amber-500' },
];

const HERO_IMG =
    'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1000&q=80';

function LoginInner({ errors, flash }: LoginPageProps) {
    const { t } = useTranslation();
    const { push } = useToast();
    const [email, setEmail] = useState('admin@smartshop.et');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [show, setShow] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            push('Please enter email and password.', 'error');
            return;
        }
        setSubmitting(true);
        router.post(
            '/login',
            { email, password, remember },
            {
                onFinish: () => setSubmitting(false),
                onError: (pageErrors) => {
                    const first = Object.values(pageErrors)[0];
                    push(Array.isArray(first) ? first[0] : String(first), 'error');
                },
            },
        );
    };

    const fillDemo = (demoEmail: string) => {
        setEmail(demoEmail);
        setPassword('password');
    };

    const emailError = errors?.email ? String(Array.isArray(errors.email) ? errors.email[0] : errors.email) : undefined;
    const passwordError = errors?.password
        ? String(Array.isArray(errors.password) ? errors.password[0] : errors.password)
        : undefined;

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans">
            <Head title={t('auth.login_title')} />

            {/* Background blobs + grid */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl animate-blob" />
                <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
                <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
                        backgroundSize: '44px 44px',
                        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 40%, transparent 100%)',
                    }}
                />
            </div>

            {/* Top bar with return-home */}
            <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 sm:px-6">
                <Link
                    href="/"
                    className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
                >
                    <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
                    <Home size={15} className="text-brand-400" />
                    <span className="hidden sm:inline">Back to home</span>
                    <span className="sm:hidden">Home</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-white/10 bg-white/5 p-0.5 backdrop-blur">
                        <ThemeToggle onDark />
                    </span>
                    <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur sm:inline-flex">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> EN · አማ · ETB
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur">
                        <ShieldCheck size={13} className="text-emerald-400" /> Secure login
                    </span>
                </div>
            </div>

            <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
                {/* Brand / showcase side */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden lg:block"
                >
                    <Link href="/" className="group flex w-fit items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-xl shadow-brand-500/30 transition-transform group-hover:scale-105">
                            <ShoppingCart size={24} />
                        </span>
                        <span>
                            <span className="block text-xl font-bold tracking-tight text-white">
                                Smart<span className="text-brand-400">Shop</span> Manager
                            </span>
                            <span className="block text-sm text-slate-400">Inventory · POS · Finance · Insights</span>
                        </span>
                    </Link>

                    <h1 className="mt-8 text-4xl font-bold leading-[1.1] tracking-tight text-white">
                        Run your shop with <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">confidence</span>.
                    </h1>
                    <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
                        Track stock, sell faster, watch your profit, rent and cash flow — in English and Amharic, with ETB built in.
                    </p>

                    <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                        {[
                            'Barcode POS with cash, bank, mobile & credit',
                            'Low-stock alerts, expiry batches & audit trail',
                            'True profit after rent, tax estimates & reports',
                        ].map((line) => (
                            <li key={line} className="flex items-start gap-2.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                                    <Check size={13} />
                                </span>
                                {line}
                            </li>
                        ))}
                    </ul>

                    {/* Image card with floating KPI */}
                    <div className="group relative mt-8 max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                        <img src={HERO_IMG} alt="Shop checkout" className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="eager" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                            <div>
                                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                    <ScanBarcode size={13} className="text-brand-300" /> Live POS
                                </p>
                                <p className="mt-1 text-sm font-bold text-white">Checkout in seconds</p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                                <Wallet size={13} className="text-emerald-300" /> Br 18,450 today
                            </span>
                        </div>
                        <div className="absolute right-3 top-3 animate-float rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 shadow-xl backdrop-blur">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                                <BadgeCheck size={12} className="text-emerald-400" /> Profit +18%
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Form side */}
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md justify-self-center lg:justify-self-end"
                >
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl animate-slide-up">
                        {/* Card header */}
                        <div className="relative border-b border-slate-100 bg-gradient-to-br from-brand-50 via-white to-white px-7 pb-5 pt-6 sm:px-8 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
                            <div className="flex items-center gap-3 lg:hidden">
                                <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md transition hover:scale-105" aria-label="Back to home">
                                    <ShoppingCart size={20} />
                                </Link>
                                <div>
                                    <p className="text-[15px] font-bold text-slate-900">SmartShop Manager</p>
                                    <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                                        <ArrowLeft size={12} /> Back to home
                                    </Link>
                                </div>
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
                                </span>
                            </div>
                            <div className="hidden items-center justify-between lg:flex">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-3 py-1 text-xs font-bold text-brand-700">
                                    <Sparkles size={13} /> Welcome back
                                </span>
                                <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-brand-600">
                                    <ArrowLeft size={13} /> Back to home
                                </Link>
                            </div>
                            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{t('auth.login_title')}</h2>
                            <p className="mt-1 text-sm text-slate-500">{t('auth.login_subtitle')}</p>
                        </div>

                        <form onSubmit={submit} className="space-y-4 px-7 py-6 sm:px-8" noValidate>
                            {flash?.success && (
                                <div className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" role="status">
                                    <span className="inline-flex items-center gap-2">
                                        <Check size={15} className="shrink-0" />
                                        {flash.success === 'registered' ? t('auth.account_created') : flash.success}
                                    </span>
                                </div>
                            )}

                            <Field label={t('auth.email')} error={emailError} required>
                                <div className="relative">
                                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="username"
                                        required
                                        className={cn('pl-10 transition', emailError && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20')}
                                        placeholder="you@shop.com"
                                    />
                                </div>
                            </Field>

                            <Field label={t('auth.password')} error={passwordError} required>
                                <div className="relative">
                                    <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        type={show ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyUp={(e) => {
                                            try {
                                                setCapsOn((e.nativeEvent as KeyboardEvent).getModifierState?.('CapsLock') ?? false);
                                            } catch {
                                                setCapsOn(false);
                                            }
                                        }}
                                        autoComplete="current-password"
                                        required
                                        className={cn('pl-10 pr-11 transition', passwordError && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20')}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShow((v) => !v)}
                                        aria-label={show ? 'Hide password' : 'Show password'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {capsOn && password.length > 0 && (
                                    <p className="mt-1.5 animate-fade-in rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                                        Caps Lock is on
                                    </p>
                                )}
                            </Field>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} label={t('auth.remember')} />
                                <Link href="/forgot-password" className="shrink-0 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                                    {t('auth.forgot')}
                                </Link>
                            </div>

                            <Button type="submit" loading={submitting} className="group w-full py-3 text-[15px]">
                                {submitting ? (
                                    t('auth.signing_in')
                                ) : (
                                    <span className="inline-flex items-center gap-2">
                                        {t('auth.sign_in')}
                                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                )}
                            </Button>

                            {/* Demo accounts */}
                            <div className="pt-1">
                                <div className="flex items-center gap-3">
                                    <span className="h-px flex-1 bg-slate-100" />
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                        <ShieldCheck size={12} /> 1-click demo
                                    </span>
                                    <span className="h-px flex-1 bg-slate-100" />
                                </div>
                                <div className="mt-3 grid gap-1.5">
                                    {DEMO_ACCOUNTS.map((account) => {
                                        const active = email === account.email && password === 'password';
                                        return (
                                            <button
                                                key={account.email}
                                                type="button"
                                                onClick={() => fillDemo(account.email)}
                                                className={cn(
                                                    'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-px hover:shadow-md',
                                                    active
                                                        ? 'border-brand-400 bg-brand-50 shadow-sm dark:border-brand-500 dark:bg-brand-600/15'
                                                        : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500',
                                                )}
                                            >
                                                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white', account.color)}>
                                                    {account.email.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="flex min-w-0 flex-1 items-center gap-2 font-mono text-xs font-semibold text-slate-700">
                                                    <User size={13} className="shrink-0 text-slate-400" />
                                                    <span className="truncate">{account.email}</span>
                                                </span>
                                                <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:block">
                                                    {account.role}
                                                </span>
                                                {active && <Check size={15} className="shrink-0 text-brand-600" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-slate-400">
                                {submitting && <Spinner size="sm" />}
                                Demo password: <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-600">password</span>
                            </p>
                            <p className="pt-1 text-center text-sm animate-fade-in">
                                <Link href="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
                                    {t('auth.no_account')}
                                </Link>
                            </p>
                        </form>

                        {/* Card footer with return-home */}
                        <div className="flex flex-col items-center justify-between gap-2.5 border-t border-slate-100 bg-slate-50/70 px-7 py-4 sm:flex-row sm:px-8 dark:border-slate-800 dark:bg-slate-800/50">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600"
                            >
                                <ArrowLeft size={13} /> Return to home page
                            </Link>
                            <span className="text-[11px] text-slate-400">Inventory · POS · Finance · Insights</span>
                        </div>
                    </div>

                    <p className="mt-4 text-center text-xs text-slate-500">
                        Protected by roles, audit log & backups.{' '}
                        <Link href="/" className="font-semibold text-brand-300 hover:text-brand-200 hover:underline">
                            Learn more on home →
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

export default function Login(props: LoginPageProps) {
    return (
        <ToastProvider>
            <LoginInner {...props} />
        </ToastProvider>
    );
}
