<?php

namespace App\Policies;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ContractPolicy
{
    /**
     * Determine whether the user can view any contracts.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'user', 'viewer']);
    }

    /**
     * Determine whether the user can view the contract.
     */
    public function view(User $user, Contract $contract): bool
    {
        return $user->org_id === $contract->org_id;
    }

    /**
     * Determine whether the user can create contracts.
     */
    public function create(User $user): bool
    {
        return $user->canCreateContracts();
    }

    /**
     * Determine whether the user can update the contract.
     */
    public function update(User $user, Contract $contract): bool
    {
        return $user->org_id === $contract->org_id 
            && in_array($user->role, ['admin', 'user']);
    }

    /**
     * Determine whether the user can delete the contract.
     */
    public function delete(User $user, Contract $contract): bool
    {
        return $user->org_id === $contract->org_id 
            && $user->canDeleteContracts();
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Contract $contract): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Contract $contract): bool
    {
        return false;
    }
}
