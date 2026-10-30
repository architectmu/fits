'use strict';
/* Size charts per brand (men's body measurements, cm). Data copied from each brand's official size guide;
   add a brand by adding an entry to SIZE_CHARTS. */
const SIZE_CHARTS=[
 {name:'Ralph Lauren',aliases:['polo ralph lauren','lauren ralph lauren','ralph lauren'],source:'https://www.ralphlauren.global/mens-size-guide/mens_polo_purplelabel_rrl_apparel.html',checked:'2026-10-30',
  tables:[
   {title:'Apparel (excluding shirts, suits, sport coats & bottoms)',cols:['XXS','XS','S','M','L','XL','XXL'],rows:[
    ['Chest','68.5–78.8','78.7–86.4','88.9–94','96.5–101.6','106.7–114.3','116.8–121.9','124.5–132.1'],
    ['Neck','33.1–34.2','35.6','35.6–36.8','38.1–39.4','40.6–41.9','43.2–44.5','45.7–47'],
    ['Sleeve','78.7–81.3','81.3–82.6','81.3–83.8','86.4–88.9','88.9–91.4','91.4–94','94–96.5'],
    ['Waist','60.9–66','66–71.1','71.1–76.2','78.7–86.4','88.9–96.5','101.6–106.7','109.2–114.3']]},
   {title:'Casual shirts',cols:['XS','S','M','L','XL','XXL'],rows:[
    ['Chest','78.7–86.4','88.9–94','96.5–101.6','106.7–114.3','116.8–121.9','124.5–132.1'],
    ['Neck','35.6','35.6–36.8','38.1–39.4','40.6–41.9','43.2–44.5','45.7–47'],
    ['Sleeve','81.3–82.6','81.3–83.8','86.4–88.9','88.9–91.4','91.4–94','94–96.5'],
    ['Waist','66–71.1','71.1–76.2','78.7–86.4','88.9–96.5','101.6–106.7','109.2–114.3']]},
   {title:'Dress shirts (sized by neck)',cols:['US/UK 14.5','15','15.5','16','16.5','17','17.5','18','18.5','20'],rows:[
    ['EU','37','38','39.5','40.5','42','43','44.5','45.5','47','50'],
    ['Neck','36.8','38.1','39.4','40.6','41.9','43.2','44.5','45.7','47','50.8'],
    ['Chest','91.4','96.5','101.6','106.7','111.8','116.8','121.9','127','132.1','147.3'],
    ['Sleeve','81.3–83.8','86.4–88.9','86.4–88.9','88.9–91.4','88.9–91.4','91.4–94','91.4–94','94–96.5','94–96.5','99.1–101.6'],
    ['Waist','76.2','81.3','86.4','91.4','96.5','101.6','106.7','111.8','116.8','132.1']]},
   {title:'Bottoms (sized by waist)',cols:['28','29','30','31','32','33','34','35','36','37','38','40','42','44'],rows:[
    ['Waist','71.1','73.7','76.2','78.7','81.3','83.8','86.4','88.9','91.4','94','96.5','101.6','106.7','111.8']]},
   {title:'Bottoms — inseam',cols:['30L','32L','34L','36L'],rows:[['Inseam','76.2','81.3','86.4','91.4']]},
   {title:'Bottoms — letter sizes',cols:['XS','S','M','L','XL','XXL'],rows:[['Waist','66–71.1','71.1–76.2','78.7–86.4','88.9–96.5','101.6–106.7','109.2–114.3']]},
   {title:'Suits & sport coats (L is 2.5 cm longer than R; R is 2.5 cm longer than S)',cols:['US/UK 36','38','40','42','44','46','48','50'],rows:[
    ['EU','46','48','50','52','54','56','58','60'],['Chest','91.4','96.5','101.6','106.7','111.8','116.8','121.9','127'],['Pant waist','76.2','78.7','83.8','88.9','94','99.1','104.1','109.2']]}]},
 {name:'Nike',aliases:['nike'],source:'https://www.nike.com/size-fit/mens-footwear',checked:'2026-10-30',unit:'in',
  tables:[
   {title:'Tops (Tall sizes use the same chest)',unit:'in',cols:['XXS','XS','S','M','L','XL','XXL','3XL','4XL'],rows:[
    ['Chest','28.1–31.5','31.5–35','35–37.5','37.5–41','41–44','44–48.5','48.5–53.5','53.5–58','58–63'],
    ['Waist','22.5–25.5','25.5–29','29–32','32–35','35–38','38–43','43–47.5','47.5–52.5','52.5–57'],
    ['Hip','28.5–31.5','31.5–35','35–37.5','37.5–41','41–44','44–47','47–50.5','50.5–53.5','53.5–58.5']]},
   {title:'Bottoms — letter sizes',unit:'in',cols:['XXS','XS','S','M','L','XL','XXL','3XL','4XL'],rows:[
    ['Waist','22.5–25.5','25.5–29','29–32','32–35','35–38','38–43','43–47.5','47.5–52.5','52.5–57'],
    ['Hip','28.5–31.5','31.5–35','35–37.5','37.5–41','41–44','44–47','47–50.5','50.5–53.5','53.5–58.5']]},
   {title:'Bottoms — numeric sizes',unit:'in',cols:['26','28','30','32','34','35','36','37','38','40','42','44','46','48'],rows:[
    ['Waist','27.5','29.5','31.5','33.5','35.5','36.5','37.5','38.5','39.5','41.5','43.5','45.5','47.5','49.5'],
    ['Hip','33.5','35.5','37.5','39.5','41.5','42.5','43.5','44.5','45.5','47.5','49.5','51.5','53.5','55.5']]},
   {title:'Shoes (foot length; between sizes, Nike recommends sizing up)',unit:'',cols:['US 6','6.5','7','7.5','8','8.5','9','9.5','10','10.5','11','11.5','12','12.5','13','14','15'],rows:[
    ['UK','5.5','6','6','6.5','7','7.5','8','8.5','9','9.5','10','10.5','11','11.5','12','13','14'],
    ['EU','38.5','39','40','40.5','41','42','42.5','43','44','44.5','45','45.5','46','47','47.5','48.5','49.5'],
    ['CM / JP','24','24.5','25','25.5','26','26.5','27','27.5','28','28.5','29','29.5','30','30.5','31','32','33'],
    ['Foot (in)','9 5/16','9 1/2','9 11/16','9 13/16','10','10 3/16','10 5/16','10 1/2','10 11/16','10 13/16','11','11 3/16','11 5/16','11 1/2','11 11/16','12','12 5/16']]}]},
 /* brands whose official size guide is per product, not one general chart */
 ...[['Zara',['zara','zara x champion'],'https://www.zara.com/eg/en/help-center/MySize'],['H&M',['h&m','hm'],'https://www2.hm.com/en_gb/customer-service/sizeguide/sizing-faq.html'],
  ['Pull&Bear',['pull&bear','pull & bear'],'https://www.pullandbear.com'],['Bershka',['bershka'],'https://www.bershka.com']].map(([name,aliases,source])=>({name,aliases,source,perProduct:true,tables:[]})),
 /* official guide exists but blocks automated reading; linked so it can be opened directly */
 ...[['adidas',['adidas','adidas originals','adidas x sporty & rich'],'https://www.adidas.com/us/help/size_charts'],['Vans',['vans'],'https://www.vans.com'],['Converse',['converse'],'https://www.converse.com'],
  ['New Balance',['new balance'],'https://www.newbalance.com'],['ASOS Design',['asos design','asos'],'https://www.asos.com/discover/size-charts/men/'],['GANT',['gant'],'https://www.gant.com'],
  ['Scotch & Soda',['scotch & soda'],'https://www.scotch-soda.com'],['ALDO',['aldo'],'https://www.aldoshoes.com'],['Armani Collezioni',['armani collezioni','armani'],'https://www.armani.com'],
  ['Wells & Coverly',['wells & coverly'],'']].map(([name,aliases,source])=>({name,aliases,source,pending:true,tables:[]}))];
