<?php

namespace App\Policies;

use App\Models\Alert;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AlertPolicy
{
    /**
     * Determine whether the user can view any alerts.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'user', 'viewer']);
    }

    /**
     * Determine whether the user can view the alert.
     */
    public function view(User $user, Alert $alert): bool
    {
        return $user->org_id === $alert->contract->org_id;
    }

    /**
     * Determine whether the user can create alerts.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'user']);
    }

    /**
     * Determine whether the user can update the alert.
     */
    public function update(User $user, Alert $alert): bool
    {
        return $user->org_id === $alert->contract->org_id 
            && in_array($user->role, ['admin', 'user']);
    }

    /**
     * Determine whether the user can delete the alert.
     */
    public function delete(User $user, Alert $alert): bool
    {
        return $user->org_id === $alert->contract->org_id 
            && in_array($user->role, ['admin', 'user']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Alert $alert): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Alert $alert): bool
    {
        return false;
    }
}
