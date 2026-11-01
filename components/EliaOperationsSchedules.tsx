'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {CalendarDays,Check,ChevronDown,ImagePlus,Plus,RefreshCw,SquarePen,Trash2,X} from 'lucide-react';
import type {User} from '@/lib/auth/client';
import type {OfficeRole} from '@/lib/server/office-auth';
import {serviceLabels,type EliaModule,type ModuleRecord} from '@/lib/domain/elia-operations';
import {optimizeOfficePhoto} from '@/lib/ui/optimize-office-image';

type InputSpec={name:string;key:string;type?:'text'|'date'|'time'|'number'|'tel'|'textarea';required?:boolean;wide?:boolean};
const decorFields:InputSpec[]=[
 {key:'brideName',name:'Tên cô dâu'},{key:'groomName',name:'Tên chú rể'},
 {key:'bridePhone',name:'SĐT cô dâu',type:'tel'},{key:'groomPhone',name:'SĐT chú rể',type:'tel'},
 {key:'contactPhone',name:'Điện thoại liên hệ chính',type:'tel',wide:true},
 {key:'brideAddress',name:'Địa chỉ nhà dâu',wide:true},{key:'groomAddress',name:'Địa chỉ nhà rể',wide:true},
 {key:'partyDate',name:'Ngày tiệc',type:'date',required:true},{key:'installDate',name:'Ngày thực hiện decor',type:'date',required:true},
 {key:'pickupDate',name:'Ngày thu hồi decor',type:'date',required:true},
 {key:'price',name:'Chi phí tổng (VNĐ)',type:'number'},{key:'deposit',name:'Đã cọc (VNĐ)',type:'number'},
 {key:'notes',name:'Ghi chú',type:'textarea',wide:true}
];
const makeupFields:InputSpec[]=[
 {key:'customerName',name:'Tên khách hàng',required:true}, {key:'phone',name:'Số điện thoại',type:'tel'},
 {key:'makeupDate',name:'Ngày makeup',type:'date',required:true},{key:'makeupTime',name:'Giờ makeup',type:'time',required:true},
 {key:'layout',name:'Layout của khách',type:'textarea',wide:true},{key:'notes',name:'Ghi chú',type:'textarea',wide:true}
];
const packageFields:InputSpec[]=[
 {key:'brideName',name:'Tên cô dâu'},{key:'groomName',name:'Tên chú rể'},
 {key:'bridePhone',name:'SĐT dâu',type:'tel'},{key:'groomPhone',name:'SĐT rể',type:'tel'},
 {key:'contactPhone',name:'SĐT liên hệ chính',type:'tel',wide:true},
 {key:'brideAddress',name:'Địa chỉ nhà dâu',wide:true},{key:'groomAddress',name:'Địa chỉ nhà rể',wide:true},
 {key:'notes',name:'Ghi chú chung',type:'textarea',wide:true}
];
const titles:Record<EliaModule,string>={decor:'Lịch Decor',makeup:'Lịch Makeup',packages:'Chọn gói dịch vụ'};
const desc:Record<EliaModule,string>={decor:'Lên lịch dựng, tiệc và thu hồi decor cho hai gia đình.',makeup:'Quản lý giờ makeup, layout và hình tham khảo của khách.',packages:'Một hồ sơ dâu rể, chọn nhiều dịch vụ; mỗi dịch vụ có ngày và giờ riêng.'};
const dayNow=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const empty=(module:EliaModule):Record<string,any>=>module==='decor'?{brideName:'',groomName:'',bridePhone:'',groomPhone:'',contactPhone:'',brideAddress:'',groomAddress:'',partyDate:dayNow(),installDate:dayNow(),pickupDate:dayNow(),price:0,deposit:0,notes:''}:module==='makeup'?{customerName:'',phone:'',makeupDate:dayNow(),makeupTime:'08:00',layout:'',notes:''}:{brideName:'',groomName:'',bridePhone:'',groomPhone:'',contactPhone:'',brideAddress:'',groomAddress:'',notes:'',services:{}};
function SchedulePhotos({user,record,onRefresh,canManage}:{user:User;record:ModuleRecord;onRefresh:()=>void;canManage:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const files=Array.isArray(record.photos)?record.photos:[];
 const view=(f:string)=>`/api/office-uploads?kind=makeup&id=${encodeURIComponent(record.id)}&file=${encodeURIComponent(f)}`;
 const upload=async(e:React.ChangeEvent<HTMLInputElement>)=>{const incoming=Array.from(e.target.files||[]) as File[];e.target.value='';if(incoming.length+files.length>8){setError('Tối đa 8 ảnh');return;}setBusy(true);setError('');try{for(const f of incoming){const form=new FormData();form.set('kind','makeup');form.set('id',record.id);form.set('file',await optimizeOfficePhoto(f));const r=await fetch('/api/office-uploads',{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`},body:form});const d=await r.json();if(!r.ok)throw Error(d.error||'Upload thất bại');}onRefresh();}catch(e){setError(e instanceof Error?e.message:'Upload lỗi');onRefresh();}finally{setBusy(false);}};
 const remove=async(file:string)=>{setBusy(true);setError('');try{const r=await fetch('/api/office-uploads',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({kind:'makeup',id:record.id,file})});const d=await r.json();if(!r.ok)throw Error(d.error||'Không xóa được');onRefresh();}catch(e){setError(e instanceof Error?e.message:'Không xóa được');}finally{setBusy(false);}};
 return <div className="elia-v5-photo-editor"><div className="elia-v5-photo-editor-heading"><strong>Ảnh layout tham khảo ({files.length}/8)</strong>{canManage&&<label className="elia-v5-upload"><ImagePlus size={16}/> Thêm ảnh<input type="file" hidden multiple accept="image/png,image/jpeg,image/webp" disabled={busy||files.length>=8} onChange={e=>void upload(e)}/></label>}</div><div className="elia-v5-photo-list">{files.map(f=><div className="elia-v5-photo-tile" key={f}><img src={view(f)} alt="Layout makeup"/>{canManage&&<button type="button" disabled={busy} onClick={()=>void remove(f)} aria-label="Xóa ảnh"><X size={15}/></button>}</div>)}</div>{error&&<p role="alert">{error}</p>}</div>;
}
export function EliaOperationsSchedules({user,role,module}:{user:User;role:OfficeRole;module:EliaModule}){
 const [rows,setRows]=useState<ModuleRecord[]>([]),[draft,setDraft]=useState<Record<string,any>>(empty(module)),[editing,setEditing]=useState<ModuleRecord|null>(null);
 const [formOpen,setFormOpen]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[search,setSearch]=useState('');
 const canManage=role==='admin'||role==='sale';const leader=role==='leader_decor'||role==='leader_makeup';
 const api=useCallback(async(method:string,url:string,payload?:object)=>{const r=await fetch(url,{method,cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});const j=await r.json();if(!r.ok)throw Error(j.error||'Không thể lưu dữ liệu');return j;},[user]);
 const load=useCallback(async()=>{setLoading(true);try{const value=await api('GET',`/api/elia-operations/${module}`);setRows(value.records||[]);}catch(e){setError(e instanceof Error?e.message:'Không thể tải danh sách');}finally{setLoading(false);}},[api,module]);
 useEffect(()=>{void load();setFormOpen(false);setEditing(null);setDraft(empty(module));},[load,module]);
 const openCreate=()=>{setEditing(null);setDraft(empty(module));setError('');setNotice('');setFormOpen(true);};
 const openEdit=(r:ModuleRecord)=>{setEditing(r);setDraft(JSON.parse(JSON.stringify(r)));setError('');setNotice('');setFormOpen(true);};
 const close=()=>{setEditing(null);setFormOpen(false);setDraft(empty(module));};
 const save=async(e:FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{
  let data:Record<string,unknown>=draft;
  if(leader){const keys=module==='decor'?['partyDate','installDate','pickupDate']:['makeupDate','makeupTime'];data=Object.fromEntries(keys.map(k=>[k,draft[k]]));}
  if(editing)await api('PATCH',`/api/elia-operations/${module}/${editing.id}`,{expectedUpdatedAt:editing.updatedAt,data});
  else await api('POST',`/api/elia-operations/${module}`,draft);
  close();setNotice('Đã lưu lịch thành công');await load();
 }catch(e){setError(e instanceof Error?e.message:'Lưu thất bại');}finally{setBusy(false);}};
 const del=async(r:ModuleRecord)=>{if(!window.confirm('Xóa lịch này?'))return;setBusy(true);setError('');try{await api('DELETE',`/api/elia-operations/${module}/${r.id}`);await load();setNotice('Đã xóa lịch');}catch(e){setError(e instanceof Error?e.message:'Không xóa được');}finally{setBusy(false);}};
 const set=(key:string,val:string)=>setDraft(d=>({...d,[key]:val}));
 const updateService=(key:string,field:string,val:string)=>setDraft(d=>({...d,services:{...d.services,[key]:{...d.services[key],[field]:val}}}));
 const toggleService=(key:string,yes:boolean)=>setDraft(d=>{const services={...d.services};if(yes)services[key]={date:dayNow(),time:'08:00',endDate:'',endTime:'',location:'',notes:''};else delete services[key];return {...d,services};});
 const fields=module==='decor'?decorFields:module==='makeup'?makeupFields:packageFields;
 const filtered=rows.filter(r=>JSON.stringify(r).toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 return <section className="elia-v5-scheduler"><div className="elia-v5-heading"><div><span className="eyebrow">ÉLIA · LỊCH DỊCH VỤ</span><h2>{titles[module]}</h2><p>{desc[module]}</p></div><div className="elia-v5-heading-actions"><button type="button" className="secondary-button" onClick={()=>void load()}><RefreshCw size={16}/> Làm mới</button>{canManage&&<button type="button" className="primary-button" onClick={openCreate}><Plus size={16}/> Thêm {module==='packages'?'gói':'lịch'}</button>}</div></div>
  {notice&&<p className="elia-v5-success" role="status"><Check size={16}/> {notice}</p>}{error&&<p className="elia-v5-error" role="alert">{error}</p>}
  <div className="elia-v5-filter"><label><span>Tìm lịch</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên khách / SĐT / dịch vụ"/></label><span>{filtered.length} mục</span></div>
  {formOpen&&<section className="elia-v5-form-card"><header><h3>{editing?'Chỉnh sửa':'Tạo mới'} {titles[module].toLowerCase()}</h3><button onClick={close} type="button" aria-label="Đóng"><X size={19}/></button></header><form onSubmit={e=>void save(e)}><div className="elia-v5-form-grid">{fields.filter(f=>canManage||['partyDate','installDate','pickupDate','makeupDate','makeupTime'].includes(f.key)).map(f=><label key={f.key} className={f.wide?'wide':''}>{f.name}{f.type==='textarea'?<textarea rows={3} maxLength={1500} value={String(draft[f.key]??'')} onChange={e=>set(f.key,e.target.value)}/>:<input required={f.required} type={f.type||'text'} min={f.type==='number'?'0':undefined} step={f.type==='number'?'1000':undefined} value={draft[f.key]??''} onChange={e=>set(f.key,e.target.value)}/>}</label>)}</div>
    {module==='decor'&&canManage&&<div className="elia-v5-price-line">Còn lại: <strong>{Math.max(0,Number(draft.price||0)-Number(draft.deposit||0)).toLocaleString('vi-VN')} đ</strong></div>}
    {module==='packages'&&<div className="elia-v5-services"><h4>Chọn dịch vụ trong gói</h4><p>Mỗi dịch vụ được nhập ngày/giờ riêng, không dùng chung ngày tiệc.</p>{Object.entries(serviceLabels).map(([key,label])=><div className="elia-v5-service" key={key}><label className="elia-v5-service-toggle"><input type="checkbox" checked={Boolean(draft.services?.[key])} onChange={e=>toggleService(key,e.target.checked)}/><strong>{label}</strong></label>{draft.services?.[key]&&<div className="elia-v5-form-grid">{[{field:'date',label:'Ngày thực hiện',type:'date'},{field:'time',label:'Giờ bắt đầu',type:'time'},{field:'endDate',label:'Ngày kết thúc / trả',type:'date'},{field:'endTime',label:'Giờ kết thúc',type:'time'},{field:'location',label:'Địa điểm',type:'text'},{field:'notes',label:'Ghi chú riêng',type:'text'}].map(f=><label key={f.field}>{f.label}<input type={f.type} required={f.field==='date'} value={draft.services[key][f.field]||''} onChange={e=>updateService(key,f.field,e.target.value)}/></label>)}</div>}</div>)}</div>}
    <div className="elia-v5-form-actions"><button type="submit" className="primary-button" disabled={busy}>{busy?'Đang lưu…':'Lưu thông tin'}</button><button type="button" className="secondary-button" onClick={close}>Hủy</button></div>
  </form></section>}
  {loading?<p>Đang tải dữ liệu…</p>:<div className="elia-v5-records">{filtered.map(r=><article className="elia-v5-record" key={r.id}><header><strong>{String(r.customerName||[r.brideName,r.groomName].filter(Boolean).join(' & ')||'Khách hàng')}</strong><div><button type="button" aria-label="Sửa lịch" onClick={()=>openEdit(r)}><SquarePen size={17}/></button>{canManage&&<button type="button" aria-label="Xóa lịch" disabled={busy} onClick={()=>void del(r)}><Trash2 size={17}/></button>}</div></header>
   <div className="elia-v5-record-metadata">{module==='decor'?<><span><CalendarDays size={14}/> Tiệc: {String(r.partyDate)}</span><span>Decor: {String(r.installDate)} → {String(r.pickupDate)}</span><span>Nhà dâu: {String(r.brideAddress||'—')}</span><span>Nhà rể: {String(r.groomAddress||'—')}</span><span>Liên hệ: {String(r.contactPhone||r.bridePhone||r.groomPhone||'—')}</span><span>Chi phí: {Number(r.price||0).toLocaleString('vi-VN')} đ · Cọc: {Number(r.deposit||0).toLocaleString('vi-VN')} đ · Còn: {Number(r.balance||0).toLocaleString('vi-VN')} đ</span></>:module==='makeup'?<><span><CalendarDays size={14}/> {String(r.makeupDate)} lúc {String(r.makeupTime)}</span><span>Liên hệ: {String(r.phone||'—')}</span><span>Layout: {String(r.layout||'—')}</span></>:<>{Object.entries((r.services||{}) as Record<string,any>).map(([key,v])=><span key={key}><CalendarDays size={14}/> {serviceLabels[key]}: {String(v.date||'—')} {String(v.time||'')}{v.endDate?` → ${v.endDate}`:''}</span>)}<span>Liên hệ: {String(r.contactPhone||r.bridePhone||r.groomPhone||'—')}</span></>}</div>
   {module==='makeup'&&<SchedulePhotos user={user} record={r} canManage={canManage} onRefresh={()=>void load()}/>}{Boolean(r.notes)&&<p>{String(r.notes)}</p>}
  </article>)}{!filtered.length&&<p className="elia-v5-muted">Chưa có lịch trong danh sách này.</p>}</div>}
  {module==='packages'&&<p className="elia-v5-muted">Các mốc dịch vụ trong gói được lưu làm kế hoạch chung. Hiện chưa tự động tạo lịch quay/chụp hoặc giữ mã trang phục; cần xác nhận tại lịch chuyên môn để tránh trùng lịch.</p>}
 </section>;
}
