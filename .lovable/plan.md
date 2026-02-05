
# Security Review Report

## Executive Summary

This is a comprehensive security review of the BetOps ERP project, a betting operations management system. The project uses React + Supabase (via Lovable Cloud) with role-based access control (RBAC) separating Admins and Operators.

Overall the security posture is **good**, with proper RLS policies, secure role management, and server-side validation in edge functions. However, there are several areas requiring attention.

---

## Findings Overview

| Severity | Count | Description |
|----------|-------|-------------|
| High | 1 | Edge functions missing JWT verification config |
| Medium | 2 | Leaked password protection disabled, potential email exposure |
| Low | 3 | Minor improvements and hardening opportunities |

---

## Critical & High Priority Issues

### 1. Edge Functions Missing `verify_jwt = false` Configuration
**Severity: HIGH**

The edge functions (`create-user`, `delete-user`) correctly implement manual JWT validation in code, but the `supabase/config.toml` file doesn't explicitly set `verify_jwt = false` for these functions.

**Current config.toml:**
```toml
project_id = "pbkuaviuxavdhfknytfo"
```

**Problem:** Without explicit configuration, functions may fail silently or have inconsistent auth behavior.

**Recommended fix:**
```toml
project_id = "pbkuaviuxavdhfknytfo"

[functions.create-user]
verify_jwt = false

[functions.delete-user]
verify_jwt = false
```

---

## Medium Priority Issues

### 2. Leaked Password Protection Disabled
**Severity: MEDIUM**

The Supabase linter detected that leaked password protection is currently disabled. This feature checks new passwords against known data breaches (Have I Been Pwned).

**Recommendation:** Enable this feature in the backend authentication settings to prevent users from using compromised passwords.

### 3. Profile Email Exposure Risk
**Severity: MEDIUM**

The `profiles` table contains email addresses accessible to all admins via the `Admins can view all profiles` policy. While this is intentional for user management, consider:

- If `get_current_profile_id()` returns null (edge case), the user SELECT policy might behave unexpectedly
- Admins can enumerate all user emails

**Recommendation:** Review if all admins truly need access to all emails, and ensure `get_current_profile_id()` handles edge cases gracefully.

---

## Low Priority Issues

### 4. Operators Cannot View Their Own Transactions
**Severity: LOW / Business Logic**

The `transactions` table only has admin-level RLS policies. If operators need to see their own transactions (via `related_operator_id`), they currently cannot.

**Options:**
- If intentional: Document this business rule
- If not: Add policy: `Operators can view their own transactions` with condition `(related_operator_id = get_current_profile_id())`

### 5. Bank Balances Inaccessible to Operators
**Severity: LOW / Business Logic**

Similar to transactions, operators have no SELECT policy on `bank_balances`. Determine if this is the intended behavior.

### 6. Vendor Information in Accounts Table
**Severity: LOW**

The `vendor_name` and `notes` fields in `accounts` could contain sensitive business information. Operators can see their own accounts - ensure these fields don't store confidential data that shouldn't be exposed if an operator account is compromised.

---

## Security Strengths

### Proper Role Separation
- Roles stored in separate `user_roles` table (avoiding privilege escalation)
- Uses `has_role()` security definer function to prevent RLS recursion
- `get_current_profile_id()` properly bridges auth.uid() to profile.id

### Edge Functions Security
- Both `create-user` and `delete-user` properly validate:
  - Authorization header presence
  - Token validity via Supabase auth
  - Admin role verification before operations
  - Self-deletion prevention
  - Request body validation

### Frontend Protection
- Admin-only pages (`Operadores`, `CriarUsuario`, `Financeiro`) check `isAdmin` and redirect
- `DashboardLayout` requires authenticated user
- No client-side role checking using localStorage

### RLS Policies
- All 7 tables have RLS enabled
- 21 policies covering CRUD operations
- Operators scoped to their own data via `operator_id = get_current_profile_id()`
- Admins have full access where needed

---

## Recommendations Summary

### Immediate Actions (High Priority)
1. Update `supabase/config.toml` to explicitly set `verify_jwt = false` for edge functions

### Short-Term Actions (Medium Priority)
2. Enable leaked password protection in authentication settings
3. Review `get_current_profile_id()` edge case handling

### Consider for Future (Low Priority)
4. Decide on operator access to transactions/bank_balances and document or implement accordingly
5. Review what data is stored in `vendor_name` and `notes` fields

---

## Technical Details

### Current Database Functions (Secure)
```sql
-- Proper security definer pattern
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'

CREATE FUNCTION public.get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
```

### RLS Policy Examples (Correct Implementation)
```sql
-- Uses security definer function, avoiding recursion
USING condition: has_role(auth.uid(), 'admin'::app_role)

-- Proper operator scoping
USING condition: (operator_id = get_current_profile_id())
```

### Edge Function Auth Pattern (Correct)
```typescript
// Validates admin role server-side
const { data: requestingRole } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', requestingProfile.id)
  .single();

if (requestingRole?.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Only admins can delete users' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```