const chartFor=brand=>{const b=(brand||'').toLowerCase().trim();return SIZE_CHARTS.find(c=>c.aliases.includes(b)||c.name.toLowerCase()===b)};
NAV.push('sizecharts');
st.szq='';
function renderSizes(){const owned=[...new Set(st.items.map(i=>i.brand).filter(Boolean))];
 const names=[...new Set([...SIZE_CHARTS.map(c=>c.name),...owned.filter(b=>!chartFor(b))])].sort((a,b)=>a.localeCompare(b));
 const q=st.szq.toLowerCase(),list=names.filter(n=>!q||n.toLowerCase().includes(q)||(chartFor(n)?.aliases||[]).some(a=>a.includes(q)));
 $('#view').innerHTML=`<div class="page"><div class="page-h"><div><h1>${t('sizecharts')}</h1><p class="muted">${t('szSub')}</p></div></div>
  <div class="search" style="max-width:420px;margin-bottom:18px">${ic('search',16)}<input id="szQ" placeholder="${t('szSearch')}" value="${esc(st.szq)}"></div>
  <div class="szgrid">${list.map(n=>{const c=chartFor(n),has=c&&c.tables.length;return `<button class="szb ${has?'':'off'}" data-n="${esc(n)}"><b>${esc(n)}</b><small>${has?t('szTables',{n:c.tables.length}):c?.perProduct?t('szPerProduct'):t('szNotYet')}</small></button>`}).join('')}</div></div>`;
 $('#szQ').oninput=e=>{st.szq=e.target.value;const p=e.target.selectionStart;renderSizes();const i=$('#szQ');i.focus();i.setSelectionRange(p,p)};
 $('.szgrid').onclick=e=>{const b=e.target.closest('.szb');if(b)openChart(b.dataset.n)}}
