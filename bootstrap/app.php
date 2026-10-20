<?php

use App\Http\Middleware\EnsureBranchSelected;
use App\Http\Middleware\EnsureShopSelected;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\Permission;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [HandleInertiaRequests::class]);
        $middleware->alias([
            'permission' => Permission::class,
            'active.user' => EnsureUserIsActive::class,
            'shop.selected' => EnsureShopSelected::class,
            'branch.selected' => EnsureBranchSelected::class,
        ]);
        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->expectsJson() && ! $request->header('X-Inertia');
        });

        $exceptions->render(function (DomainException $e, Request $request) {
            $message = match ($e->getMessage()) {
                'insufficient_stock' => 'Unable to complete the sale. Please check the product stock and try again.',
                'invalid_payment_amount' => 'The payment amount is invalid or exceeds the outstanding balance.',
                'invalid_quantity' => 'Quantity must be greater than zero.',
                'invalid_return_quantity' => 'The return quantity is invalid for this sale.',
                'sale_no_items' => 'Please add at least one product to the sale.',
                'return_no_items' => 'Please select the items being returned.',
                default => $e->getMessage(),
            };

            if ($request->header('X-Inertia')) {
                return back()->withErrors(['error' => $message]);
            }

            return response()->json(['message' => $message], 422);
        });

        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                return back()->withErrors(['error' => 'Your session expired. Please refresh the page and try again.']);
            }
        });

        $exceptions->render(function (HttpException $e, Request $request) {
            $status = $e->getStatusCode();
            $titles = [
                403 => 'Access denied',
                404 => 'Page not found',
                419 => 'Session expired',
                429 => 'Too many requests',
            ];

            if ($request->header('X-Inertia') && ! $request->isMethod('GET')) {
                return back()->withErrors(['error' => $titles[$status] ?? 'The request could not be completed.']);
            }

            if (! $request->expectsJson()) {
                Inertia::share((new HandleInertiaRequests)->share($request));

                return Inertia::render('errors/Show', [
                    'status' => $status,
                    'title' => $titles[$status] ?? 'Something went wrong',
                ])->toResponse($request)->setStatusCode($status);
            }

            return null;
        });
    })->create();
