import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd();
const target='app/api/wedding-wardrobe/items/[itemId]/route.ts';
const required=[
 'app/api/wedding-wardrobe/items/route.ts',
 target,
 'lib/server/wedding-wardrobe.ts',
 'lib/server/office-auth.ts',
 'lib/domain/wedding-rental.ts',
];
let bad=false;
for (const p of required){
 const exists=fs.existsSync(path.join(root,p));
 console.log(`${exists?'PASS':'MISSING'}  ${p}`);
 if(!exists)bad=true;
}
if (bad){console.error('MISSING: Ban can dong bo cac file API/backend truoc khi build.');process.exit(1);}
const route=fs.readFileSync(path.join(root,target),'utf8');
const backend=fs.readFileSync(path.join(root,'lib/server/wedding-wardrobe.ts'),'utf8');
for (const [label,pattern] of [
 ['DELETE handler',/export\s+async\s+function\s+DELETE\s*\(/],
 ['PATCH handler',/export\s+async\s+function\s+PATCH\s*\(/],
 ['admin authorization',/authenticatedOffice/],
 ['atomic delete',/\.transaction\s*\(/],
 ['rental history protection',/HAS_HISTORY/],
 ['64-character item ID',/\{64\}/],
]){
 const ok=pattern.test(route);console.log(`${ok?'PASS':'MISSING'}  ${label}`);if(!ok)bad=true;
}
for (const label of ['asWeddingItem','publicWeddingError','weddingAudit','weddingItemsRef','weddingFoldersRef','weddingKey','WeddingFault']){
 const ok=new RegExp(`\\b${label}\\b`).test(backend);console.log(`${ok?'PASS':'MISSING'}  backend ${label}`);if(!ok)bad=true;
}
try {
 const raw=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']});
 const tracked=raw.split('\0').includes(target);
 console.log(`${tracked?'PASS':'TO COMMIT'}  ${target} ${tracked?'is tracked by Git':'is not yet in Git index'}`);
} catch {console.log('INFO Git tracking could not be checked.');}
if(bad) process.exit(1);
console.log('\nPASS Static API checks. Run npm run typecheck && npm run build next.');
