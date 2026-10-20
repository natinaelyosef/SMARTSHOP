import { useState, type FormEvent } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Mail, ShoppingCart } from 'lucide-react';
import { Button, Field, Input, ToastProvider, useToast } from '@/components/ui';
import { motion } from '@/components/motion';
import { useTranslation } from '@/lib/i18n';
import type { SharedProps } from '@/types';

function ForgotInner({ errors }: { errors?: Record<string, string | string[]> }) {
    const { t } = useTranslation();
    const { push } = useToast();
    const { flash } = usePage<SharedProps>().props;
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const emailError = errors?.email ? String(Array.isArray(errors.email) ? errors.email[0] : errors.email) : undefined;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSending(true);
        router.post('/forgot-password', { email }, {
            onFinish: () => setSending(false),
            onError: (errs) => {
                const first = Object.values(errs)[0];
                push(Array.isArray(first) ? first[0] : String(first), 'error');
            },
            onSuccess: () => push(flash.success ?? t('auth.send_link'), 'success'),
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
            <Head title={t('auth.forgot_title')} />
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl animate-blob" />
                <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
            </div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-8 dark:bg-slate-900 animate-slide-up">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
                    <ShoppingCart size={22} />
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('auth.forgot_title')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('auth.forgot_sub')}</p>
                {flash.success && (
                    <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 animate-fade-in dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{flash.success}</p>
                )}
                <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                    <Field label={t('auth.email')} error={emailError} required>
                        <div className="relative">
                            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" autoComplete="email" placeholder="you@shop.com" />
                        </div>
                    </Field>
                    <Button type="submit" loading={sending} className="w-full py-3">
                        {sending ? t('auth.sending') : t('auth.send_link')}
                    </Button>
                </form>
                <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                    <ArrowLeft size={14} /> {t('auth.back_login')}
                </Link>
            </motion.div>
        </div>
    );
}

export default function ForgotPassword(props: { errors?: Record<string, string | string[]> }) {
    return (
        <ToastProvider>
            <ForgotInner {...props} />
        </ToastProvider>
    );
}
