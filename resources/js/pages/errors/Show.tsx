import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ShieldAlert, FileQuestion, Clock, ZapOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const ICONS: Record<number, typeof ShieldAlert> = {
    403: ShieldAlert,
    404: FileQuestion,
    419: Clock,
    429: ZapOff,
};

export default function ErrorPage({ status, title }: { status: number; title?: string }) {
    const { t } = useTranslation();
    const Icon = ICONS[status] ?? FileQuestion;

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <Head title={`${status} · ${title ?? ''}`} />
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 animate-scale-in">
                <Icon size={36} />
            </div>
            <p className="mt-6 text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">{status}</p>
            <h1 className="mt-2 text-xl font-bold text-slate-800">{title}</h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">
                {status === 403 ? t('error.forbidden') : status === 404 ? t('error.not_found') : t('error.generic')}
            </p>
            <Link
                href="/dashboard"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
            >
                <ArrowLeft size={16} />
                {t('nav.dashboard')}
            </Link>
        </div>
    );
}
