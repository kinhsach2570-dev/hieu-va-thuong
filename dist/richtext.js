(() => {
'use strict';
const tags=['p','div','span','br','strong','b','em','i','u','h2','h3','blockquote','ul','ol','li','font'];
window.DOMPurify.addHook('uponSanitizeAttribute',(_node,data)=>{
 if(data.attrName!=='style')return;
 const css=document.createElement('span').style;css.cssText=data.attrValue;
 const out=[];
 if(css.color&&!/url|var\(|expression|[<>]/i.test(css.color))out.push('color:'+css.color);
 if(/^(left|center|right)$/.test(css.textAlign))out.push('text-align:'+css.textAlign);
 if(/^(bold|normal|[1-9]00)$/.test(css.fontWeight))out.push('font-weight:'+css.fontWeight);
 if(/^(italic|normal)$/.test(css.fontStyle))out.push('font-style:'+css.fontStyle);
 if(/^(underline|line-through|none)$/.test(css.textDecorationLine))out.push('text-decoration-line:'+css.textDecorationLine);
 if(!css.textDecorationLine&&/^(underline|line-through|none)$/.test(css.textDecoration))out.push('text-decoration:'+css.textDecoration);
 data.attrValue=out.join(';');if(!out.length)data.keepAttr=false;
});
function clean(html){return window.DOMPurify.sanitize(String(html||'').normalize('NFC'),{ALLOWED_TAGS:tags,ALLOWED_ATTR:['style','color'],ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,FORBID_TAGS:['style','script','svg','math','iframe','object','template','form']})}
function fromText(text){return String(text||'').split(/\n/).map(line=>'<p>'+window.HVT.esc(line||'')+'<br></p>').join('')}
function text(html){const div=document.createElement('div');div.innerHTML=clean(html);div.querySelectorAll('br').forEach(node=>node.replaceWith(document.createTextNode('\n')));div.querySelectorAll('p,div,h2,h3,li,blockquote').forEach(node=>node.append(document.createTextNode('\n')));return div.textContent.replace(/\u00a0/g,' ').trim()}
function mount(host,{label='Nội dung',onChange=()=>{}}={}){
 host.classList.add('rich-editor');
 host.innerHTML=`<div class="rich-toolbar" role="toolbar" aria-label="Định dạng ${window.HVT.esc(label)}"><button type="button" data-command="bold" aria-label="Chữ đậm" title="Đậm (Ctrl+B)"><b>B</b></button><button type="button" data-command="italic" aria-label="Chữ nghiêng" title="Nghiêng (Ctrl+I)"><i>I</i></button><button type="button" data-command="underline" aria-label="Gạch chân" title="Gạch chân (Ctrl+U)"><u>U</u></button><span class="toolbar-divider"></span><button type="button" data-command="justifyLeft" aria-label="Căn trái">Trái</button><button type="button" data-command="justifyCenter" aria-label="Căn giữa">Giữa</button><button type="button" data-command="justifyRight" aria-label="Căn phải">Phải</button><span class="toolbar-divider"></span><label class="color-label">Màu chữ<select aria-label="Màu chữ"><option value="#273d35">Mặc định</option value="#000000">Đen</option><option value="#a0342c">Đỏ</option><option value="#176337">Xanh lá</option><option value="#2055a0">Xanh dương</option><option value="#713888">Tím</option><option value="#ac581b">Cam</option><option value="#84652b">Vàng nâu</option></select></label><span class="toolbar-divider"></span><button type="button" data-command="undo" aria-label="Hoàn tác">↶</button><button type="button" data-command="redo" aria-label="Làm lại">↷</button><button type="button" data-command="removeFormat" aria-label="Xóa định dạng">Xóa định dạng</button></div><div class="rich-content" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${window.HVT.esc(label)}" spellcheck="false" data-placeholder="Nhập nội dung tại đây…"></div>`;
 const area=host.querySelector('.rich-content'),toolbar=host.querySelector('.rich-toolbar');let range=null,disabled=false;
 function remember(){const selection=window.getSelection();if(selection?.rangeCount&&area.contains(selection.anchorNode)&&area.contains(selection.focusNode))range=selection.getRangeAt(0).cloneRange()}
 function restore(){area.focus();const selection=window.getSelection();if(range&&area.contains(range.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(range)}}
 function changed(){remember();onChange();updateStates()}
 function command(cmd,value=null){if(disabled)return;restore();document.execCommand('styleWithCSS',false,true);document.execCommand(cmd,false,value);changed()}
 function updateStates(){toolbar.querySelectorAll('button[data-command]').forEach(btn=>{if(['bold','italic','underline','justifyLeft','justifyCenter','justifyRight'].includes(btn.dataset.command)){let active=false;try{active=document.queryCommandState(btn.dataset.command)}catch{}btn.setAttribute('aria-pressed',String(active))}})}
 toolbar.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault();remember()});toolbar.addEventListener('click',e=>{const btn=e.target.closest('[data-command]');if(btn)command(btn.dataset.command)});toolbar.querySelector('select').onchange=e=>command('foreColor',e.target.value);
 area.addEventListener('input',changed);area.addEventListener('keyup',()=>{remember();updateStates()});area.addEventListener('mouseup',()=>{remember();updateStates()});area.addEventListener('blur',remember);
 area.addEventListener('paste',e=>{e.preventDefault();if(disabled)return;const html=e.clipboardData.getData('text/html'),plain=e.clipboardData.getData('text/plain');document.execCommand('insertHTML',false,html?clean(html):fromText(plain));changed()});
 area.addEventListener('drop',e=>e.preventDefault());
 return{getHTML:()=>clean(area.innerHTML),getText:()=>text(area.innerHTML),setHTML:html=>{area.innerHTML=clean(html);range=null},setText:value=>{area.innerHTML=fromText(value);range=null},setDisabled:flag=>{disabled=flag;area.contentEditable=String(!flag);toolbar.querySelectorAll('button,select').forEach(el=>el.disabled=flag)},focus:()=>area.focus(),element:area};
}
window.HVTRich={clean,fromText,text,mount};
})();
