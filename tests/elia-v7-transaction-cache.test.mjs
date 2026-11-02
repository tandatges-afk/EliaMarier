import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('wardrobe booking uses server ETag CAS, not local null transaction fallback',()=>{
 const s=source('app/api/wedding-wardrobe/bookings/route.ts');
 assert.match(s,/weddingItemCas\(itemId,raw=>/);
 assert.match(s,/weddingConflict\(item\.bookings,booking\.startDate,booking\.endDate\)/);
 assert.match(s,/NEARBY_ACK_REQUIRED/);
 assert.match(s,/RENTAL_CONFLICT/);
 assert.doesNotMatch(s,/itemRef\.transaction|TRANSACTION_RETRY_REQUIRED/);
});
test('wardrobe edit/delete and folder rename share authoritative CAS',()=>{
 const items=source('app/api/wedding-wardrobe/items/[itemId]/route.ts');
 const bookings=source('app/api/wedding-wardrobe/bookings/[itemId]/[bookingId]/route.ts');
 const folder=source('app/api/wedding-wardrobe/folders/[folderId]/route.ts');
 assert.match(items,/weddingItemsCas\(raw=>/);
 assert.match(items,/weddingItemCas\(itemId,raw=>/);
 assert.match(bookings,/weddingItemCas\(itemId,raw=>/);
 assert.match(folder,/weddingFolderCas\(folderId,raw=>/);
});
test('package wardrobe reservations and cleanup use CAS; compensation is retained',()=>{
 const src=source('lib/server/elia-package-sync.ts');
 assert.match(src,/weddingItemCas\(entry\.itemId/);
 assert.match(src,/weddingItemCas\(itemId/);
 assert.match(src,/weddingItemCas\(x\.itemId/);
 assert.match(src,/cleanupFailures\.push/);
 assert.match(src,/reservation compensation failed/);
});
test('server REST conditional writer uses ETag, If-Match, and isolated demo emulator guard',()=>{
 const core=source('lib/domain/rtdb-etag-cas.ts');
 const server=source('lib/server/wedding-etag-cas.ts');
 assert.match(core,/X-Firebase-ETag/);
 assert.match(core,/If-Match/);
 assert.match(core,/written.status===412/);
 assert.match(core,/RTDB_CAS_UNCERTAIN/);
 assert.match(server,/demo-elia-v7-qa08/);
 assert.match(server,/127\\.0\\.0\\.1/);
 assert.match(server,/firebaseAdminApp\(\)\.options\.credential/);
});
