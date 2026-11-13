/* Gentle, local word alignment. Source records and the member's manuscript are never changed. */
(() => {
'use strict';
const normal=s=>s.normalize('NFC').toLocaleLowerCase('vi').replace(/[\u200b-\u200d\ufeff]/g,'');
function words(text){return Array.from(text.matchAll(/[\p{L}\p{M}\p{N}]+/gu),m=>({value:normal(m[0]),label:m[0],start:m.index,end:m.index+m[0].length}))}
// Prefix alignment with a bounded edit-distance band: an omitted/extra word no
// longer shifts the remainder. Future, untyped source words are left unmarked.
function compare(source,typed){
 const a=words(source),b=words(typed),m=b.length,B=64,W=B*2+1,INF=1e9,n=Math.min(a.length,m+B),rows=[];let prev=new Float64Array(W).fill(INF);
 for(let j=0;j<=Math.min(n,B);j++)prev[j+B]=j*3;
 const unfinished=/[\p{L}\p{M}\p{N}]$/u.test(typed);
 for(let i=1;i<=m;i++){
  const row=new Uint8Array(W),curr=new Float64Array(W).fill(INF);rows.push(row);
  for(let j=Math.max(0,i-B);j<=Math.min(n,i+B);j++){
   const k=j-i+B;let best=INF,op=0;
   if(j>0){const exact=a[j-1].value===b[i-1].value,partial=i===m&&unfinished&&a[j-1].value.startsWith(b[i-1].value);best=prev[k]+(exact||partial?0:2);op=1}
   if(k+1<W&&prev[k+1]+3<best){best=prev[k+1]+3;op=2}
   if(k>0&&curr[k-1]+3<best){best=curr[k-1]+3;op=3}
   curr[k]=best;row[k]=op;
  }prev=curr;
 }
 let j=0,best=INF;for(let end=Math.max(0,m-B);end<=n;end++){const cost=prev[end-m+B];if(cost<best){best=cost;j=end}}
 const consumed=j,marks=[],issues=[];let i=m,count=0,partial=false;
 while(i>0||j>0){if(i===0){issues.push({kind:'missing',source:a[j-1].label,start:a[j-1].start,end:a[j-1].end});marks.push({...a[j-1],state:'review'});j--;continue}
  const op=rows[i-1]?.[j-i+B];if(!op)break;
  if(op===1){const s=a[j-1],t=b[i-1],same=s.value===t.value,isPartial=!same&&i===m&&unfinished&&s.value.startsWith(t.value);if(same){count++;marks.push({...s,state:'done'})}else if(isPartial){partial=true;marks.push({...s,state:'current'})}else{marks.push({...s,state:'review'});issues.push({kind:'different',source:s.label,typed:t.label,start:s.start,end:s.end})}i--;j--}
  else if(op===2){issues.push({kind:'extra',typed:b[i-1].label,start:j?a[j-1].end:0,end:j?a[j-1].end:0});i--}
  else{const s=a[j-1];marks.push({...s,state:'review'});issues.push({kind:'missing',source:s.label,start:s.start,end:s.end});j--}
 }
 marks.sort((x,y)=>x.start-y.start);issues.reverse();const end=consumed?a[consumed-1].end:0;
 return{marks,issues,count,total:a.length,typed:m,end,partial,mismatch:issues.length>0,complete:a.length>0&&count===a.length&&!issues.length&&!partial,uncertain:m>0&&(count<Math.min(3,m)&&issues.length>2||best>=INF)};
}
// Keep block boundaries in the comparison text without changing the source DOM.
function sourceMap(root){let text='',nodes=[];const block=/^(P|DIV|H[1-6]|LI|BLOCKQUOTE|TR)$/;function visit(node){if(node.nodeType===3){const start=text.length;text+=node.data;nodes.push({node,start,end:text.length});return}if(node.nodeType!==1)return;if(node.tagName==='BR'){text+='\n';return}const boundary=block.test(node.tagName);if(boundary&&text&&!text.endsWith('\n'))text+='\n';for(const child of node.childNodes)visit(child);if(boundary&&!text.endsWith('\n'))text+='\n'}for(const child of root.childNodes)visit(child);return{text,nodes}}
function sentence(text,end){const pos=Math.max(0,end-1);let start=pos;while(start>0&&!/[.!?。！？\n]/u.test(text[start-1]))start--;let finish=end;while(finish<text.length&&!/[.!?。！？\n]/u.test(text[finish]))finish++;return text.slice(start,Math.min(finish+1,start+160)).trim()}
function mount(host,getText){
 let root=null,original='',text='',composing=false,lastEnd=-1;const status=document.createElement('p');status.id='copyGuideStatus';status.className='copy-guide-status';status.setAttribute('aria-live','off');host.before(status);
 const controls=document.createElement('label');controls.className='copy-guide-follow';const follow=document.createElement('input');follow.type='checkbox';follow.checked=true;controls.append(follow,' Tự cuộn Kinh mẫu theo nét chép');status.before(controls);
 const review=document.createElement('details');review.className='copy-guide-review';review.hidden=true;const summary=document.createElement('summary'),list=document.createElement('ul');review.append(summary,list);host.before(review);
 function update(){if(!root||composing)return;const oldScroll=host.scrollTop,result=compare(text,getText());root.innerHTML=original;const mapped=sourceMap(root);let last=null,mi=0;
 for(const entry of mapped.nodes){while(mi<result.marks.length&&result.marks[mi].end<=entry.start)mi++;const overlaps=[];for(let k=mi;k<result.marks.length&&result.marks[k].start<entry.end;k++){const mark=result.marks[k];if(mark.end>entry.start)overlaps.push(mark)}if(!overlaps.length)continue;const fragment=document.createDocumentFragment();let pos=0;for(const item of overlaps){const start=Math.max(0,item.start-entry.start),end=Math.min(entry.node.data.length,item.end-entry.start);if(start>pos)fragment.append(document.createTextNode(entry.node.data.slice(pos,start)));const mark=document.createElement('mark');mark.className='copy-guide-'+item.state;mark.textContent=entry.node.data.slice(start,end);if(item.state==='review')mark.title='Có thể cần xem lại từ này';fragment.append(mark);pos=end;last=mark}fragment.append(document.createTextNode(entry.node.data.slice(pos)));entry.node.replaceWith(fragment)}
 status.classList.remove('needs-review');status.textContent=!result.total?'Bản mẫu này chưa có văn bản để dò.':!result.typed?'Chép từng câu, theo nhịp của bạn. Chữ đã khớp sẽ in đậm và tô vàng.':result.uncertain?'Bạn cứ tiếp tục chép. Bộ dò đang tìm lại vị trí trong Kinh mẫu.':result.complete?'Bạn đã chép đến cuối bản mẫu. Có thể lưu và tiếp tục trang mới.':'Bạn đang chép đến: “'+sentence(text,result.end)+'”';
 review.hidden=!result.issues.length;summary.textContent=result.issues.length+' chỗ có thể xem lại khi thuận tiện';list.replaceChildren();for(const issue of result.issues.slice(0,12)){const li=document.createElement('li');li.textContent=issue.kind==='different'?'Bản mẫu: “'+issue.source+'” · Bạn chép: “'+issue.typed+'”':issue.kind==='missing'?'Có thể còn thiếu: “'+issue.source+'”':'Có thể có từ thêm: “'+issue.typed+'”';list.append(li)}if(result.issues.length>12){const li=document.createElement('li');li.textContent='Và '+(result.issues.length-12)+' chỗ khác; hãy đối chiếu lại đoạn chép.';list.append(li)}
 host.scrollTop=oldScroll;if(follow.checked&&last&&!result.uncertain&&result.end!==lastEnd){const r=last.getBoundingClientRect(),h=host.getBoundingClientRect();if(r.bottom>h.bottom-45||r.top<h.top+25)host.scrollTop+=r.top-h.top-host.clientHeight*.45}lastEnd=result.end;
 }
 return{source(element){root=element;original=root.innerHTML;text=sourceMap(root).text;lastEnd=-1;update()},update,composition(active){composing=active;if(!active)update()}};
}
window.HVTCopyGuide={compare,mount};
})();
