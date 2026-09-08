import { buildScene } from './scene3d.js?v=20260908-5';

const VIEWS = {
  estate: { name:'莊園全景', photo:'assets/hero-house.jpg', detail:'主棟・庭園・池畔木屋' },
  yunsidai: { name:'雲絲帶', photo:'assets/room-yunsidai.jpg', detail:'一大床一小床・三人房' },
  lihalai: { name:'里哈籟', photo:'assets/room-lihalai.jpg', detail:'兩雙人床・二至四人房' },
  zhenqing: { name:'山遇真情', photo:'assets/room-zhenqing.jpg', detail:'兩雙人床・四人房' },
  cabin: { name:'水見曉逐', photo:'assets/cabin-exterior-pond.jpg', detail:'獨棟木屋・一樓大廳・上下樓臥室' },
};
const CABIN_LEVELS = {
  all:{name:'整棟',photo:'assets/cabin-exterior-pond.jpg',detail:'一樓大廳・上下樓臥室'},
  ground:{name:'一樓',photo:'assets/cabin-1.jpg',detail:'一樓臥室・大廳・窗邊座位'},
  upper:{name:'二樓',photo:'assets/cabin-2.jpg',detail:'二樓臥室・書桌・挑空欄杆'},
};

// Lucide 0.468.0 icons, ISC license; see assets/lucide-LICENSE.
const ICONS = {
  reset:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  zoomIn:'<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
  zoomOut:'<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>',
  close:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
const icon = name => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

export function mountTour(section, opts = {}) {
  section.querySelectorAll('.tour-reference,.tour-tools,.tour-photo-dialog,.tour-levels').forEach(element=>element.remove());
  const canvas = section.querySelector('canvas');
  const tabs = section.querySelector('.tour-tabs');
  const stage = section.querySelector('.tour-stage');
  const prices = section.querySelector('.tour-prices');
  let current = 'estate',cabinLevel = 'all';
  tabs.innerHTML = Object.entries(VIEWS).map(([key,v]) =>
    `<button type="button" role="tab" id="tour-tab-${key}" aria-controls="tour-stage" aria-selected="${key==='estate'}" tabindex="${key==='estate'?0:-1}" data-view="${key}">${v.name}</button>`).join('');
  const photo = document.createElement('button');
  photo.type = 'button'; photo.className = 'tour-reference';
  photo.innerHTML = '<img alt="" width="132" height="88"><span>實景照片</span>';
  stage.append(photo);
  const levels=document.createElement('div');levels.className='tour-levels';levels.hidden=true;
  levels.setAttribute('role','group');levels.setAttribute('aria-label','水見曉逐樓層');
  levels.innerHTML=Object.entries(CABIN_LEVELS).map(([key,value])=>
    `<button type="button" data-level="${key}" aria-pressed="${key==='all'}">${value.name}</button>`).join('');
  stage.append(levels);
  const toolbar = document.createElement('div'); toolbar.className = 'tour-tools';
  toolbar.setAttribute('role','group'); toolbar.setAttribute('aria-label','視角控制');
  toolbar.innerHTML = [['zoomIn','放大'],['zoomOut','縮小'],['reset','重設視角']].map(([key,label])=>
    `<button type="button" aria-label="${label}" title="${label}" data-tool="${key}">${icon(key)}<span class="tour-tooltip">${label}</span></button>`).join('');
  stage.append(toolbar);
  const dialog = document.createElement('dialog'); dialog.className = 'tour-photo-dialog';
  dialog.setAttribute('aria-label','民宿實景照片');
  dialog.innerHTML = `<button type="button" class="tour-dialog-close" aria-label="關閉實景照片">${icon('close')}</button><figure><img alt=""><figcaption></figcaption></figure>`;
  section.append(dialog);
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  function openPhoto(key = current) {
    const v = VIEWS[key]; if(!v)return;
    const floor=key==='cabin'?CABIN_LEVELS[cabinLevel]:null;
    dialog.querySelector('img').src=floor?.photo||v.photo;dialog.querySelector('img').alt=v.name+(floor?.name||'')+'實景照片';
    dialog.querySelector('figcaption').textContent=v.name+(floor?'・'+floor.name:'')+'・民宿實景';dialog.showModal();
  }
  photo.addEventListener('click',()=>openPhoto());
  function updateView(key) {
    current=key;const view=VIEWS[key];
    tabs.querySelectorAll('button').forEach(b=>{const selected=b.dataset.view===key;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    stage.setAttribute('aria-labelledby','tour-tab-'+key);
    const floor=key==='cabin'?CABIN_LEVELS[cabinLevel]:null;
    levels.hidden=key!=='cabin';
    canvas.setAttribute('aria-label',view.name+(floor?'・'+floor.name:'')+'立體模型');
    section.querySelector('.tour-current').textContent=view.name;
    section.querySelector('.tour-detail').textContent=floor?.detail||view.detail;
    photo.querySelector('img').src=floor?.photo||view.photo;photo.setAttribute('aria-label','查看'+view.name+(floor?.name||'')+'實景照片');
    prices.querySelectorAll('[data-rate]').forEach(row=>{
      const selected=row.dataset.rate===key;row.classList.toggle('is-current',selected);
      const button=row.querySelector('button');
      if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    opts.onViewChange?.(key);
  }
  const api = buildScene(canvas, {
    onViewChange:updateView,
    onCabinLevelChange:level=>{
      cabinLevel=level;levels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level)));
      if(current==='cabin')updateView('cabin');
    },
    onHover:opts.onHover,
    onPick:key=>{if(key==='cabin'&&current!=='cabin')api.setView('cabin');else if(key==='cabin'||key==='estate'||!opts.onPick)openPhoto(key);else opts.onPick(key);},
  });
  levels.addEventListener('click',e=>{const button=e.target.closest('[data-level]');if(button)api.setCabinLevel(button.dataset.level);});
  tabs.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)api.setView(b.dataset.view);});
  prices.addEventListener('click',e=>{const button=e.target.closest('[data-room]');if(button)api.setView(button.dataset.room);});
  tabs.addEventListener('keydown',e=>{
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(index<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();
    const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();api.setView(buttons[next].dataset.view);
  });
  toolbar.addEventListener('click',e=>{
    const tool=e.target.closest('[data-tool]')?.dataset.tool;
    if(tool==='reset')api.reset();else if(tool==='zoomIn')api.zoom(0.8);else if(tool==='zoomOut')api.zoom(1.25);
  });
  prices.querySelectorAll('button').forEach(button=>{button.disabled=false;});
  section.classList.add('ready');
  return api;
}
