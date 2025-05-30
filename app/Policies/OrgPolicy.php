<?php

namespace App\Policies;

use App\Models\Org;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class OrgPolicy
{
    /**
     * Determine whether the user can view any orgs.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can view the org.
     */
    public function view(User $user, Org $org): bool
    {
        return $user->org_id === $org->id;
    }

    /**
     * Determine whether the user can create orgs.
     */
    public function create(User $user): bool
    {
        // Seuls les super admins peuvent créer des orgs
        return false;
    }

    /**
     * Determine whether the user can update the org.
     */
    public function update(User $user, Org $org): bool
    {
        return $user->org_id === $org->id && $user->role === 'admin';
    }

    /**
     * Determine whether the user can delete the org.
     */
    public function delete(User $user, Org $org): bool
    {
        return $user->org_id === $org->id && $user->role === 'admin';
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Org $org): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Org $org): bool
    {
        return false;
    }
}
