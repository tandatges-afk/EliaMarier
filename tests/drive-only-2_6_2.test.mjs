import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Admin delivery has private links without Cloudflare mapping UI',()=>{
 const src=read('components/Dashboard.tsx');
 assert.match(src,/<DeliveryGrantManager eventId=\{event.id\} productId=\{product.id\} user=\{user\}\/>/);
 assert.doesNotMatch(src,/VideoStreamManager|HLS \/ CDN 2\.6/);
 assert.equal(existsSync(new URL('../components/VideoStreamManager.tsx',import.meta.url)),false);
});
test('Customer video keeps review timecode and uses private R2 playback',()=>{
 const src=read('components/ClientDelivery.tsx');
 const ticket=read('pages/api/drive-video.js');
 assert.match(src,/issueR2Playback/);
 assert.match(src,/deliveryToken:token/);
 assert.match(src,/mediaRef\.current\.currentTime=c\.seconds/);
 assert.match(src,/x-amorri-delivery-token/);
 assert.match(src,/onNativeError/);
 assert.match(ticket,/r2|R2/i);
});
test('Cloudflare Stream APIs retired; Vercel uses private R2 rather than public CDN',()=>{
 for(const path of ['app/api/video-streams/[eventId]/route.ts','lib/server/video-streaming.ts','lib/domain/streaming.ts'])
   assert.equal(existsSync(new URL('../'+path,import.meta.url)),false,path);
 for(const path of ['package.json'])assert.doesNotMatch(read(path),/CF_STREAM_[A-Z_]+|AMORRI_STREAM_TOKEN_TTL_SECONDS|hls\.js/);
 assert.match(read('app/api/health/route.ts'),/privateVideoMode: 'r2-only'/);
});
test('Cached playback API still verifies guest capability and returns R2 compatibility hint',()=>{
 const src=read('app/api/delivery/[eventId]/playback/route.ts');
 assert.match(src,/verifyDeliveryGrant\(eventId,deliveryToken\(request\)\)/);
 assert.match(src,/assertGrantProduct\(grant/);
 assert.match(src,/media\.find\(m=>m\.id===body\.mediaId&&m\.isVideo\)/);
 assert.match(src,/provider:'r2'/);
 assert.match(src,/VIDEO_REQUIRES_1080P/);
 assert.doesNotMatch(src,/signedHlsUrl|streamBinding/);
});
test('Native Drive delivery and feedback APIs remain while obsolete legacy image endpoint retires',()=>{
 for(const path of ['pages/api/drive-video.js','app/api/delivery/[eventId]/media/route.ts','app/api/delivery/[eventId]/reviews/route.ts','app/api/delivery/[eventId]/selections/route.ts'])
   assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
 assert.equal(existsSync(new URL('../pages/api/get-drive-images.js',import.meta.url)),false);
});
