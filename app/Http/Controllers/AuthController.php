<?php

namespace App\Http\Controllers;

use App\Services\ActiveShop;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(): Response
    {
        return Inertia::render('auth/Login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = Str::lower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Too many login attempts. Please try again in '.RateLimiter::availableIn($throttleKey).' seconds.',
            ]);
        }

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($throttleKey, 60);
            $this->recordAttempt($credentials['email'], false, $request);

            throw ValidationException::withMessages([
                'email' => 'The provided credentials do not match our records.',
            ]);
        }

        $user = Auth::user();

        if (! $user->isActive()) {
            Auth::logout();
            $this->recordAttempt($credentials['email'], false, $request);

            throw ValidationException::withMessages([
                'email' => 'Your account has been deactivated. Contact your shop owner.',
            ]);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        $user->forceFill([
            'last_login_at' => now(),
            'password_changed_at' => $user->password_changed_at ?? now(),
        ])->save();

        $this->recordAttempt($credentials['email'], true, $request);

        if ($user->language) {
            app()->setLocale($user->language);
        }

        $shop = ActiveShop::shop();

        if ($shop && ! $shop->onboarding_completed) {
            return redirect()->route('onboarding.index');
        }

        // Platform administrators pick which business to work in.
        if ($user->is_platform_admin && $shop === null) {
            return redirect()->route('shops.select');
        }

        if ($user->must_change_password) {
            return redirect()->route('password.force');
        }

        return redirect()->intended(route('pos'));
    }

    protected function recordAttempt(string $email, bool $successful, Request $request): void
    {
        DB::table('login_attempts')->insert([
            'email' => Str::lower($email),
            'user_id' => $successful ? Auth::id() : null,
            'ip_address' => $request->ip(),
            'successful' => $successful,
            'created_at' => now(),
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    public function showForgot(): Response
    {
        return Inertia::render('auth/ForgotPassword');
    }

    public function sendLink(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return back()->with('success', __($status));
    }

    public function showReset(string $token): Response
    {
        return Inertia::render('auth/ResetPassword', [
            'token' => $token,
            'email' => request()->query('email', ''),
        ]);
    }

    public function reset(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->string('password')),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return redirect()->route('login')->with('success', __($status));
    }
}
