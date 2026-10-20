import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from './motion';
import { cn, statusColor } from '@/lib/utils';

export { cn };

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    loading?: boolean;
    icon?: ReactNode;
}

export function Button({ variant = 'primary', loading, icon, className, children, disabled, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150',
                'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
                buttonVariants[variant],
                className,
            )}
        >
            {loading ? <Spinner size="sm" /> : icon}
            {children}
        </button>
    );
}

export function LinkButton({
    href,
    variant = 'primary',
    className,
    children,
    icon,
}: {
    href: string;
    variant?: ButtonVariant;
    className?: string;
    children: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]',
                buttonVariants[variant],
                className,
            )}
        >
            {icon}
            {children}
        </Link>
    );
}

/* ---------------- Spinner / Empty / Skeleton ---------------- */

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const dims = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-5 w-5 border-2';
    return (
        <span
            role="status"
            aria-label="Loading"
            className={cn('inline-block animate-spin rounded-full border-current border-r-transparent', dims, className)}
        />
    );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center animate-fade-in dark:border-slate-700 dark:bg-slate-900/60">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl dark:bg-brand-600/20">📦</div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('skeleton h-4 w-full', className)} />;
}

/* ---------------- Card ---------------- */

export function Card({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={cn('card p-5', className)}>
            {children}
        </div>
    );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
    return (
        <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2', className)}>
            <div className="min-w-0">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

/* ---------------- Form fields ---------------- */

export function Label({ children, htmlFor, required }: { children: ReactNode; htmlFor?: string; required?: boolean }) {
    return (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {children}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
    );
}

interface FieldProps {
    label?: string;
    error?: string | null;
    hint?: string;
    children: ReactNode;
    className?: string;
    required?: boolean;
}

export function Field({ label, error, hint, children, className, required }: FieldProps) {
    return (
        <div className={className}>
            {label && <Label required={required}>{label}</Label>}
            {children}
            {error ? (
                <p className="mt-1 text-xs font-medium text-rose-600 animate-fade-in">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-slate-400">{hint}</p>
            ) : null}
        </div>
    );
}

const fieldClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn(fieldClass, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={cn(fieldClass, 'min-h-[80px]', className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select {...props} className={cn(fieldClass, 'appearance-none bg-no-repeat pr-8', className)}>
            {children}
        </select>
    );
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
    return (
        <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300', className)}>
            <input type="checkbox" {...props} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            {label}
        </label>
    );
}

/* ---------------- Badge ---------------- */

export function Badge({ children, className, tone }: { children: ReactNode; className?: string; tone?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tone ?? 'bg-slate-100 text-slate-600', className)}>
            {children}
        </span>
    );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
    return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', statusColor(status))}>{label ?? status}</span>;
}

/* ---------------- Modal ---------------- */

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        if (open) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-lg';

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className={cn(
                            'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900',
                            width,
                            'scrollbar-thin',
                        )}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-5 py-4">{children}</div>
                        {footer && <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">{footer}</div>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ---------------- Pagination ---------------- */

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

export function Pagination({ links, className }: { links: PaginatorLink[]; className?: string }) {
    if (links.length <= 3) return null;
    return (
        <nav className={cn('flex flex-wrap items-center justify-center gap-1', className)} aria-label="Pagination">
            {links.map((link, i) => (
                <Link
                    key={i}
                    href={link.url ?? '#'}
                    preserveScroll
                    preserveState
                    aria-current={link.active ? 'page' : undefined}
                    className={cn(
                        'min-w-9 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition',
                        link.active
                            ? 'bg-brand-600 text-white shadow-sm'
                            : link.url
                              ? 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                              : 'cursor-default text-slate-300',
                    )}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </nav>
    );
}

/* ---------------- Tabs ---------------- */

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (key: string) => void }) {
    return (
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 no-scrollbar dark:bg-slate-800">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    onClick={() => onChange(tab.key)}
                    className={cn(
                        'whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all',
                        active === tab.key ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

/* ---------------- Toast / Flash ---------------- */

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
    id: number;
    message: string;
    tone: ToastTone;
}

const ToastContext = createContext<{ push: (message: string, tone?: ToastTone) => void }>({ push: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    const push = useCallback((message: string, tone: ToastTone = 'success') => {
        const id = ++counter.current;
        setItems((prev) => [...prev, { id, message, tone }]);
        setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5200);
    }, []);

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(94vw,420px)] -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            role="alert"
                            className={cn(
                                'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl',
                                item.tone === 'success' && 'bg-emerald-600',
                                item.tone === 'error' && 'bg-rose-600',
                                item.tone === 'info' && 'bg-slate-800',
                            )}
                        >
                            <span aria-hidden>{item.tone === 'success' ? '✓' : item.tone === 'error' ? '!' : 'i'}</span>
                            <span className="flex-1">{item.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}

/* ---------------- Misc ---------------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function Money({ value, symbol = 'Br', className, negative }: { value: number | string; symbol?: string; className?: string; negative?: boolean }) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const text = `${symbol} ${(num ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    return (
        <span className={cn('tabular-nums', negative && num < 0 && 'text-rose-600', className)}>{text}</span>
    );
}
