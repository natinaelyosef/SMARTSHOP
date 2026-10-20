<?php

namespace App\Http\Middleware;

use App\Services\BranchContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Remembers which branch the user picked for this session and keeps it
 * within their permissions, so every page agrees on the same branch.
 */
class EnsureBranchSelected
{
    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->session()->get(BranchContext::SESSION_KEY);

        if ($requested !== null && ! in_array((int) $requested, BranchContext::switchable(), true)) {
            BranchContext::set(null);
        }

        return $next($request);
    }
}