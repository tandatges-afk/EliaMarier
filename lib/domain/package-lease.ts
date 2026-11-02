/** Pure ownership rules for Élia package edit leases.
 * Lock replacement is only allowed when the server record is absent or
 * an existing WELL-FORMED lease has expired. Unexpected data fails closed.
 * Used inside authoritative RTDB ETag CAS; never use a local cache here.
 */
export type PackageLease = {uid:string;token:string;expiresAt:number};
function isLease(value:unknown):value is PackageLease {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const x=value as Record<string,unknown>;
  return typeof x.uid==='string'&&x.uid.length>0 &&
    typeof x.token==='string'&&x.token.length>0 &&
    typeof x.expiresAt==='number'&&Number.isFinite(x.expiresAt);
}
export function acquirePackageLease(current:unknown, requested:PackageLease, now:number):PackageLease|undefined {
  if(!isLease(requested)||!Number.isFinite(now)||requested.expiresAt<=now)return undefined;
  if(current===null)return requested;
  if(isLease(current)&&current.expiresAt<=now)return requested;
  return undefined;
}
export function releasePackageLease(current:unknown, token:string):null|undefined {
  if(!token||!isLease(current)||current.token!==token)return undefined;
  return null;
}
