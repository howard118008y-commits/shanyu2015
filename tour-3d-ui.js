import { buildScene } from './scene3d.js?v=20260911-solid3d1';

const VIEWS = {
  estate:{name:'莊園全景',detail:'雙池・L 型玻璃雨遮・雙鞦韆'},
  yunsidai:{name:'雲絲帶',detail:'一張雙人床・一張單人床'},
  lihalai:{name:'里哈籟',detail:'兩張雙人床・低木平台'},
  zhenqing:{name:'山遇真情',detail:'兩張雙人床・四人房'},
  cabin:{name:'水見曉逐',detail:'獨棟木屋・挑空大廳・水岸露臺'},
};
const LEVELS = {all:'整棟',ground:'一樓',upper:'二樓'};
const ANGLES = {overview:'立體全景',front:'正面',right:'右側',back:'背面',left:'左側'};

export async function mountTour(section, options = {}) {
  const stage=section.querySelector('.tour-stage'),tabs=section.querySelector('.tour-tabs'),prices=section.querySelector('.tour-prices');
  stage.querySelectorAll('[data-solid-control],canvas').forEach(element=>element.remove());
  section.classList.remove('ready','tour-photo3d');section.classList.add('tour-solid3d');
  let current='estate',level='all',automatic=false,api;
  const canvas=document.createElement('canvas');canvas.tabIndex=0;
  canvas.setAttribute('aria-description','拖曳或方向鍵旋轉，可繞到背面；滾輪或加減鍵縮放；右鍵、雙指拖曳或 Shift 加方向鍵平移；Home 重設');
  stage.prepend(canvas);
  function control(tag,className){
    const element=document.createElement(tag);element.className=className;element.dataset.solidControl='';stage.append(element);return element;
  }
  tabs.innerHTML=Object.entries(VIEWS).map(([key,view])=>`<button type="button" role="tab" id="tour-tab-${key}" aria-controls="tour-stage" data-view="${key}">${view.name}</button>`).join('');
  const actions=control('div','tour-guest-actions');
  actions.innerHTML='<button type="button" data-action="rotate" aria-pressed="false" disabled>自動環繞</button><button type="button" data-action="enlarge" aria-pressed="false">放大畫面</button><button type="button" data-action="reset" disabled>重設視角</button>';
  const rotateButton=actions.querySelector('[data-action="rotate"]');
  const levels=control('div','tour-levels');levels.setAttribute('role','group');levels.setAttribute('aria-label','水見曉逐樓層');
  levels.innerHTML=Object.entries(LEVELS).map(([key,name])=>`<button type="button" data-level="${key}" aria-pressed="${key==='all'}">${name}</button>`).join('');levels.hidden=true;
  const navigation=control('div','tour-solid-navigation');
  navigation.innerHTML=`<label>觀看方向 <select aria-label="觀看方向">${Object.entries(ANGLES).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}<option value="custom" disabled>自由視角</option></select></label><div class="tour-solid-tools" role="group" aria-label="旋轉與縮放"><button type="button" data-tool="left" aria-label="向左旋轉四十五度">↶</button><button type="button" data-tool="right" aria-label="向右旋轉四十五度">↷</button><button type="button" data-tool="out" aria-label="縮小">−</button><button type="button" data-tool="in" aria-label="放大">＋</button></div>`;
  const angle=navigation.querySelector('select');
  const status=control('p','tour-solid-status');status.setAttribute('role','status');
  status.textContent='正在建立立體空間…';
  section.querySelector('.tour-footer>p').textContent='照片參考建模・遮擋面推估，非實測';
  function updateView(key){
    current=key;const view=VIEWS[key],suffix=key==='cabin'?'・'+LEVELS[level]:'';
    stage.dataset.view=key;stage.setAttribute('aria-labelledby','tour-tab-'+key);
    canvas.setAttribute('aria-label',view.name+suffix+'360 度可旋轉模型');
    levels.hidden=key!=='cabin';angle.value=automatic?'custom':'overview';
    tabs.querySelectorAll('button').forEach(button=>{
      const selected=button.dataset.view===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    section.querySelector('.tour-current').textContent=view.name+suffix;section.querySelector('.tour-detail').textContent=view.detail;
    prices.querySelectorAll('[data-rate]').forEach(row=>{
      const selected=row.dataset.rate===key,button=row.querySelector('button');row.classList.toggle('is-current',selected);button.disabled=false;
      button.setAttribute('aria-label','查看'+VIEWS[row.dataset.rate].name+'立體模型');
      if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    options.onViewChange?.(key);
  }
  try{
    api=buildScene(canvas,{
      onViewChange:updateView,
      onCabinLevelChange(value){
        level=value;levels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level)));
        if(current==='cabin')updateView('cabin');
      },
      onAutoRotateChange(value){
        automatic=value;rotateButton.setAttribute('aria-pressed',String(value));rotateButton.textContent=value?'暫停環繞':'自動環繞';
        if(value)angle.value='custom';
      },
      onCameraAngleChange(value){angle.value=value;},
      onPick(key){if(current==='estate'&&key==='cabin')api.setView('cabin');},
    });
    const failed=await api.ready;
    status.textContent=failed.length?'部分材質未載入；仍可旋轉，重新整理可重試。':'拖曳 360° 環繞 · 滾輪縮放 · 右鍵或雙指平移';
  }catch(error){
    api?.stop();canvas.remove();stage.querySelectorAll('[data-solid-control]').forEach(element=>element.remove());
    tabs.innerHTML='';prices.querySelectorAll('[data-room]').forEach(button=>{button.disabled=true;});throw error;
  }
  actions.querySelectorAll('button').forEach(button=>{button.disabled=false;});
  rotateButton.addEventListener('click',()=>api.setAutoRotate(!automatic));
  actions.querySelector('[data-action="reset"]').addEventListener('click',()=>api.reset());
  actions.querySelector('[data-action="enlarge"]').addEventListener('click',event=>{
    const expanded=section.classList.toggle('tour-enlarged');event.currentTarget.setAttribute('aria-pressed',String(expanded));
    event.currentTarget.textContent=expanded?'縮回畫面':'放大畫面';stage.scrollIntoView({block:'center',behavior:'instant'});
  });
  angle.addEventListener('change',()=>api.setCameraAngle(angle.value));
  navigation.addEventListener('click',event=>{
    const action=event.target.closest('[data-tool]')?.dataset.tool;
    if(action==='left')api.orbit(-Math.PI/4);
    if(action==='right')api.orbit(Math.PI/4);
    if(action==='in')api.zoom(0.8);
    if(action==='out')api.zoom(1.25);
  });
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)api.setView(button.dataset.view);});
  levels.addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button)api.setCabinLevel(button.dataset.level);});
  prices.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)api.setView(button.dataset.room);});
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(index<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();api.setView(buttons[next].dataset.view);
  });
  stage.classList.add('is-rotating');section.classList.add('ready');
  api.setAutoRotate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return api;
}
