const VIEWS = {
  estate:{name:'莊園全景',detail:'雙池・L 型玻璃廊道・雙鞦韆',image:'estate',photo:'assets/hero-house.jpg'},
  yunsidai:{name:'雲絲帶',detail:'一張雙人床・一張單人床',image:'yunsidai',photo:'assets/room-yunsidai-3.jpg'},
  lihalai:{name:'里哈籟',detail:'兩張雙人床・低木平台',image:'lihalai',photo:'assets/room-lihalai.jpg'},
  zhenqing:{name:'山遇真情',detail:'兩張雙人床・四人房',image:'zhenqing',photo:'assets/room-zhenqing.jpg'},
  cabin:{name:'水見曉逐',detail:'獨棟木屋・上下樓臥室',image:'cabin-ground',photo:'assets/cabin-1.jpg'},
};
const LEVELS = {
  ground:{name:'一樓',detail:'一樓臥室・挑空大廳',image:'cabin-ground',photo:'assets/cabin-1.jpg'},
  upper:{name:'二樓',detail:'二樓臥室・書桌・挑空欄杆',image:'cabin-upper',photo:'assets/cabin-2.jpg'},
};

export function mountTour(section, opts = {}) {
  if(section.dataset.hdMounted)return;
  section.dataset.hdMounted='true';
  const stage=section.querySelector('.tour-stage');
  const tabs=section.querySelector('.tour-tabs');
  const canvas=section.querySelector('canvas');
  const prices=section.querySelector('.tour-prices');
  let current='estate',level='ground';
  section.classList.add('tour-hd-active');
  canvas.hidden=true;
  tabs.innerHTML=Object.entries(VIEWS).map(([key,view])=>
    `<button type="button" role="tab" id="tour-tab-${key}" aria-controls="tour-stage" data-view="${key}">${view.name}</button>`).join('');
  const viewer=document.createElement('div');
  viewer.className='tour-hd-viewer';
  viewer.innerHTML='<a target="_blank" rel="noopener"><img decoding="async" fetchpriority="high"></a>';
  stage.append(viewer);
  const photo=document.createElement('button');
  photo.type='button';photo.className='tour-reference';
  photo.innerHTML='<img alt="" width="132" height="88"><span>實景照片</span>';
  stage.append(photo);
  const levels=document.createElement('div');
  levels.className='tour-levels';levels.setAttribute('role','group');levels.setAttribute('aria-label','水見曉逐樓層');
  levels.innerHTML=Object.entries(LEVELS).map(([key,value])=>
    `<button type="button" data-level="${key}">${value.name}</button>`).join('');
  stage.append(levels);
  const mode=document.createElement('a');
  mode.className='tour-mode-toggle';mode.textContent='可旋轉 3D';
  stage.append(mode);
  const toolbar=document.createElement('div');
  toolbar.className='tour-hd-actions';
  toolbar.innerHTML='<a class="tour-hd-original" target="_blank" rel="noopener">放大原圖</a><a href="tour-hd.html">全部高清圖</a>';
  stage.append(toolbar);
  const dialog=document.createElement('dialog');
  dialog.className='tour-photo-dialog';dialog.setAttribute('aria-label','民宿實景照片');
  dialog.innerHTML='<button type="button" class="tour-dialog-close" aria-label="關閉實景照片">×</button><figure><img alt=""><figcaption></figcaption></figure>';
  section.append(dialog);
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  function selection(){return current==='cabin'?{...VIEWS.cabin,...LEVELS[level],name:'水見曉逐・'+LEVELS[level].name}:VIEWS[current];}
  photo.addEventListener('click',()=>{
    const view=selection();
    dialog.querySelector('img').src=view.photo;dialog.querySelector('img').alt=view.name+'實景照片';
    dialog.querySelector('figcaption').textContent=view.name+'・民宿實景';dialog.showModal();
  });
  function updateView(key){
    if(!Object.hasOwn(VIEWS,key))return;
    current=key;const view=selection();
    const image='assets/hd-models/'+view.image;
    const rendered=viewer.querySelector('img');
    rendered.src=image+'.jpg';rendered.alt=view.name+'高清 3D 模型示意圖';
    viewer.querySelector('a').href=image+'.png';viewer.querySelector('a').setAttribute('aria-label','放大'+view.name+'高清原圖');
    toolbar.querySelector('.tour-hd-original').href=image+'.png';
    mode.href='tour.html?mode=interactive&view='+current;
    stage.setAttribute('aria-labelledby','tour-tab-'+current);
    tabs.querySelectorAll('button').forEach(button=>{
      const selected=button.dataset.view===current;
      button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    levels.hidden=current!=='cabin';
    levels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level)));
    section.querySelector('.tour-current').textContent=view.name;
    section.querySelector('.tour-detail').textContent=view.detail;
    section.querySelector('.tour-footer>p').textContent='依實景照片製作・3D 示意圖';
    photo.querySelector('img').src=view.photo;photo.setAttribute('aria-label','查看'+view.name+'實景照片');
    prices.querySelectorAll('[data-rate]').forEach(row=>{
      const selected=row.dataset.rate===current;
      row.classList.toggle('is-current',selected);
      const button=row.querySelector('button');button.disabled=false;
      if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    opts.onViewChange?.(current);
  }
  function setLevel(next){if(Object.hasOwn(LEVELS,next)){level=next;updateView('cabin');}}
  levels.addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button)setLevel(button.dataset.level);});
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)updateView(button.dataset.view);});
  prices.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)updateView(button.dataset.room);});
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(index<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();updateView(buttons[next].dataset.view);
  });
  updateView('estate');section.classList.add('ready');
  return {setView:updateView,setCabinLevel:setLevel};
}
