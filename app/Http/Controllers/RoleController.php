<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use App\Services\ShopSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('roles/Index', [
            'roles' => Role::with('permissions')->orderBy('name')->get()
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'slug' => $r->slug,
                    'description' => $r->description,
                    'is_system' => $r->is_system,
                    'locked' => $r->grantsEverything(),
                    'users_count' => $r->users()->count(),
                    'permissions' => $r->permissions->pluck('slug'),
                ]),
            'permissions' => Permission::orderBy('module')->orderBy('name')->get()
                ->groupBy('module')
                ->map(fn ($g) => $g->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'slug' => $p->slug])->values())
                ->all(),
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_unless((int) $role->shop_id === ShopSettings::id(), 404);

        if ($role->grantsEverything()) {
            return back()->withErrors(['permissions' => 'The '.$role->name.' role always has full access.']);
        }

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['exists:permissions,id'],
        ]);

        $previous = $role->permissions->pluck('slug')->all();
        $role->permissions()->sync($data['permissions']);

        AuditLogger::log(
            'permission.changed',
            Role::class,
            $role->id,
            "Permissions updated for role {$role->name}",
            ['permissions' => $previous],
            ['permissions' => Permission::whereIn('id', $data['permissions'])->pluck('slug')->all()],
        );

        return back()->with('success', 'Role permissions updated.');
    }
}
