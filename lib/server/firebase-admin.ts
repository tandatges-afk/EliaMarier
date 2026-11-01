/** Legacy import name maintained so existing API code can use PostgreSQL auth and DB. */
export {
 adminDatabase, vpsPool
} from './vps-database';
export {
 AdminAuthFailure,publicAuthFailure,authenticatedUser,authenticatedAdmin,isAdmin,
 localAccountAdmin
} from './vps-auth';
export type {DecodedIdToken,AdminAuthCode} from './vps-auth';
