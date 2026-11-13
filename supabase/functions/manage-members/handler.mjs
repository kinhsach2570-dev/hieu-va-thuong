/* Server-only. No service/secret key is sent to the browser. */
export function makeHandler({base,serviceKey,allowedOrigins,fetchImpl=fetch}) {
 const origins=new Set(allowedOrigins.map(v=>v.trim()).filter(Boolean));
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 return async request=>{
  const origin=request.headers.get('origin')||'';
  const cors={'Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(!base||!serviceKey)return reply({message:'Hàm quản lý thành viên chưa có cấu hình máy chủ.'},503);
  if(!origins.size)return reply({message:'Cần cấu hình ALLOWED_ORIGINS trong Secrets của Edge Function.'},503);
  if(!origins.has(origin))return reply({message:'Tên miền chưa được cho phép quản lý thành viên.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply({message:'Chỉ chấp nhận POST.'},405);
  const auth=request.headers.get('authorization')||'';
  if(!/^Bearer \S+$/.test(auth))return reply({message:'Vui lòng đăng nhập.'},401);
  async function api(path,{method='GET',body,headers={}}={}){
   const response=await fetchImpl(base+path,{method,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
   let data=null;try{data=await response.json()}catch{}
   if(!response.ok){const error=Error(data?.msg||data?.message||data?.error_description||'Supabase từ chối yêu cầu.');error.status=response.status;throw error}return data;
  }
  try{
   // Auth verifies the user JWT; decoded client claims alone are never trusted.
   const user=await api('/auth/v1/user',{headers:{Authorization:auth}});
   if(!uuid(user?.id))return reply({message:'Phiên đăng nhập không hợp lệ.'},401);
   const actor=user.id;
   const membership=await api('/rest/v1/admins?select=user_id&user_id=eq.'+actor);
   if(!membership?.length)return reply({message:'Chỉ quản trị viên được quản lý thành viên.'},403);
   const text=await request.text();if(text.length>16384)return reply({message:'Dữ liệu quá dài.'},413);
   let input;try{input=JSON.parse(text)}catch{return reply({message:'Dữ liệu không hợp lệ.'},400)}
   if(!input||typeof input!=='object'||Array.isArray(input))return reply({message:'Dữ liệu không hợp lệ.'},400);
   const {action}=input;
   const setRole=(id,enabled)=>api('/rest/v1/rpc/set_member_admin',{method:'POST',body:{p_actor:actor,p_target:id,p_enabled:enabled}});
   if(action==='list'){
    const page=Math.max(1,Math.min(10000,Math.floor(Number(input.page)||1)));
    const result=await api('/auth/v1/admin/users?page='+page+'&per_page=50');
    const users=result?.users||[];const ids=users.map(u=>u.id).filter(uuid);
    const admins=ids.length?await api('/rest/v1/admins?select=user_id&user_id=in.('+ids.join(',')+')'):[];
    const roles=new Set(admins.map(u=>u.user_id));
    return reply({actor,page,hasMore:users.length===50,users:users.map(u=>({id:u.id,email:u.email||'',name:u.user_metadata?.display_name||'',role:roles.has(u.id)?'admin':'member',created_at:u.created_at}))});
   }
   if(!['create','update','delete'].includes(action))return reply({message:'Thao tác không hợp lệ.'},400);
   if(action!=='create'&&!uuid(input.id))return reply({message:'Mã tài khoản không hợp lệ.'},400);
   if(action==='delete'){
    if(input.id===actor)return reply({message:'Không thể tự xóa tài khoản đang đăng nhập.'},400);
    if(input.confirm_email===undefined)return reply({message:'Cần xác nhận email tài khoản cần xóa.'},400);
    const target=await api('/auth/v1/admin/users/'+input.id);const account=target.user||target;
    if(String(input.confirm_email).toLowerCase()!==String(account.email||'').toLowerCase())return reply({message:'Email xác nhận chưa đúng.'},400);
    const wasAdmin=(await api('/rest/v1/admins?select=user_id&user_id=eq.'+input.id)).length>0;
    await setRole(input.id,false);
    try{await api('/auth/v1/admin/users/'+input.id,{method:'DELETE'})}catch(error){let restored=true;if(wasAdmin){try{await setRole(input.id,true)}catch{restored=false}}return reply({message:'Chưa xóa được tài khoản. '+(restored?error.message:'Quyền quản trị đã bị thu hồi; cần kiểm tra lại trong Supabase Dashboard.')},409)}
    return reply({ok:true});
   }
   const email=String(input.email||'').trim(),name=String(input.name||'').trim(),role=input.role;
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||name.length>150||!['admin','member'].includes(role))return reply({message:'Kiểm tra lại email, tên và vai trò.'},400);
   if(action==='update'&&input.id===actor&&role!=='admin')return reply({message:'Không thể tự thu hồi quyền quản trị của mình.'},400);
   const password=typeof input.password==='string'?input.password:'';
   if((action==='create'||password)&&(password.length<12||password.length>128))return reply({message:'Mật khẩu phải từ 12 đến 128 ký tự.'},400);
   if(action==='create'){
    const result=await api('/auth/v1/admin/users',{method:'POST',body:{email,password,email_confirm:true,user_metadata:{display_name:name}}});const account=result.user||result;
    try{await setRole(account.id,role==='admin')}catch(error){try{await api('/auth/v1/admin/users/'+account.id,{method:'DELETE'})}catch{ return reply({message:'Tài khoản đã tạo nhưng chưa đặt được vai trò. Kiểm tra Authentication và admins trong Supabase.'},409)}throw error}
    return reply({ok:true,id:account.id});
   }
   const previous=await api('/auth/v1/admin/users/'+input.id);const account=previous.user||previous;
   await api('/auth/v1/admin/users/'+input.id,{method:'PUT',body:{email,...(email!==account.email?{email_confirm:true}:{}),user_metadata:{...(account.user_metadata||{}),display_name:name},...(password?{password}:{})}});
   try{await setRole(input.id,role==='admin')}catch(error){return reply({message:'Thông tin tài khoản đã cập nhật nhưng vai trò chưa đổi: '+error.message},409)}
   return reply({ok:true});
  }catch(error){return reply({message:error.status===401?'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.':error.message||'Không thực hiện được yêu cầu.'},error.status===401?401:error.status===403?403:400)}
 };
}
