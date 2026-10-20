<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('units/Index', [
            'units' => Unit::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', 'unique:units,name'],
            'short_name' => ['nullable', 'string', 'max:20'],
        ]);

        Unit::create([
            ...$data,
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'status' => 'active',
        ]);

        return back()->with('success', 'Unit created.');
    }

    public function update(Request $request, Unit $unit): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', 'unique:units,name,'.$unit->id],
            'short_name' => ['nullable', 'string', 'max:20'],
            'status' => ['required', 'in:active,archived'],
        ]);

        $unit->update($data);

        return back()->with('success', 'Unit updated.');
    }
}
