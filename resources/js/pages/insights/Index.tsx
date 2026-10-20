import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { usePage } from '@inertiajs/react';
import { AlertTriangle, Check, Info, Send, Sparkles, X } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageHeader, Spinner, Textarea, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { SharedProps } from '@/types';

type InsightLevel = 'success' | 'warning' | 'danger' | 'info';

interface Insight {
    type: string;
    level: InsightLevel;
    title: string;
    message: string;
    metric: number | string;
}

interface Metrics {
    month_sales: number;
    month_profit: number;
    month_margin: number;
    symbol: string;
}

interface ServerMessage {
    role: string;
    text: string;
}

interface InsightsProps {
    insights: Insight[];
    metrics: Metrics;
    suggestedQuestions: string[];
    messages: ServerMessage[];
}

interface ChatMessage {
    role: 'you' | 'assistant';
    text: string;
}

interface AskResponse {
    answer?: string;
    message?: string;
    errors?: Record<string, string[]>;
}

const MONEY_TYPES = ['receivable', 'payable', 'expense_focus'];

const LEVELS: { key: InsightLevel; icon: React.ReactNode; card: string; iconBg: string }[] = [
    { key: 'success', icon: <Check size={18} />, card: 'border-emerald-200 bg-emerald-50/60', iconBg: 'bg-emerald-100 text-emerald-600' },
    { key: 'warning', icon: <AlertTriangle size={18} />, card: 'border-amber-200 bg-amber-50/60', iconBg: 'bg-amber-100 text-amber-600' },
    { key: 'danger', icon: <X size={18} />, card: 'border-rose-200 bg-rose-50/60', iconBg: 'bg-rose-100 text-rose-600' },
    { key: 'info', icon: <Info size={18} />, card: 'border-sky-200 bg-sky-50/60', iconBg: 'bg-sky-100 text-sky-600' },
];

function readXsrfToken(): string {
    const row = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));
    if (!row) return '';
    return decodeURIComponent(row.slice('XSRF-TOKEN='.length));
}

export default function InsightsIndex({ insights, metrics, suggestedQuestions, messages }: InsightsProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = metrics.symbol || shop.currency_symbol;

    const [chat, setChat] = useState<ChatMessage[]>(() => messages.map((m) => ({ role: m.role === 'you' ? 'you' : 'assistant', text: m.text })));
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);

    const ask = async (raw: string) => {
        const text = raw.trim();
        if (!text || loading) return;

        setChat((prev) => [...prev, { role: 'you', text }]);
        setQuestion('');
        setLoading(true);

        try {
            const res = await fetch('/insights/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify({ question: text }),
            });

            const data = (await res.json().catch(() => ({}))) as AskResponse;

            if (res.status === 422) {
                const message = data.errors?.question?.[0] ?? data.message ?? t('flash.error');
                setChat((prev) => [...prev, { role: 'assistant', text: message }]);
                return;
            }

            if (!res.ok) {
                setChat((prev) => [...prev, { role: 'assistant', text: data.message ?? t('flash.error') }]);
                return;
            }

            setChat((prev) => [...prev, { role: 'assistant', text: data.answer ?? '' }]);
        } catch {
            setChat((prev) => [...prev, { role: 'assistant', text: t('flash.error') }]);
        } finally {
            setLoading(false);
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        void ask(question);
    };

    const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void ask(question);
        }
    };

    const renderMetric = (insight: Insight) =>
        MONEY_TYPES.includes(insight.type) ? formatMoney(Number(insight.metric), symbol) : String(insight.metric);

    const statCards = [
        { key: 'sales', label: t('insights.month_sales'), value: formatMoney(metrics.month_sales, symbol) },
        { key: 'profit', label: t('insights.month_profit'), value: formatMoney(metrics.month_profit, symbol) },
        { key: 'margin', label: t('insights.margin'), value: `${formatNumber(metrics.month_margin)}%` },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title={t('insights.title')} subtitle={t('nav.insights')} />

            <div className="grid gap-3 sm:grid-cols-3">
                {statCards.map((card) => (
                    <div key={card.key} className="card p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{card.value}</p>
                    </div>
                ))}
            </div>

            {insights.length === 0 ? (
                <EmptyState title={t('insights.no_insights')} />
            ) : (
                <div className="space-y-5">
                    {LEVELS.map((level) => {
                        const items = insights.filter((insight) => insight.level === level.key);
                        if (items.length === 0) return null;

                        return (
                            <div key={level.key} className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    {t(`insights.level.${level.key}`)}
                                </p>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {items.map((insight, index) => (
                                        <div
                                            key={`${insight.title}-${index}`}
                                            className={cn('flex items-start gap-3 rounded-2xl border p-4 animate-slide-up', level.card)}
                                        >
                                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', level.iconBg)}>
                                                {level.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-semibold text-slate-800">{insight.title}</p>
                                                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                                                        {renderMetric(insight)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{insight.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Card className="animate-slide-up">
                <CardHeader
                    title={
                        <span className="flex items-center gap-2">
                            <Sparkles size={16} className="text-brand-500" />
                            {t('insights.assistant')}
                        </span>
                    }
                />

                <div className="mb-4 max-h-[45vh] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-4 scrollbar-thin sm:max-h-[360px]">
                    {chat.length === 0 && <p className="text-sm text-slate-400">{t('insights.ask_ph')}</p>}
                    {chat.map((message, index) => (
                        <div key={index} className={cn('flex', message.role === 'you' ? 'justify-end' : 'justify-start')}>
                            <div
                                className={cn(
                                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                                    message.role === 'you'
                                        ? 'rounded-br-md bg-brand-600 text-white'
                                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-700',
                                )}
                            >
                                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                                    {message.role === 'you' ? t('insights.you') : t('insights.answer')}
                                </p>
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <Spinner size="sm" />
                            {t('insights.thinking')}
                        </div>
                    )}
                </div>

                {suggestedQuestions.length > 0 && (
                    <div className="mb-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('insights.suggestions')}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestedQuestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => void ask(suggestion)}
                                    disabled={loading}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
                    <Textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={onComposerKeyDown}
                        placeholder={t('insights.ask_ph')}
                        className="min-h-[52px] flex-1"
                        rows={2}
                    />
                    <Button type="submit" loading={loading} icon={<Send size={15} />} className="sm:self-end">
                        {loading ? t('insights.thinking') : t('insights.send')}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
