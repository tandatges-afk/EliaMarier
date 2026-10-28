'use client';

import {useCallback, useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import type {User} from 'firebase/auth';
import {
  Archive, Check, CircleAlert, Folder, FolderPlus, LayoutGrid,
  LoaderCircle, PackageOpen, Plus, RefreshCw, RotateCcw,
  Search, Shirt, SquarePen, Trash2, X,
} from 'lucide-react';
import type {WeddingFolder, WeddingItem} from '@/lib/domain/wedding-rental';
import './wedding-catalog-luxe.css';

type Draft = {code: string; kind: 'wedding_dress'|'outfit'; folderId: string};
type CatalogResponse = {items: WeddingItem[]};
type FoldersResponse = {folders: WeddingFolder[]};
const emptyDraft = (): Draft => ({code:'',kind:'wedding_dress',folderId:''});

function readableFailure(status:number, contentType:string, body:unknown, endpoint:string):string {
  if(status===404) return `Chưa tìm thấy API ${endpoint} trên Vercel (404). Hãy push đủ thư mục app/api/wedding-wardrobe và deploy lại.`;
  if(contentType.includes('application/json') && body && typeof body==='object' && 'error' in body && typeof body.error==='string') return body.error;
  if(status===401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if(status===403) return 'Tài khoản không có quyền thực hiện thao tác này.';
  return `Không thể kết nối dữ liệu kho trang phục (HTTP ${status}).`;
}

export function WeddingCatalogManager({user}:{user:User}) {
  const [items,setItems] = useState<WeddingItem[]>([]);
  const [folders,setFolders] = useState<WeddingFolder[]>([]);
  const [folderFilter,setFolderFilter] = useState('all');
  const [query,setQuery] = useState('');
  const [draft,setDraft] = useState<Draft>(emptyDraft);
  const [editing,setEditing] = useState<WeddingItem|null>(null);
  const [showEditor,setShowEditor] = useState(false);
  const [folderName,setFolderName] = useState('');
  const [editingFolder,setEditingFolder] = useState<WeddingFolder|null>(null);
  const [showFolderEditor,setShowFolderEditor] = useState(false);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const codeInput = useRef<HTMLInputElement>(null);

  const call = useCallback(async<T,>(endpoint:string, options:RequestInit = {}):Promise<T> => {
    const send = async(refresh:boolean) => fetch(endpoint, {
      ...options, cache:'no-store',
      headers:{'Content-Type':'application/json',...options.headers, Authorization:`Bearer ${await user.getIdToken(refresh)}`},
    });
    let response = await send(false);
    if(response.status===401) response=await send(true);
    const contentType = response.headers.get('content-type') || '';
    let body:unknown = null;
    if(contentType.includes('application/json')) {
      try {body=await response.json();} catch { /* invalid JSON -> friendly error below */ }
    }
    if(!response.ok || !contentType.includes('application/json') || !body) {
      throw new Error(readableFailure(response.status, contentType, body, endpoint));
    }
    return body as T;
  },[user]);

  const reload = useCallback(async() => {
    setLoading(true);
    setError('');
    const responses = await Promise.allSettled([
      call<CatalogResponse>('/api/wedding-wardrobe/items'),
      call<FoldersResponse>('/api/wedding-wardrobe/folders'),
    ] as const);
    if(responses[0].status==='fulfilled') setItems(responses[0].value.items||[]);
    if(responses[1].status==='fulfilled') setFolders(responses[1].value.folders||[]);
    const errors=responses.filter(r=>r.status==='rejected').map(r=>r.reason instanceof Error?r.reason.message:'Không tải được dữ liệu');
    if(errors.length) setError(errors.join(' '));
    setLoading(false);
  },[call]);

  useEffect(()=>{void reload();},[reload]);
  useEffect(()=>{if(showEditor)codeInput.current?.focus();},[showEditor,editing]);

  const countFor = useCallback((id:string)=>items.filter(i=>id==='all'||(id==='none'?!i.folderId:i.folderId===id)).length,[items]);
  const visible = useMemo(()=>items.filter(item=>{
    const matchingFolder=folderFilter==='all'||(folderFilter==='none'?!item.folderId:item.folderId===folderFilter);
    const matchingSearch=`${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
    return matchingFolder&&matchingSearch;
  }),[items,folderFilter,query]);
  const activeCount=items.filter(i=>i.active).length;

  const openCreate=()=>{setDraft({...emptyDraft(),folderId:folderFilter==='all'||folderFilter==='none'?'':folderFilter});setEditing(null);setShowEditor(true);setError('');};
  const openEdit=(item:WeddingItem)=>{setDraft({code:item.code,kind:item.kind,folderId:item.folderId||''});setEditing(item);setShowEditor(true);setError('');};
  const closeEditor=()=>{setDraft(emptyDraft());setEditing(null);setShowEditor(false);};
  const openFolder=(folder:WeddingFolder|null)=>{setEditingFolder(folder);setFolderName(folder?.name||'');setShowFolderEditor(true);setError('');};

  const saveItem=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      const code=draft.code.trim();
      const payload=editing?{code,kind:draft.kind,folderId:draft.folderId,name:editing.name===editing.code?code:editing.name}:{code,kind:draft.kind,folderId:draft.folderId};
      await call(`/api/wedding-wardrobe/items${editing?`/${editing.id}`:''}`,{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});
      closeEditor();setNotice(editing?'Đã cập nhật mã trang phục.':'Đã thêm mã trang phục mới.');
      await reload();
    } catch(err) {setError(err instanceof Error?err.message:'Không lưu được mã trang phục.');}
    finally {setBusy(false);}
  };
  const saveFolder=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(busy)return;
    setBusy(true);setError('');setNotice('');
    try {
      await call(`/api/wedding-wardrobe/folders${editingFolder?`/${editingFolder.id}`:''}`,{method:editingFolder?'PATCH':'POST',body:JSON.stringify({name:folderName.trim()})});
      setShowFolderEditor(false);setEditingFolder(null);setFolderName('');
      setNotice(editingFolder?'Đã đổi tên thư mục.':'Đã tạo thư mục mới.');
      await reload();
    } catch(err) {setError(err instanceof Error?err.message:'Không lưu được thư mục.');}
    finally {setBusy(false);}
  };
  const changeItem=async(item:WeddingItem, action:'toggle'|'delete')=>{
    if(busy)return;
    const confirmation=action==='toggle'?(item.active?`Ngừng nhận lịch mới cho ${item.code}?`:`Mở lại ${item.code} để nhận lịch?`):`Xóa mã ${item.code}? Mã đã có lịch sử thuê sẽ không thể xóa.`;
    if(!window.confirm(confirmation))return;
    setBusy(true);setError('');setNotice('');
    try {
      await call(`/api/wedding-wardrobe/items/${item.id}`,action==='delete'?{method:'DELETE'}:{method:'PATCH',body:JSON.stringify({active:!item.active})});
      setNotice(action==='delete'?'Đã xóa mã trang phục.':'Đã cập nhật trạng thái mã.');
      await reload();
    } catch(err) {setError(err instanceof Error?err.message:'Không thể cập nhật mã trang phục.');}
    finally {setBusy(false);}
  };
  const deleteFolder=async(folder:WeddingFolder)=>{
    if(busy||!window.confirm(`Xóa thư mục “${folder.name}”? Hãy chuyển các mã trong thư mục ra trước.`))return;
    setBusy(true);setError('');setNotice('');
    try {
      await call(`/api/wedding-wardrobe/folders/${folder.id}`,{method:'DELETE'});
      if(folderFilter===folder.id)setFolderFilter('all');
      setNotice('Đã xóa thư mục.');await reload();
    } catch(err){setError(err instanceof Error?err.message:'Không thể xóa thư mục.');}
    finally {setBusy(false);}
  };

  return <section className="elia-wardrobe-admin" aria-label="Quản lý kho trang phục Élia Marier">

    <div className="ewc-overview" aria-label="Tổng quan kho trang phục">
      <div className="ewc-stat"><span>MÃ TRANG PHỤC</span><strong>{items.length}</strong><small>Tổng mã trong kho</small></div>
      <div className="ewc-stat"><span>ĐANG NHẬN LỊCH</span><strong>{activeCount}</strong><small>Mã đang hoạt động</small></div>
      <div className="ewc-stat"><span>THƯ MỤC</span><strong>{folders.length}</strong><small>Nhóm quản lý</small></div>
    </div>

    {error&&<div className="ewc-alert ewc-alert-error" role="alert"><CircleAlert size={18}/><span>{error}</span><button type="button" onClick={()=>void reload()}>Thử lại</button></div>}
    {notice&&<div className="ewc-alert ewc-alert-success" role="status"><Check size={18}/><span>{notice}</span><button type="button" onClick={()=>setNotice('')} aria-label="Đóng thông báo"><X size={16}/></button></div>}

    <div className="ewc-workspace">
      <aside className="ewc-sidebar" aria-label="Danh sách thư mục">
        <div className="ewc-sidebar-head"><div><span className="ewc-eyebrow">COLLECTIONS</span><h3>Thư mục</h3></div><button type="button" title="Thêm thư mục" aria-label="Thêm thư mục" onClick={()=>openFolder(null)}><FolderPlus size={18}/></button></div>
        <nav className="ewc-folder-nav" aria-label="Lọc mã trang phục theo thư mục">
          <button type="button" className={`ewc-folder-item ${folderFilter==='all'?'is-active':''}`} onClick={()=>setFolderFilter('all')}><LayoutGrid size={17}/><span>Tất cả trang phục</span><small>{countFor('all')}</small></button>
          <button type="button" className={`ewc-folder-item ${folderFilter==='none'?'is-active':''}`} onClick={()=>setFolderFilter('none')}><Folder size={17}/><span>Chưa phân loại</span><small>{countFor('none')}</small></button>
          {folders.length>0&&<div className="ewc-folder-divider"/>}
          {folders.map(folder=><div className="ewc-folder-entry" key={folder.id}>
            <button type="button" className={`ewc-folder-item ${folderFilter===folder.id?'is-active':''}`} onClick={()=>setFolderFilter(folder.id)}><Folder size={17}/><span title={folder.name}>{folder.name}</span><small>{countFor(folder.id)}</small></button>
            <div className="ewc-folder-tools"><button type="button" title={`Đổi tên ${folder.name}`} aria-label={`Đổi tên thư mục ${folder.name}`} onClick={()=>openFolder(folder)}><SquarePen size={14}/></button><button type="button" title={`Xóa ${folder.name}`} aria-label={`Xóa thư mục ${folder.name}`} onClick={()=>void deleteFolder(folder)} disabled={busy}><Trash2 size={14}/></button></div>
          </div>)}
        </nav>
        {showFolderEditor&&<form className="ewc-folder-editor" onSubmit={e=>void saveFolder(e)}>
          <label htmlFor="elia-folder-name">{editingFolder?'Đổi tên thư mục':'Thêm thư mục mới'}</label>
          <input id="elia-folder-name" maxLength={60} required placeholder="Ví dụ: Váy cưới trắng" value={folderName} onChange={e=>setFolderName(e.target.value)}/>
          <div className="ewc-folder-editor-actions"><button disabled={busy||!folderName.trim()} className="ewc-primary" type="submit">{busy?<LoaderCircle className="ewc-spinning" size={15}/>:<Check size={15}/>} Lưu</button><button className="ewc-subtle" type="button" onClick={()=>setShowFolderEditor(false)}>Hủy</button></div>
        </form>}
        <div className="ewc-sidebar-foot"><Shirt size={16}/><span>Trang phục được liên kết tự động với Lịch váy cưới.</span></div>
      </aside>

      <div className="ewc-content">
        <div className="ewc-toolbar">
          <div className="ewc-toolbar-title"><span className="ewc-eyebrow">WARDROBE INVENTORY</span><h3>Danh sách mã <small>{visible.length}</small></h3></div>
          <div className="ewc-toolbar-actions"><button type="button" className="ewc-refresh" onClick={()=>void reload()} disabled={loading||busy} aria-label="Làm mới kho trang phục" title="Làm mới"><RefreshCw size={17} className={loading?'ewc-spinning':''}/></button><label className="ewc-search"><Search size={18}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm nhanh theo mã…" aria-label="Tìm mã trang phục"/></label><button type="button" className="ewc-primary ewc-add-button" onClick={openCreate} disabled={busy}><Plus size={18}/> Thêm mã</button></div>
        </div>

        {showEditor&&<div className="ewc-add-panel"><div className="ewc-add-panel-header"><div><span className="ewc-eyebrow">QUẢN LÝ DANH MỤC</span><h4>{editing?'Chỉnh sửa mã trang phục':'Thêm mã trang phục'}</h4></div><button type="button" onClick={closeEditor} title="Đóng" aria-label="Đóng biểu mẫu"><X size={19}/></button></div>
          <form className="ewc-add-form" onSubmit={e=>void saveItem(e)}>
            <label>Mã trang phục <span>*</span><input ref={codeInput} required maxLength={36} value={draft.code} placeholder="VD: VC-001" onChange={e=>setDraft(d=>({...d,code:e.target.value}))}/></label>
            <label>Phân loại<select value={draft.kind} onChange={e=>setDraft(d=>({...d,kind:e.target.value as Draft['kind']}))}><option value="wedding_dress">Váy cưới</option><option value="outfit">Trang phục khác</option></select></label>
            <label>Thư mục<select value={draft.folderId} onChange={e=>setDraft(d=>({...d,folderId:e.target.value}))}><option value="">Chưa phân loại</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <div className="ewc-form-footer"><p>Không cần hình ảnh hoặc mô tả. Mỗi mã được kiểm tra trùng trước khi lưu.</p><div><button type="button" className="ewc-subtle" onClick={closeEditor}>Hủy</button><button type="submit" className="ewc-primary" disabled={busy||!draft.code.trim()}>{busy?<LoaderCircle size={16} className="ewc-spinning"/>:<Check size={16}/>} {editing?'Lưu thay đổi':'Thêm vào kho'}</button></div></div>
          </form>
        </div>}

        <div className="ewc-table" role="table" aria-label="Mã trang phục">
          <div className="ewc-table-head" role="row"><span role="columnheader">MÃ TRANG PHỤC</span><span role="columnheader">THƯ MỤC / LOẠI</span><span role="columnheader">TRẠNG THÁI</span><span role="columnheader">THAO TÁC</span></div>
          {visible.map(item=><div role="row" className="ewc-table-row" key={item.id}>
            <div role="cell" className="ewc-code-cell"><span className="ewc-item-icon"><Shirt size={19}/></span><div><strong>{item.code}</strong>{item.name!==item.code&&<small>{item.name}</small>}</div></div>
            <div role="cell" className="ewc-meta-cell"><b>{folders.find(f=>f.id===item.folderId)?.name||'Chưa phân loại'}</b><small>{item.kind==='wedding_dress'?'Váy cưới':'Trang phục khác'}</small></div>
            <div role="cell"><span className={`ewc-status ${item.active?'is-active':'is-paused'}`}><span className="ewc-status-dot"/>{item.active?'Đang nhận lịch':'Tạm ngừng'}</span></div>
            <div role="cell" className="ewc-row-actions"><button type="button" onClick={()=>openEdit(item)} title="Sửa mã" aria-label={`Sửa mã ${item.code}`}><SquarePen size={17}/></button><button type="button" onClick={()=>void changeItem(item,'toggle')} disabled={busy} title={item.active?'Ngừng nhận lịch':'Mở lại'} aria-label={`${item.active?'Ngừng nhận lịch':'Mở lại'} ${item.code}`}>{item.active?<Archive size={17}/>:<RotateCcw size={17}/>}</button><button className="is-danger" type="button" onClick={()=>void changeItem(item,'delete')} disabled={busy} title="Xóa mã" aria-label={`Xóa mã ${item.code}`}><Trash2 size={17}/></button></div>
          </div>)}
          {!visible.length&&<div className="ewc-table-empty"><div className="ewc-empty-icon">{loading?<LoaderCircle size={24} className="ewc-spinning"/>:<PackageOpen size={24}/>}</div><strong>{loading?'Đang tải danh mục…':items.length?'Không tìm thấy mã phù hợp':'Kho trang phục chưa có mã nào'}</strong><p>{items.length?'Thử đổi từ khóa hoặc chọn thư mục khác.':'Bắt đầu bằng cách thêm một mã trang phục đầu tiên.'}</p>{!loading&&!items.length&&<button type="button" className="ewc-primary" onClick={openCreate}><Plus size={16}/> Thêm mã đầu tiên</button>}</div>}
        </div>
        <footer className="ewc-content-footer"><span>{visible.length} mã đang hiển thị</span><span>Quản lý riêng tư · Élia Marier</span></footer>
      </div>
    </div>
  </section>;
}
