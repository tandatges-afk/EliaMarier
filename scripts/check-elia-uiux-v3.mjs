import fs from 'node:fs';
const root=process.cwd();
const load=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const checks=[
 ['CSS thiết kế V3 tồn tại',load('components/elia-uiux-v3.css').includes('ÉLIA MARIER — UI/UX V3')],
 ['Root layout import CSS V3',load('app/layout.tsx').includes("elia-uiux-v3.css")],
 ['Body kích hoạt theme V3',load('app/layout.tsx').includes('elia-ui-v3')],
 ['Dashboard import CSS cuối',load('components/Dashboard.tsx').includes("import './elia-uiux-v3.css';")],
 ['Sidebar chia 2 nhóm',load('components/Dashboard.tsx').includes('elia-nav-group')],
 ['Tổng quan có thứ bậc mới',load('components/Dashboard.tsx').includes('elia-workspace-section-title')],
 ['Có nhãn phiên bản để kiểm tra trên Vercel',load('components/Dashboard.tsx').includes('elia-build-label')],
 ['URL xác minh phiên bản tồn tại',load('public/elia-ui-version.json').includes('UI/UX V3')],
 ['Không còn hero lịch váy cưới',!load('components/WeddingWardrobe.tsx').includes('className="elia-wedding-hero"')],
 ['Không còn hero kho váy',!load('components/WeddingCatalogManager.tsx').includes('className="ewc-hero"')],
];
for(const [label,ok] of checks)console.log(`${ok?'PASS':'FAIL'} · ${label}`);
if(checks.some(x=>!x[1]))process.exitCode=1;
