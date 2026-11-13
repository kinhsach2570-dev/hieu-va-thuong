(() => {
'use strict';
const c=window.HVT;
let active=null;
const userId=()=>c.currentUser?.()?.id;
const ratio=dialog=>Math.min(1,Math.max(0,dialog.scrollTop/Math.max(1,dialog.scrollHeight-dialog.clientHeight)));
function messageFor(error){return error.status===401?'Phiên đã hết hạn. Đăng nhập lại để lưu vị trí.':/reading_progress|schema cache|42P01/i.test(error.message)?'Chưa bật lưu vị trí đọc. Quản trị cần chạy upgrade-reading-progress.sql.':'Chưa lưu được vị trí. Kiểm tra kết nối rồi nhấn lưu lại.'}
async function attach({item,container,dialog,parts=[],selectSection,isCurrent}){
 if(item.kind==='video')return;
 const state={item,container,dialog,parts,selectSection,isCurrent,sectionId:parts[0]?.id||null,user:null,sequence:0,loading:false,changed:false,restoring:false};active=state;
 const box=document.createElement('section');box.className='reading-progress';
 box.innerHTML='<div class="progress-actions"><button type="button" class="button secondary" data-save-position>Lưu vị trí đang đọc</button>'+(item.file_path?'<label>Trang PDF đang đọc<input data-pdf-page type="number" min="1" max="99999" value="1" aria-label="Trang PDF đang đọc"></label>':'')+'</div><p role="status" class="hint" data-position-status></p>';
 container.prepend(box);
 state.box=box;
 const status=text=>box.querySelector('[data-position-status]').textContent=text;
 const pdf=box.querySelector('[data-pdf-page]');
 function pdfLink(page){const link=dialog.querySelector('[data-pdf-link]');if(link){link.href=link.href.split('#')[0]+'#page='+page}}
 if(pdf)pdf.oninput=()=>{if(pdf.checkValidity())pdfLink(Number(pdf.value))};
 function current(id,seq){return active===state&&isCurrent()&&userId()===id&&state.sequence===seq}
 state.refresh=async()=>{
  const id=userId(),seq=++state.sequence;state.user=id;
  box.querySelector('button').disabled=!id;
  status(id?'Nhấn “Lưu vị trí đang đọc” trước khi dừng.':'Đăng nhập thành viên để lưu vị trí và đọc tiếp trên thiết bị khác. Bạn vẫn đọc được toàn bộ nội dung.');
  if(!id)return;
  state.loading=true;state.changed=false;box.querySelector('button').disabled=true;
  try{
   const rows=await c.api('/rest/v1/reading_progress?select=section_id,scroll_ratio,pdf_page&resource_id=eq.'+encodeURIComponent(item.id)+'&user_id=eq.'+encodeURIComponent(id)+'&limit=1');
   if(!current(id,seq)||state.changed||!rows?.length)return;
   const saved=rows[0];
   if(saved.section_id){const n=parts.findIndex(p=>p.id===saved.section_id);if(n<0){status('Trang đã lưu hiện không còn công khai. Bạn đang đọc từ đầu.');return}state.restoring=true;selectSection(n);state.restoring=false}
   if(pdf){pdf.value=saved.pdf_page||1;pdfLink(saved.pdf_page||1)}
   status('Đã mở lại vị trí bạn lưu lần trước.'+(pdf?' PDF: trang '+pdf.value+'.':''));
   const restore=()=>{if(current(id,seq))dialog.scrollTop=Math.max(0,dialog.scrollHeight-dialog.clientHeight)*(Number(saved.scroll_ratio)||0)};
   requestAnimationFrame(restore);
   // Covers may finish loading after text: restore once their layout is available.
   dialog.querySelectorAll('img').forEach(img=>{if(!img.complete)img.addEventListener('load',restore,{once:true})});
  }catch(error){if(current(id,seq))status(messageFor(error))}
  finally{if(current(id,seq)){state.loading=false;box.querySelector('button').disabled=false}}
 };
 box.querySelector('button').onclick=async()=>{
  const id=userId(),seq=state.sequence;if(state.loading)return;if(!id){status('Đăng nhập thành viên để lưu vị trí.');return}
  if(pdf&&!pdf.checkValidity()){pdf.reportValidity();return}
  const button=box.querySelector('button');button.disabled=true;
  const record={user_id:id,resource_id:item.id,section_id:state.sectionId,scroll_ratio:ratio(dialog),pdf_page:pdf?Number(pdf.value):1};
  try{await c.api('/rest/v1/reading_progress?on_conflict=user_id,resource_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)});if(current(id,seq))status('Đã lưu vị trí. Lần mở sau sẽ tiếp tục từ đây.')}
  catch(error){if(current(id,seq))status(messageFor(error))}
  finally{if(current(id,seq))button.disabled=false}
 };
 await state.refresh();
}
window.HVTProgress={attach,section(id){if(active){if(active.loading&&!active.restoring)active.changed=true;active.sectionId=id}},close(){if(active)active.sequence++;active=null}};
for(const event of ['hvt-auth-change','hvt-auth-lost'])window.addEventListener(event,()=>{if(active?.isCurrent())active.refresh()});
})();
