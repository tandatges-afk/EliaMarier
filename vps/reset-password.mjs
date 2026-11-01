#!/usr/bin/env node
/** Run on trusted terminal; password supplied interactively without command-line arguments. */
import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {randomBytes,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import pg from 'pg';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!process.env.DATABASE_URL){console.error('Usage: DATABASE_URL=... node vps/reset-password.mjs user@example.com');process.exit(2);}
const rl=createInterface({input,output});
const password=await rl.question('New password (input may be visible; use a private terminal): ');rl.close();
if(password.length<12){console.error('Password must be >=12 characters');process.exit(2);}
const salt=randomBytes(24).toString('hex');const hash=((await promisify(scryptCallback)(password,salt,64))).toString('hex');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{const result=await pool.query('UPDATE elia_users SET password_salt=$1,password_hash=$2,session_version=session_version+1 WHERE lower(email)=$3 RETURNING uid',[salt,hash,email]);
 if(result.rowCount!==1)throw Error('User not found');
 await pool.query('DELETE FROM elia_sessions WHERE uid=$1',[result.rows[0].uid]);console.log('Password set and old sessions revoked.');
}catch(e){console.error('Failed:',e.message);process.exitCode=1;}finally{await pool.end();}
