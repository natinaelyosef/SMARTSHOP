<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Models\Notification;
use App\Services\ActiveShop;
use App\Services\BranchContext;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $shop = ActiveShop::shop();
        $locale = $user?->language ?? session('locale', $shop?->language ?? 'en');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'avatar' => $user->avatar,
                    'role' => $user->role?->name,
                    'role_slug' => $user->role?->slug,
                    'branch' => $user->branch?->name,
                    'branch_id' => $user->branch_id,
                    'language' => $user->language,
                    'is_owner' => $user->is_owner,
                    'is_platform_admin' => $user->is_platform_admin,
                    'data_scope' => $user->effectiveDataScope(),
                    'must_change_password' => $user->must_change_password,
                    'permissions' => $user->hasPermission('*')
                        ? ['*']
                        : $user->permissions()->values(),
                ] : null,
            ],
            'shop' => $shop ? [
                'id' => $shop->id,
                'name' => $shop->name,
                'logo' => $shop->logo,
                'address' => $shop->address,
                'phone' => $shop->phone,
                'email' => $shop->email,
                'currency' => $shop->currency,
                'currency_symbol' => $shop->currency_symbol,
                'language' => $shop->language,
                'costing_method' => $shop->costing_method,
                'low_stock_threshold' => $shop->low_stock_threshold,
                'default_payment_method' => $shop->default_payment_method,
                'allow_negative_stock' => $shop->allow_negative_stock,
                'onboarding_completed' => $shop->onboarding_completed,
                'team_mode' => $shop->team_mode === 'team' ? 'team' : 'single',
            ] : null,
            'branch' => fn () => $this->activeBranch(),
            'branches' => fn () => $this->switchableBranches(),
            'locale' => $locale,
            'flash' => [
                'success' => fn () => session('success'),
                'error' => fn () => session('error'),
            ],
            'alerts' => fn () => $user ? app(NotificationService::class)->counts() : null,
            'notifications' => fn () => $user ? $this->latestNotifications($request) : null,
            'sidebarOpen' => fn () => (bool) session('sidebar_open', true),
        ];
    }

    private function activeBranch(): ?array
    {
        $branch = BranchContext::branch();

        if (! $branch) {
            return null;
        }

        return [
            'id' => $branch->id,
            'name' => $branch->name,
            'code' => $branch->code,
            'opening_float' => $branch->opening_float,
            'is_primary' => $branch->is_primary,
        ];
    }

    /**
     * @return array<int, array>
     */
    private function switchableBranches(): array
    {
        return Branch::whereIn('id', BranchContext::switchable())
            ->orderByDesc('is_primary')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'is_primary'])
            ->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'code' => $b->code,
                'is_primary' => $b->is_primary,
            ])
            ->all();
    }

    private function latestNotifications(Request $request): array
    {
        return Notification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'level' => $n->level,
                'title' => $n->title,
                'message' => $n->message,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at->diffForHumans(),
                'link' => $n->data['link'] ?? null,
            ])
            ->all();
    }
}