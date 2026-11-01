#!/usr/bin/env node
/** Import exported Firebase Auth identities preserving UID/email, but NOT passwords.
 * Users must set a fresh password locally before first login.
 * Accept Firebase Auth CLI export format: array of users / {users:[...]}.
 */
import {readFile} from 'node:fs/promises';
import pg from 'pg';
const source=process.argv[2],apply=process.argv.includes('--apply');
if(!source||!process.env.DATABASE_URL){console.error('Usage: DATABASE_URL=... node vps/import-firebase-users.mjs users.json [--apply]');process.exit(2);}
const parsed=JSON.parse(await readFile(source,'utf8'));
const users=Array.isArray(parsed)?parsed:parsed.users;
if(!Array.isArray(users))throw Error('Expected Firebase Auth JSON user array');
const admins=new Set((process.env.AMORRI_ADMIN_UIDS||'').split(',').filter(Boolean));
const rows=users.map(x=>({uid:String(x.localId||x.uid||''),email:String(x.email||'').toLowerCase(),name:String(x.displayName||''),disabled:!!x.disabled,admin:admins.has(x.localId||x.uid)}));
if(rows.some(x=>!x.uid||!x.email||!x.email.includes('@')))throw Error('Invalid UID/email in Firebase export');
console.log({accounts:rows.length,adminAccounts:rows.filter(x=>x.admin).length,withoutPassword:rows.length});
if(!apply){console.log('DRY RUN. Passwords are intentionally NOT migrated.');process.exit(0);}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
try{await c.query('BEGIN');const exists=await c.query('SELECT count(*)::int AS n FROM elia_users');if(Number(exists.rows[0].n))throw Error('User table not empty');
 for(const x of rows)await c.query('INSERT INTO elia_users(uid,email,display_name,disabled,admin) VALUES($1,$2,$3,$4,$5)',[x.uid,x.email,x.name,x.disabled,x.admin]);
 await c.query('COMMIT');console.log('Users imported; set new passwords with vps/reset-password.mjs.');
}catch(e){await c.query('ROLLBACK');console.error(e.message);process.exitCode=1;}finally{c.release();await pool.end();}
