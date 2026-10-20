import { useState, type FormEvent } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Lock, Mail, ShoppingCart } from 'lucide-react';
import { Button, Field, Input, ToastProvider, useToast } from '@/components/ui';
import { motion } from '@/components/motion';
import { useTranslation } from '@/lib/i18n';

interface ResetProps {
    token: string;
    email: string;
    errors?: Record<string, string | string[]>;
}

const err = (errors: ResetProps['errors'], key: string) => {
    const v = errors?.[key];
    return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
};

function ResetInner({ token, email: initialEmail, errors }: ResetProps) {
    const { t } = useTranslation();
    const { push } = useToast();
    const [email, setEmail] = useState(initialEmail ?? '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post('/reset-password', { token, email, password, password_confirmation: confirm }, {
            onFinish: () => setSubmitting(false),
            onError: (errs) => {
                const first = Object.values(errs)[0];
                push(Array.isArray(first) ? first[0] : String(first), 'error');
            },
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
                <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                    <Field label={t('auth.email')} error={err(errors, 'email')} required>
                        <div className="relative">
                            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" autoComplete="email" />
                        </div>
                    </Field>
                    <Field label={t('auth.new_password')} error={err(errors, 'password')} required>
                        <div className="relative">
                            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" autoComplete="new-password" placeholder="••••••••" />
                        </div>
                    </Field>
                    <Field label={t('users.confirm_password')} required>
                        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" placeholder="••••••••" />
                    </Field>
                    <Button type="submit" loading={submitting} className="w-full py-3">
                        {submitting ? t('auth.resetting') : t('auth.reset_done')}
                    </Button>
                </form>
                <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                    <ArrowLeft size={14} /> {t('auth.back_login')}
                </Link>
            </motion.div>
        </div>
    );
}

export default function ResetPassword(props: ResetProps) {
    return (
        <ToastProvider>
            <ResetInner {...props} />
        </ToastProvider>
    );
}
