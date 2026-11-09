const CODE128=["212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112"];
'use strict';
const $=id=>document.getElementById(id);
const state={pages:[],current:0,name:'etiquetas',source:'',dpi:203};
const MM_DOTS=203/25.4;
const info=(msg,type='')=>{$('status').textContent=msg;$('status').className='status '+type};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function decodeField(raw,indicator='_'){
 // ZPL ^FH: hex bytes may include UTF-8 multi-byte sequences such as _C3_A3.
 const bytes=[];
 for(let i=0;i<raw.length;i++){
   if(raw[i]===indicator&&/^[a-fA-F0-9]{2}$/.test(raw.slice(i+1,i+3))){bytes.push(parseInt(raw.slice(i+1,i+3),16));i+=2;}
   else {const cp=raw.codePointAt(i);if(cp>127){bytes.push(...new TextEncoder().encode(String.fromCodePoint(cp)));if(cp>65535)i++;}else bytes.push(cp);}
 }
 return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}
function parseZPL(source){
 const blocks=[...source.matchAll(/\^XA([\s\S]*?)\^XZ/gi)].map(m=>m[1]);
 if(!blocks.length)throw Error('Nenhuma etiqueta ^XA ... ^XZ encontrada.');
 const labels=[];let total=0;const warnings=[];
 for(let bi=0;bi<blocks.length;bi++){
  const commands=[...blocks[bi].matchAll(/\^([A-Z@~0-9]{1,2})([^\^~]*)/gi)].map(m=>({cmd:m[1].toUpperCase(),arg:m[2]}));
  const fields=[];let x=0,y=0,origin='FO',fontH=30,fontW=25,barcodeHeight=80,barcodeWidth=2,barcodeHuman=false,barcodeType='',barcodeDir='N',blockWidth=0,blockLines=1,blockSpacing=0,blockJustify='L',fieldHex=false,hexChar='_',labelQuantity=1;
  let effectiveWidth=null,effectiveHeight=null;
  let lw=0,lh=0;
  for(let i=0;i<commands.length;i++){
   const {cmd,arg}=commands[i];const parts=arg.split(',');
   switch(cmd){
    case 'PW':lw=parseInt(arg)||0;break;
    case 'LL':lh=parseInt(arg)||0;break;
    case 'FO':case 'FT': x=parseFloat(parts[0])||0;y=parseFloat(parts[1])||0;origin=cmd;break;
    case 'A0':case 'A1':case 'A2':case 'A3':case 'A4':case 'A5':case 'A6':case 'A7':case 'A8':case 'A9':
      fontH=parseFloat(parts[1])||30;fontW=parseFloat(parts[2])||fontH*.85;break;
    case 'CF':fontH=parseFloat(parts[1])||30;fontW=parseFloat(parts[2])||fontH*.85;break;
    case 'BY':barcodeWidth=parseFloat(parts[0])||2;barcodeHeight=parseFloat(parts[2])||80;break;
    case 'BC':barcodeType='CODE128';barcodeDir=parts[0]||'N';barcodeHeight=parseFloat(parts[1])||barcodeHeight;barcodeHuman=(parts[2]||'Y')==='Y';break;
    case 'B3':barcodeType='CODE39';barcodeHeight=parseFloat(parts[1])||barcodeHeight;barcodeHuman=(parts[2]||'Y')==='Y';break;
    case 'BQN':barcodeType='QR';break;
    case 'FB':blockWidth=parseFloat(parts[0])||0;blockLines=parseInt(parts[1])||1;blockSpacing=parseFloat(parts[2])||0;blockJustify=parts[3]||'L';break;
    case 'FH':fieldHex=true;hexChar=(arg||'_')[0];break;
    case 'GB':fields.push({kind:'box',x,y,width:parseFloat(parts[0])||100,height:parseFloat(parts[1])||100,thick:parseFloat(parts[2])||1,color:parts[3]||'B'});break;
    case 'PQ':labelQuantity=clamp(parseInt(parts[0])||1,1,100);break;
    case 'FD':{
      const value=fieldHex?decodeField(arg,hexChar):arg;
      fields.push({kind:barcodeType||'text',x,y,origin,text:value,fontH,fontW,barcodeHeight,barcodeWidth,barcodeHuman,barcodeDir,blockWidth,blockLines,blockSpacing,blockJustify});
      barcodeType='';blockWidth=0;blockLines=1;blockSpacing=0;blockJustify='L';fieldHex=false;break;
    }
    case 'FS':barcodeType='';blockWidth=0;blockLines=1;blockSpacing=0;blockJustify='L';fieldHex=false;break;
   }
  }
  if(!fields.length)warnings.push('Etiqueta sem campos de impressão');
  total+=labelQuantity;labels.push({fields,quantity:labelQuantity,labelWidth:lw,labelHeight:lh});
 }
 return {labels,total,warnings};
}
function ctxText(ctx,field){
 const fontH=field.fontH,fw=field.fontW;
 ctx.save();ctx.fillStyle='#000';ctx.textBaseline='alphabetic';ctx.font=`${fontH}px Arial, sans-serif`;
 const sample=ctx.measureText('MMMMMMMMMM').width/10||fontH*.8;
 ctx.translate(field.x,field.origin==='FT'?field.y:field.y+fontH*.86);
 ctx.scale(fw/sample,1);
 const maxW=field.blockWidth>0?field.blockWidth/(fw/sample):Infinity;
 const txt=field.text.replace(/\\&/g,'\n');
 let lines=[];
 if(maxW===Infinity)lines=txt.split('\n');
 else for(const segment of txt.split('\n')){
   let current='';
   for(const word of segment.split(/\s+/)){
     const trial=current?current+' '+word:word;
     if(ctx.measureText(trial).width>maxW && current){lines.push(current);current=word;}else current=trial;
   }lines.push(current);
 }
 if(field.blockWidth>0)lines=lines.slice(0,field.blockLines||1);
 if(lines.length===0)lines=[''];
 let y=0;
 for(const line of lines){let xx=0;if(field.blockWidth>0){const target=field.blockWidth/(fw/sample);if(field.blockJustify==='C')xx=(target-ctx.measureText(line).width)/2;else if(field.blockJustify==='R')xx=target-ctx.measureText(line).width;}ctx.fillText(line,xx,y);y+=fontH+field.blockSpacing;}
 ctx.restore();
}
function drawCode128(ctx,field){
 const txt=field.text;
 // Code128 subset B supports ASCII printable characters. Fail explicitly for unsupported characters.
 let values=[104];for(const ch of txt){const cp=ch.charCodeAt(0);if(cp<32||cp>126)throw Error('Code 128 contém caractere não suportado: '+ch);values.push(cp-32);}
 let check=104;for(let i=1;i<values.length;i++)check+=values[i]*i;
 values.push(check%103,106);
 const patterns=values.map(x=>CODE128[x]);let moduleCount=patterns.reduce((s,p)=>s+p.split('').reduce((a,n)=>a+Number(n),0),0);
 const preferred=field.barcodeWidth||2, available=Math.max(0,Math.round(ctx.canvas.width-field.x-10));
 // Preserve original module width; never silently shrink barcode: render may exceed paper and warn.
 let mx=field.x;
 ctx.save();ctx.fillStyle='#000';
 for(const pattern of patterns){let bar=true;for(const d of pattern){const w=Number(d)*preferred;if(bar)ctx.fillRect(mx,field.y,w,field.barcodeHeight);mx+=w;bar=!bar;}}
 if(field.barcodeHuman){ctx.font='16px Arial';ctx.textAlign='center';ctx.fillText(txt,field.x+moduleCount*preferred/2,field.y+field.barcodeHeight+19);}
 ctx.restore();
 return mx>ctx.canvas.width?`Código de barras passa da largura da etiqueta (${Math.round(mx)} > ${ctx.canvas.width} dots).`:null;
}
function renderToCanvas(label,ww,hh,scale=2){
 const cw=Math.round(ww*MM_DOTS),ch=Math.round(hh*MM_DOTS);
 const c=document.createElement('canvas');c.width=Math.round(cw*scale);c.height=Math.round(ch*scale);
 const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);
 let warnings=[];
 for(const f of label.fields){
  if(f.kind==='text')ctxText(ctx,f);
  else if(f.kind==='CODE128'){const warn=drawCode128(ctx,f);if(warn)warnings.push(warn);}
  else if(f.kind==='box'){ctx.strokeStyle=f.color==='W'?'white':'black';ctx.lineWidth=f.thick;ctx.strokeRect(f.x+f.thick/2,f.y+f.thick/2,f.width-f.thick,f.height-f.thick);}
  else warnings.push('Comando de código de barras '+f.kind+' ainda não suportado nesta versão.');
 }
 return {canvas:c,warnings};
}
function getSizes(){return {w:clamp(Number($('widthMm').value)||80,10,210),h:clamp(Number($('heightMm').value)||50,10,297),copies:clamp(parseInt($('copies').value)||1,1,100)}};
function expandPages(){const p=[];for(const label of state.pages){for(let i=0;i<label.quantity;i++)p.push(label);}return p;}
function refresh(){
 const pages=expandPages(),{w,h,copies}=getSizes();$('dimensions').textContent=`${w} × ${h} mm`;
 const active=state.pages.length>0, count=active?copies:0;
 $('pdfBtn').disabled=!active;$('printBtn').disabled=!active;
 $('pageInfo').textContent=active?`Etiqueta ${clamp(state.current+1,1,pages.length)} de ${pages.length}`:'Etiqueta 0 de 0';
 $('previewCount').textContent=active?`${pages.length} etiqueta${pages.length>1?'s':''}`:'Nenhum arquivo';
 $('prev').disabled=!active||state.current<1;$('next').disabled=!active||state.current>=pages.length-1;
 if(!active){$('placeholder').classList.remove('hidden');$('canvas').classList.add('hidden');return;}
 state.current=clamp(state.current,0,pages.length-1);
 const {canvas,warnings}=renderToCanvas(pages[state.current],w,h,2);
 const display=$('canvas');display.width=canvas.width;display.height=canvas.height;display.getContext('2d').drawImage(canvas,0,0);
 $('placeholder').classList.add('hidden');display.classList.remove('hidden');
 if(warnings.length)info(warnings.join(' ')+' Revise a prévia antes de imprimir.','warn');
 else info(`${pages.length} etiqueta(s) lida(s). PDF e impressão disponíveis.`,'good');
}
function loadSource(s,name){
 state.source=s;state.name=(name||'etiquetas').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_');
 try{const result=parseZPL(s);state.pages=result.labels;state.current=0;$('copies').value=result.total;refresh();if(result.warnings.length)info(result.warnings.join('; '),'warn');}
 catch(e){state.pages=[];refresh();info(e.message,'warn');}
}
async function openFile(file){if(!file)return;if(file.size>5*1024*1024){info('O arquivo ultrapassa 5 MB.','warn');return;}loadSource(await file.text(),file.name);}
$('choose').addEventListener('click',()=>$('file').click());$('file').addEventListener('change',e=>openFile(e.target.files[0]));
const drop=$('drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over');});drop.addEventListener('dragleave',()=>drop.classList.remove('over'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');openFile(e.dataTransfer.files[0]);});
$('pasteToggle').addEventListener('click',()=>$('pasteArea').classList.toggle('hidden'));
$('applyZpl').addEventListener('click',()=>loadSource($('zplInput').value,'zpl-colado'));
for(const id of ['widthMm','heightMm'])$(id).addEventListener('change',refresh);
$('copies').addEventListener('change',()=>{if(!state.pages.length)return;const target=getSizes().copies;const existing=state.pages.reduce((sum,p)=>sum+p.quantity,0);if(state.pages.length===1)state.pages[0].quantity=target;else {const last=state.pages.at(-1);last.quantity=clamp(last.quantity+(target-existing),1,100);}state.current=0;refresh();});
$('prev').onclick=()=>{state.current--;refresh();};$('next').onclick=()=>{state.current++;refresh();};
// Minimal standards-compliant PDF writer: each page embeds the raster of a high-resolution label.
const latin1=(s)=>new TextEncoder().encode(s);const bytesFromBase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function buildPDF(labels,w,h){
 const pw=w*72/25.4,ph=h*72/25.4;
 const pieces=[],offsets=[0],obj=[];let size=0;
 const push=b=>{pieces.push(b);size+=b.length;};
 const pushString=s=>push(latin1(s));
 function pdfObject(id,content){offsets[id]=size;pushString(`${id} 0 obj\n`);if(typeof content==='string')pushString(content);else push(content);pushString('\nendobj\n');}
 const n=labels.length;
 pushString('%PDF-1.4\n');
 const kids=Array.from({length:n},(_,i)=>`${3+i*3} 0 R`).join(' ');
 pdfObject(1,'<< /Type /Catalog /Pages 2 0 R >>');
 pdfObject(2,`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
 for(let i=0;i<n;i++){
  const pageId=3+i*3,imId=pageId+1,streamId=pageId+2;
  const c=renderToCanvas(labels[i],w,h,2).canvas;
  const image=bytesFromBase64(c.toDataURL('image/jpeg',.94).split(',')[1]);
  pdfObject(pageId,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(3)} ${ph.toFixed(3)}] /Resources << /XObject << /Im1 ${imId} 0 R >> >> /Contents ${streamId} 0 R >>`);
  offsets[imId]=size;pushString(`${imId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);push(image);pushString('\nendstream\nendobj\n');
  const content=`q\n${pw.toFixed(3)} 0 0 ${ph.toFixed(3)} 0 0 cm\n/Im1 Do\nQ\n`,buf=latin1(content);
  offsets[streamId]=size;pushString(`${streamId} 0 obj\n<< /Length ${buf.length} >>\nstream\n`);push(buf);pushString('endstream\nendobj\n');
 }
 const startxref=size;
 pushString(`xref\n0 ${3+n*3}\n0000000000 65535 f \n`);
 for(let id=1;id<3+n*3;id++)pushString(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);
 pushString(`trailer\n<< /Size ${3+n*3} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`);
 return new Blob(pieces,{type:'application/pdf'});
}
function doPDF(){if(!state.pages.length)return;const pages=expandPages(),{w,h}=getSizes();if(pages.length>100){info('Plano grátis: limite de 100 etiquetas por conversão.','warn');return;}
 const btn=$('pdfBtn');btn.disabled=true;btn.textContent='Gerando PDF…';
 setTimeout(()=>{try{const blob=buildPDF(pages,w,h),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${state.name}_${w}x${h}mm_${pages.length}un.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);info(`PDF gerado: ${pages.length} página(s) de ${w} × ${h} mm.`,'good');}catch(e){info('Erro na geração: '+e.message,'warn');}finally{btn.disabled=false;btn.innerHTML='↓ Baixar PDF';}},35);
}
function doPrint(){if(!state.pages.length)return;const {w,h}=getSizes(),pages=expandPages();if(pages.length>100){info('Plano grátis: limite de 100 etiquetas por impressão.','warn');return;}
 // print via native dialog; size is defined in @page, printer driver may override.
 const win=window.open('','_blank');if(!win){info('Permita pop-ups para abrir a impressão.','warn');return;}
 let imgs=pages.map(p=>`<img src="${renderToCanvas(p,w,h,2).canvas.toDataURL('image/png')}" alt="Etiqueta">`).join('');
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Imprimir etiquetas</title><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0}img{width:${w}mm;height:${h}mm;display:block;break-after:page;page-break-after:always;object-fit:fill}img:last-child{break-after:auto;page-break-after:auto}</style></head><body>${imgs}<script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script></body></html>`);win.document.close();
}
$('pdfBtn').onclick=doPDF;$('printBtn').onclick=doPrint;
refresh();

// UI de planos: não cria contas nem cobra enquanto o backend não estiver configurado.
for(const id of ['accountBtn','premiumBtn'])$(id).addEventListener('click',()=>$('accountDialog').showModal());
$('closeDialog').addEventListener('click',()=>$('accountDialog').close());
$('dialogBack').addEventListener('click',()=>$('accountDialog').close());
$('accountDialog').addEventListener('click',e=>{if(e.target===$('accountDialog'))$('accountDialog').close()});
for(const b of document.querySelectorAll('.preset'))b.addEventListener('click',()=>{
 $('widthMm').value=b.dataset.w;$('heightMm').value=b.dataset.h;
 document.querySelectorAll('.preset').forEach(x=>x.classList.toggle('active',x===b));refresh();
});
