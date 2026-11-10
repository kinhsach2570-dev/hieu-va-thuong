/* Shared public Supabase client. Tokens stay in memory, never in the repository. */
(() => {
  'use strict';
  const cfg=window.APP_CONFIG||{};
  const base=(cfg.supabaseUrl||'').trim().replace(/\/$/,'');
  const key=(cfg.supabaseKey||'').trim();
  const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u:null}catch{return null}};
  let unsafe=key.startsWith('sb_secret_');
  if(key.startsWith('eyJ')){try{unsafe=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role'}catch{unsafe=true}}
  const configured=!!(https(base)&&key&&!unsafe);
  let session=null, refreshPending=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function raw(path,options={}){
    if(!configured)throw Error(unsafe?'Cấu hình không hợp lệ: chỉ dùng publishable key hoặc anon key.':'Chưa kết nối Supabase. Điền cấu hình trong config.js trước.');
    const headers={apikey:key,...(session?.access_token?{Authorization:'Bearer '+session.access_token}:key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),...options.headers};
    const response=await fetch(base+path,{...options,headers});
    const data=await response.text();let result=null;try{result=data?JSON.parse(data):null}catch{}
    if(!response.ok){const error=Error(result?.message||result?.error_description||result?.msg||'Yêu cầu chưa thành công ('+response.status+').');error.status=response.status;throw error}
    return result;
  }
  async function refresh(){
    if(!session?.refresh_token)return;
    if(!refreshPending)refreshPending=(async()=>{
      try{const next=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});setSession(next)}
      catch(e){session=null;window.dispatchEvent(new Event('hvt-auth-lost'));throw Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')}
      finally{refreshPending=null}
    })();
    return refreshPending;
  }
  function setSession(next){session={...next,expires_at:next.expires_at||Math.floor(Date.now()/1000)+(next.expires_in||3600)}}
  async function api(path,options={}){if(session&&session.expires_at<Date.now()/1000+60)await refresh();return raw(path,options)}
  async function signIn(email,password){
    const result=await raw('/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});setSession(result);
    try{const membership=await api('/rest/v1/admins?select=user_id&user_id=eq.'+encodeURIComponent(result.user.id));if(!membership?.length)throw Error('Tài khoản này chưa được cấp quyền quản trị.');return result.user}
    catch(e){try{await raw('/auth/v1/logout',{method:'POST'})}catch{}session=null;throw e}
  }
  async function signOut(){try{if(session)await api('/auth/v1/logout',{method:'POST'})}finally{session=null}}
  async function resources(){let all=[],offset=0;while(true){const page=await api('/rest/v1/resources?select=*&order=created_at.desc,id.desc&limit=1000&offset='+offset);all.push(...page);if(page.length<1000)return all;offset+=page.length}}
  function publicFile(bucket,path){return path?base+'/storage/v1/object/public/'+bucket+'/'+path.split('/').map(encodeURIComponent).join('/'):''}
  function cover(item){return item.cover_path?publicFile('covers',item.cover_path):https(item.cover_url)?.href||''}
  function youtubeId(value){const u=https(value);if(!u)return '';let id='';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]}else if(u.hostname==='youtu.be')id=u.pathname.slice(1).split('/')[0];return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:''}
  function embed(value){const id=youtubeId(value);if(id)return 'https://www.youtube-nocookie.com/embed/'+id;const u=https(value);const v=u&&['vimeo.com','www.vimeo.com'].includes(u.hostname)&&u.pathname.match(/^\/(\d+)\/?$/);return v?'https://player.vimeo.com/video/'+v[1]:''}
  async function upload(bucket,blob,extension){const path=crypto.randomUUID()+'.'+extension;await api('/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{'Content-Type':blob.type,'x-upsert':'false'},body:blob});return path}
  async function removeFiles(bucket,paths){const prefixes=paths.filter(Boolean);if(prefixes.length)await api('/storage/v1/object/'+bucket,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes})})}
  async function imageFile(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Ảnh bìa chỉ nhận JPG, PNG hoặc WebP.');
    if(file.size>5*1024*1024)throw Error('Ảnh bìa tối đa 5 MB.');
    let image;try{image=await createImageBitmap(file)}catch{throw Error('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP khác.')}
    if(image.width*image.height>40000000){image.close();throw Error('Ảnh quá lớn. Vui lòng giảm kích thước ảnh trước khi tải lên.')}
    const canvas=document.createElement('canvas'),ratio=Math.min(1,1600/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f7f2';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob)throw Error('Chưa xử lý được ảnh bìa.');return blob;
  }
  window.HVT={configured,unsafe,base,esc,https,api,resources,signIn,signOut,publicFile,cover,youtubeId,embed,upload,removeFiles,imageFile,hasSession:()=>!!session};
})();