function openChart(name){const c=chartFor(name),link=c?.source?` <a href="${esc(c.source)}" target="_blank" rel="noopener">${t('szSource')}</a>`:'';
 if(!c||!c.tables.length)return modal(`<h2>${esc(c?c.name:name)}</h2><p class="muted" style="line-height:1.7">${c?.perProduct?t('szPerProductLong'):t('szNotYetLong')}${link}</p>
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`);
 modal(`<h2>${esc(c.name)}</h2><p class="muted sm">${c.unit==='in'?t('szIn'):t('szCm')} ·${link} · ${esc(c.checked)}</p>
  ${c.tables.map(tb=>`<h4 class="sz-t">${esc(tb.title)}</h4><div class="mtable-wrap"><table class="mtable"><thead><tr><th></th>${tb.cols.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead>
  <tbody>${tb.rows.map(r=>`<tr>${r.map((v,i)=>i?`<td>${esc(v)}</td>`:`<th>${esc(v)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}
  <div class="md-f"><button class="btn ghost" data-close>${t('close')}</button></div>`,{wide:true})}
VIEWS.sizecharts=renderSizes;
Object.assign(S.en,{sizecharts:'Size charts',szSub:'Men’s size charts from each brand’s official guide',szSearch:'Search a brand…',szTables:'{n} tables',szNotYet:'Not added yet',
 szNotYetLong:'This brand’s official chart couldn’t be read automatically yet, so no numbers were added rather than guessing. You can open it here:',szCm:'Body measurements in cm',szIn:'Body measurements in inches',szSource:'Official source',
 szPerProduct:'Size guide on each product',szPerProductLong:'This brand doesn’t publish one general chart — its official size guide is on each product page ("Size guide" / "Find your size"), because sizes vary by cut and fabric.'});
Object.assign(S.ar,{sizecharts:'جداول المقاسات',szSub:'جداول مقاسات الرجالي من الدليل الرسمي لكل براند',szSearch:'دوّر على براند…',szTables:'{n} جداول',szNotYet:'لسه ما اتضافش',
 szNotYetLong:'الجدول الرسمي للبراند ده ما اتقراش أوتوماتيك لسه، فما حطيتش أرقام بدل ما أخمّن. تقدر تفتحه من هنا:',szCm:'مقاسات الجسم بالسنتيمتر',szIn:'مقاسات الجسم بالبوصة',szSource:'المصدر الرسمي',
 szPerProduct:'دليل المقاسات في صفحة كل منتج',szPerProductLong:'البراند ده مش بينشر جدول واحد عام — دليل المقاسات الرسمي بتاعه موجود في صفحة كل منتج ("Size guide" / "Find your size")، لأن المقاس بيختلف حسب القصّة والخامة.'});
document.head.insertAdjacentHTML('beforeend',`<style>.szgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.szb{border:1px solid var(--line);border-radius:14px;background:var(--bg);padding:14px 16px;text-align:start;display:flex;flex-direction:column;gap:4px}.szb:hover{border-color:var(--ink)}
.szb small{color:var(--muted);font-size:12px}.szb.off{opacity:.55}.sz-t{margin:18px 0 8px;font-size:13.5px}</style>`);
