import fs from 'node:fs';
const files=[
 'components/WardrobeRiskNotice.tsx','components/WardrobeEventCodes.tsx',
 'components/WeddingWardrobe.tsx','components/NewBookingDialog.tsx',
 'components/ConceptPhotos.tsx','components/wedding-wardrobe.css',
 'lib/domain/wedding-advisory.ts','lib/domain/wedding-rental.ts',
 'lib/server/wedding-wardrobe.ts',
 'app/api/wedding-wardrobe/bookings/route.ts',
 'app/api/wedding-wardrobe/availability/route.ts',
 'app/api/events/[id]/concept-photos/route.ts'];
let bad=0;
for(const f of files){if(!fs.existsSync(f)){console.error('THIẾU:',f);bad++;}}
for(const [f,expected] of [
 ['lib/server/wedding-wardrobe.ts','weddingFoldersRef'],
 ['lib/domain/wedding-rental.ts','WeddingFolder'],
 ['components/WeddingWardrobe.tsx','WardrobeRiskNotice'],
 ['components/ConceptPhotos.tsx','WardrobeEventCodes'],
 ['app/api/wedding-wardrobe/bookings/route.ts','NEARBY_ACK_REQUIRED']]){
 if(fs.existsSync(f)&&!fs.readFileSync(f,'utf8').includes(expected)){console.error('KHÔNG TƯƠNG THÍCH:',f,expected);bad++;}
}
console.log(bad?'Cần bổ sung/sửa '+bad+' lỗi':'Đủ file và các điểm nối dự báo ±2 ngày.');
process.exitCode=bad?1:0;
