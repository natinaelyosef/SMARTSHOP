<?php

namespace App\Http\Middleware;

use App\Services\ActiveShop;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every business-owned screen needs a tenant. Platform administrators
 * who have not picked one are sent to the picker instead of being shown
 * an empty (and confusing) application.
 */
class EnsureShopSelected
{
    public function handle(Request $request, Closure $next): Response
    {
        if (ActiveShop::id() !== null) {
            return $next($request);
        }

        if (ActiveShop::isPlatformAdmin()) {
            return redirect()->route('shops.select');
        }

        abort(403, 'Your account is not linked to a business yet. Contact your shop owner.');
    }
}