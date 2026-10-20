import { createInertiaApp, usePage } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import AppLayout from '@/layouts/AppLayout';
import type { SharedProps } from '@/types';

const pages = import.meta.glob('./pages/**/*.tsx');

function RootLayout({ children }: { children: React.ReactNode }) {
    const { auth } = usePage<SharedProps>().props;

    return auth?.user ? <AppLayout>{children}</AppLayout> : <>{children}</>;
}

type PageComponent = React.ComponentType<Record<string, unknown>> & {
    layout?: ((children: React.ReactNode) => React.ReactNode) | React.ReactNode[];
};

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(`./pages/${name}.tsx`, pages).then((resolved) => {
            const module = resolved as { default: PageComponent };
            const page = module.default;

            if (!name.startsWith('auth/') && page && typeof page.layout !== 'function') {
                page.layout = (children: React.ReactNode) => <RootLayout>{children}</RootLayout>;
            }

            return module;
        }),
    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider>
                <I18nProvider locale={(props.initialPage.props as { locale?: string }).locale ?? 'en'}>
                    <App {...props} />
                </I18nProvider>
            </ThemeProvider>,
        );
    },
});
