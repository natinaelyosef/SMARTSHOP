import { useState, type FormEvent } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Check, Eye, EyeOff, Lock, Mail, Phone, ShoppingCart, Sparkles, Store, User, Users } from 'lucide-react';
import { Button, Field, Input, ToastProvider, useToast } from '@/components/ui';
import { motion } from '@/components/motion';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface RegisterProps {
    hasAccounts?: boolean;
    errors?: Record<string, string | string[]>;
}

const err = (errors: RegisterProps['errors'], key: string) => {
    const v = errors?.[key];
    return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
};

function RegisterInner({ errors, hasAccounts }: RegisterProps) {
    const { t } = useTranslation();
    const { push } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [shopName, setShopName] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [teamMode, setTeamMode] = useState<'single' | 'team'>('single');
    const [show, setShow] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(
            '/register',
            {
                name, email, phone: phone || null,
                password, password_confirmation: confirm,
                team_mode: teamMode,
                ...(hasAccounts ? {} : { shop_name: shopName, shop_phone: shopPhone || null }),
            },
            {
                onFinish: () => setSubmitting(false),
                onError: (pageErrors) => {
                    const first = Object.values(pageErrors)[0];
                    push(Array.isArray(first) ? first[0] : String(first), 'error');
                },
            },
        );
    };

    const modes = [
        { key: 'single' as const, icon: <User size={17} />, title: t('team.single_t'), desc: t('team.single_d') },
        { key: 'team' as const, icon: <Users size={17} />, title: t('team.team_t'), desc: t('team.team_d') },
    ];

    const steps = [t('reg.step1'), t('reg.step2'), t('reg.step3')];

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
            <Head title={t('auth.register_title')} />
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-500/30 blur-3xl animate-blob" />
                <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
                <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-6xl">
                <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:text-white">
                    <ArrowLeft size={16} /> Back to home
                </Link>

                <div className="grid items-center gap-8 lg:grid-cols-2">
                    {/* Left: numbered 3-step timeline (distinct from login's showcase) */}
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="hidden lg:block">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
                            <ShoppingCart size={24} />
                        </span>
                        <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 align-middle">
                            <Sparkles size={13} /> {t('reg.badge')}
                        </span>
                        <h1 className="mt-6 text-3xl font-bold leading-tight text-white">
                            {t('auth.register_title')}.
                        </h1>
                        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">{t('auth.register_subtitle')}</p>

                        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-emerald-400">{t('reg.steps_t')}</p>
                        <ol className="mt-4 max-w-md space-y-5 border-l border-white/10 pl-6">
                            {steps.map((step, i) => (
                                <li key={step} className="relative">
                                    <span className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/40">
                                        {i + 1}
                                    </span>
                                    <span className="text-sm text-slate-300">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </motion.div>

                    {/* Right: form card */}
                    <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, delay: 0.1 }} className="w-full max-w-xl justify-self-center lg:justify-self-end">
                        <div className="overflow-hidden rounded-3xl border border-white/10 border-t-[3px] border-t-emerald-400 bg-white shadow-2xl animate-slide-up dark:bg-slate-900">
                            {/* Card header — emerald gradient (login uses brand) */}
                            <div className="relative border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-white px-7 pb-5 pt-6 sm:px-8 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                        <Sparkles size={13} /> {t('reg.badge')}
                                    </span>
                                    <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-emerald-600">
                                        <ArrowLeft size={13} /> Back to home
                                    </Link>
                                </div>
                                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('auth.register_title')}</h2>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('auth.register_subtitle')}</p>
                            </div>

                            <form onSubmit={submit} className="grid gap-4 px-7 py-6 sm:grid-cols-2 sm:px-8" noValidate>
                                <Field label={t('auth.full_name')} error={err(errors, 'name')} required className="sm:col-span-1">
                                    <div className="relative">
                                        <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={name} onChange={(e) => setName(e.target.value)} required className="pl-10" autoComplete="name" placeholder="Abebe Kebede" />
                                    </div>
                                </Field>
                                <Field label={t('common.phone')} error={err(errors, 'phone')} className="sm:col-span-1">
                                    <div className="relative">
                                        <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" autoComplete="tel" placeholder="09…" />
                                    </div>
                                </Field>
                                <Field label={t('auth.email')} error={err(errors, 'email')} required className="sm:col-span-2">
                                    <div className="relative">
                                        <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" autoComplete="email" placeholder="you@shop.com" />
                                    </div>
                                </Field>
                                <Field label={t('auth.password')} error={err(errors, 'password')} required className="sm:col-span-2">
                                    <div className="relative">
                                        <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-11" autoComplete="new-password" placeholder="••••••••" />
                                        <button type="button" onClick={() => setShow((v) => !v)} aria-label="Toggle password" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </Field>
                                <Field label={t('users.confirm_password')} error={err(errors, 'password')} required className="sm:col-span-2">
                                    <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="••••••••" />
                                </Field>
                                {hasAccounts ? (
                                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                                        {t('reg.existing')}
                                    </p>
                                ) : (
                                    <>
                                        <Field label={t('settings.shop_name')} error={err(errors, 'shop_name')} required className="sm:col-span-1">
                                            <div className="relative">
                                                <Store size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} required className="pl-10" placeholder="My Shop" />
                                            </div>
                                        </Field>
                                        <Field label={t('settings.phone')} error={err(errors, 'shop_phone')} className="sm:col-span-1">
                                            <div className="relative">
                                                <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} className="pl-10" placeholder="011…" />
                                            </div>
                                        </Field>
                                    </>
                                )}

                                {/* Owner mode choice: single store vs store with employees */}
                                <div className="sm:col-span-2">
                                    <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('team.title')}</p>
                                    <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label={t('team.title')}>
                                        {modes.map((m) => {
                                            const active = teamMode === m.key;
                                            return (
                                                <button
                                                    key={m.key}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={active}
                                                    onClick={() => setTeamMode(m.key)}
                                                    className={cn(
                                                        'rounded-2xl border p-3.5 text-left transition-all',
                                                        active
                                                            ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30 dark:border-emerald-400 dark:bg-emerald-500/10'
                                                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600',
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', active ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                                                            {m.icon}
                                                        </span>
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</span>
                                                        {active && <Check size={16} className="ml-auto shrink-0 text-emerald-600 dark:text-emerald-400" />}
                                                    </span>
                                                    <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{m.desc}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400">{t('reg.later')}</p>
                                </div>

                                <Button type="submit" loading={submitting} className="w-full py-3 sm:col-span-2">
                                    {submitting ? t('auth.creating') : t('auth.create_account')}
                                </Button>
                            </form>

                            {/* Card footer — mirrored with login's footer strip */}
                            <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-7 py-4 sm:flex-row sm:px-8 dark:border-slate-800 dark:bg-slate-800/50">
                                <Link href="/login" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                                    {t('auth.have_account')}
                                </Link>
                                <span className="text-[11px] text-slate-400">EN · አማ · ETB</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function Register(props: RegisterProps) {
    return (
        <ToastProvider>
            <RegisterInner {...props} />
        </ToastProvider>
    );
}
