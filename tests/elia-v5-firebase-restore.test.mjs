import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {conceptKey} from '../lib/server/concept-r2.ts';
const root=path.resolve(fileURLToPath(import.meta.url),'../..');
const read=rel=>readFileSync(path.join(root,rel),'utf8');
test('Firebase Authentication browser login is restored',()=>{
 const s=read('lib/auth/client.ts');assert.match(s,/from 'firebase\/auth'/);
 assert.doesNotMatch(s,/\/api\/auth\/login|local-cookie/);
 assert.match(read('lib/firebase/client.ts'),/getAuth\(app\)/);
 assert.equal(existsSync(path.join(root,'app/api/auth/login/route.ts')),false);
});
test('Firebase Admin authenticates bearer ID token and uses original RTDB',()=>{
 const code=read('lib/server/firebase-admin.ts');
 assert.match(code,/verifyIdToken\(match\[1\], true\)/);
 assert.match(code,/getDatabase\(firebaseAdminApp\(\)\)/);
 assert.match(code,/localAccountAdmin\(\).*getAuth\(firebaseAdminApp\(\)\)/s);
 assert.doesNotMatch(code,/vps-database|vps-auth/);
});
test('V5 roles include Sale, leaders and existing receptionist mapping',()=>{
 const code=read('lib/server/office-auth.ts');
 for(const x of ['admin','sale','leader_makeup','leader_photo','leader_decor','receptionist'])assert.match(code,new RegExp(x));
 assert.match(code,/from 'firebase-admin\/auth'/);
});
test('booking and delivery CAS are Firebase ETag-based and do not write to PostgreSQL',()=>{
 const booking=read('lib/server/booking-cas.ts'),delivery=read('lib/server/delivery-cas.ts');
 assert.match(booking,/FIREBASE_DATABASE_URL/);
 assert.match(booking,/firebaseToken/);
 assert.match(delivery,/X-Firebase-ETag/);
 assert.doesNotMatch(booking+delivery,/transactionVpsPath|localCasFetch/);
});
test('R2 sync workflows retain executable scripts during temporary Vercel period',()=>{
 for(const f of ['scripts/auto-drive-to-r2.mjs','scripts/sync-drive-to-r2.mjs','scripts/cleanup-r2-old-revisions.mjs','.github/workflows/r2-video-sync.yml','.github/workflows/r2-old-revisions.yml'])assert.equal(existsSync(path.join(root,f)),true,f);
});
test('private video is still signed R2 playback on current Vercel deployment',()=>{
 assert.match(read('lib/server/r2-private-video.mjs'),/r2-only/);
 assert.match(read('pages/api/drive-video.js'),/transport:'r2'/);
 assert.match(read('components/ClientDelivery.tsx'),/b\.transport!=='r2'/);
});
test('office photos use private R2 until VPS, not Vercel ephemeral filesystem',()=>{
 const route=read('app/api/office-uploads/route.ts');
 assert.match(route,/signConceptRead/);assert.match(route,/uploadConcept/);
 assert.match(route,/authenticatedOffice/);
 assert.match(route,/photos\.length>=8/);
 assert.doesNotMatch(route,/writeFile|ELIA_MEDIA_ROOT/);
 const ui=read('components/OfficePhoto.tsx');assert.match(ui,/getIdToken/);assert.match(ui,/createObjectURL/);assert.doesNotMatch(ui,/\?token=/);
});
test('office photo keys cannot overlap event concept keys',()=>{
 const id='a'.repeat(64),photo='abcdef12-3456-789a-bcde-fedcba987654';
 assert.equal(conceptKey('wardrobe-'+id,photo,'jpg'),`concepts/wardrobe-${id}/${photo}.jpg`);
 assert.equal(conceptKey('makeup-'+photo,photo,'webp'),`concepts/makeup-${photo}/${photo}.webp`);
});
test('npm manifest and lockfile include Firebase SDK, but no active PostgreSQL dependency',()=>{
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
 assert.equal(pkg.dependencies.firebase,'^12.4.0');assert.equal(pkg.dependencies['firebase-admin'],'^13.4.0');
 assert.equal(pkg.dependencies.pg,undefined);assert.equal(pkg.name,lock.name);assert.equal(pkg.version,lock.version);
 assert.deepEqual(pkg.dependencies,lock.packages[''].dependencies);
 assert.deepEqual(pkg.devDependencies,lock.packages[''].devDependencies);
});
