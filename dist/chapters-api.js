(() => {
'use strict';
const c=window.HVT;
async function list(path){let result=[],offset=0;while(true){const page=await c.api(path+'&limit=1000&offset='+offset);result.push(...page);if(page.length<1000)return result;offset+=page.length}}
const publicSections=resourceId=>list('/rest/v1/published_sections?select=*&resource_id=eq.'+encodeURIComponent(resourceId)+'&order=number.asc,label.asc');
const drafts=resourceId=>list('/rest/v1/section_drafts?select=*&resource_id=eq.'+encodeURIComponent(resourceId)+'&order=number.asc,label.asc');
const rpc=async(name,body)=>{const result=await c.api('/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return Array.isArray(result)?result[0]:result};
window.HVTSections={publicSections,drafts,
 save:record=>rpc('save_section_draft',{p_id:record.id,p_resource_id:record.resource_id,p_label:record.label,p_number:Number(record.number),p_title:record.title,p_body_html:record.body_html,p_expected_version:record.version||0}),
 publish:record=>rpc('publish_section',{p_id:record.id,p_expected_version:record.version}),
 unpublish:id=>c.api('/rest/v1/published_sections?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=representation'}}),
 remove:id=>c.api('/rest/v1/section_drafts?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=representation'}})
};
})();
