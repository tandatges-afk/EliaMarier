import fs from 'node:fs';
const files=['app/layout.tsx','components/Dashboard.tsx','components/OperationsHub.tsx','components/elia-uiux-v4.css','public/elia-ui-version.json'];
let failed=0;
for(const file of files){if(!fs.existsSync(file)){console.log('FAIL thiếu file:',file);failed++;}else console.log('PASS',file)}
const checks={
 'V4 CSS loaded':fs.existsSync(files[0])&&fs.readFileSync(files[0],'utf8').includes('elia-uiux-v4.css'),
 'V4 body active':fs.existsSync(files[0])&&fs.readFileSync(files[0],'utf8').includes('elia-ui-v4'),
 'V4 font Vietnamese stack':fs.existsSync(files[3])&&fs.readFileSync(files[3],'utf8').includes('Be Vietnam Pro'),
 'Outdated banner removed':fs.existsSync(files[1])&&!fs.readFileSync(files[1],'utf8').includes('<div className="welcome-band">'),
 'Version marker':fs.existsSync(files[4])&&JSON.parse(fs.readFileSync(files[4],'utf8')).version==='4.0',
};
for(const [name,pass] of Object.entries(checks)){console.log(pass?'PASS':'FAIL',name);if(!pass)failed++}
process.exitCode=failed?1:0;
