'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';

type Comment={name:string;text:string;createdAt:number;updatedAt:number};
type CommentMap=Record<string,Comment>;
const headers=(token:string)=>({'Content-Type':'application/json','x-amorri-delivery-token':token});

/** Fetch feedback for one product once. Edits replace the one stored comment per image. */
export function usePhotoFeedback(eventId:string,productId:string,token:string){
  const [comments,setComments]=useState<CommentMap>({});
  const [error,setError]=useState('');
  const endpoint=`/api/delivery/${encodeURIComponent(eventId)}/photo-comments`;
  useEffect(()=>{
    if(!token)return;let active=true;
    void (async()=>{
      try{
        const response=await fetch(`${endpoint}?productId=${encodeURIComponent(productId)}`,{headers:{'x-amorri-delivery-token':token},cache:'no-store'});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'Không tải được góp ý ảnh');
        if(active)setComments(data.comments||{});
      }catch(err){if(active)setError(err instanceof Error?err.message:'Không tải được góp ý ảnh');}
    })();
    return ()=>{active=false;};
  },[endpoint,productId,token]);
  const save=useCallback(async(mediaId:string,text:string)=>{
    const response=await fetch(endpoint,{method:'PUT',headers:headers(token),cache:'no-store',body:JSON.stringify({productId,mediaId,text})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Không lưu được góp ý ảnh');
    setComments(current=>({...current,[mediaId]:data.comment}));setError('');
  },[endpoint,productId,token]);
  const remove=useCallback(async(mediaId:string)=>{
    const response=await fetch(endpoint,{method:'DELETE',headers:headers(token),cache:'no-store',body:JSON.stringify({productId,mediaId})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Không xóa được góp ý ảnh');
    setComments(current=>{const next={...current};delete next[mediaId];return next;});setError('');
  },[endpoint,productId,token]);
  return {comments,save,remove,error};
}

/** One-line photo feedback that grows only as the customer types more text.
 * Existing feedback stays editable in the same field; clearing it offers Delete. */
export function PhotoCommentCard({fileName,comment,onSave,onDelete}:{fileName:string;comment?:Comment;onSave:(text:string)=>Promise<void>;onDelete:()=>Promise<void>}){
  const [draft,setDraft]=useState(comment?.text||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const fieldRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{setDraft(comment?.text||'');},[comment?.text]);
  useEffect(()=>{
    const field=fieldRef.current;
    if(!field)return;
    field.style.height='auto';
    const height=Math.min(field.scrollHeight,280);
    field.style.height=`${height}px`;
    field.style.overflowY=field.scrollHeight>280?'auto':'hidden';
  },[draft]);

  const clearing=!!comment&&!draft.trim();
  const unchanged=!!comment&&draft.trim()===comment.text;
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy||unchanged||(!draft.trim()&&!comment))return;
    if(clearing&&!window.confirm(`Xóa góp ý của ảnh "${fileName}"?`))return;
    setBusy(true);setError('');
    try{
      if(clearing){await onDelete();setDraft('');}
      else await onSave(draft.trim());
    }catch(err){setError(err instanceof Error?err.message:'Không lưu được góp ý ảnh');}
    finally{setBusy(false);}
  }
  return <section className="delivery-photo-feedback" aria-label={`Góp ý ảnh ${fileName}`}>
    <form className="delivery-photo-feedback-form" onSubmit={submit}>
      <textarea ref={fieldRef} aria-label={`Nội dung góp ý ảnh ${fileName}`} rows={1} maxLength={1200}
        placeholder="Góp ý cho ảnh…" value={draft} disabled={busy}
        onChange={e=>{setDraft(e.target.value);if(error)setError('');}}/>
      <button type="submit" className={`delivery-photo-feedback-send${clearing?' is-delete':''}`}
        disabled={busy||unchanged||(!draft.trim()&&!comment)}>
        {busy?'Đang gửi…':clearing?'Xóa':'Gửi'}
      </button>
    </form>
    {error&&<p className="delivery-photo-feedback-error" role="alert">{error}</p>}
  </section>;
}
