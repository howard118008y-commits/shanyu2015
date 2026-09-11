import { buildScene } from './scene3d.js?v=20260911-rebuild1';

const VIEWS = {
  estate:{name:'莊園全景',detail:'雙池・L 型玻璃雨遮・雙鞦韆'},
  yunsidai:{name:'雲絲帶',detail:'一大床一小床・布面床頭・編織吊燈'},
  lihalai:{name:'里哈籟',detail:'綠色牆面・兩張雙人床・低木平台'},
  zhenqing:{name:'山遇真情',detail:'紅色牆面・兩張雙人床'},
  cabin:{name:'水見曉逐',detail:'木屋臥室・挑空大廳'},
};
const LEVELS = {all:'整棟',ground:'一樓',upper:'二樓'};

export async function mountTour(section, options = {}) {
  const stage=section.querySelector('.tour-stage'),tabs=section.querySelector('.tour-tabs');
  const prices=section.querySelector('.tour-prices');
  section.querySelectorAll('.tour-hd-viewer,.tour-hd-actions,.tour-reference,.tour-photo-dialog,.tour-tools,.tour-levels,.tour-mesh-actions,.tour-mesh-status,canvas').forEach(element=>element.remove());
  section.classList.remove('tour-hd-active','ready');section.classList.add('tour-reconstruction-active');
  const canvas=document.createElement('canvas');canvas.tabIndex=0;
  canvas.setAttribute('aria-description','拖曳或方向鍵旋轉，滾輪或加減鍵縮放，右鍵拖曳或 Shift 加方向鍵平移，Home 重設');
  stage.prepend(canvas);
  let current='estate',level='all',api;
  tabs.innerHTML=Object.entries(VIEWS).map(([key,view])=>
    `<button type="button" role="tab" id="tour-tab-${key}" aria-controls="tour-stage" data-view="${key}">${view.name}</button>`).join('');
  const actions=document.createElement('div');actions.className='tour-mesh-actions';
  actions.innerHTML='<button type="button" data-action="rotate" aria-pressed="false">自動旋轉</button><a class="tour-model-download" download>下載立體模型</a>';
  stage.append(actions);
  const levels=document.createElement('div');levels.className='tour-levels';levels.setAttribute('role','group');levels.setAttribute('aria-label','水見曉逐樓層');
  levels.innerHTML=Object.entries(LEVELS).map(([key,name])=>
    `<button type="button" data-level="${key}" aria-pressed="${key==='all'}">${name}</button>`).join('');
  stage.append(levels);
  const tools=document.createElement('div');tools.className='tour-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','旋轉與縮放');
  tools.innerHTML=[['left','向左旋轉','↶'],['right','向右旋轉','↷'],['out','縮小','−'],['in','放大','＋'],['reset','重設視角','⌂']].map(([key,label,symbol])=>
    `<button type="button" data-tool="${key}" aria-label="${label}" title="${label}">${symbol}</button>`).join('');
  stage.append(tools);
  const status=document.createElement('p');status.className='tour-mesh-status';status.setAttribute('role','status');
  status.textContent='拖曳旋轉 · 滾輪縮放 · 右鍵或雙指平移';stage.append(status);
  section.querySelector('.tour-footer>p').textContent='依照片重建・遮擋面推估，非實測';
  function updateView(key){
    current=key;const view=VIEWS[key];
    const suffix=key==='cabin'?'・'+LEVELS[level]:'';
    stage.setAttribute('aria-labelledby','tour-tab-'+key);
    canvas.setAttribute('aria-label',view.name+suffix+'可旋轉立體模型');
    tabs.querySelectorAll('button').forEach(button=>{
      const selected=button.dataset.view===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    levels.hidden=key!=='cabin';
    section.querySelector('.tour-current').textContent=view.name+suffix;
    section.querySelector('.tour-detail').textContent=view.detail;
    const filename=key==='cabin'?'cabin-'+level:key;
    actions.querySelector('a').href='assets/models-v2/shanyu-'+filename+'.glb';
    prices.querySelectorAll('[data-rate]').forEach(row=>{
      const selected=row.dataset.rate===key;row.classList.toggle('is-current',selected);
      const button=row.querySelector('button');button.disabled=false;
      if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    options.onViewChange?.(key);
  }
  try{
    api=buildScene(canvas,{
      onViewChange:updateView,
      onCabinLevelChange:value=>{
        level=value;levels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level)));
        if(current==='cabin')updateView('cabin');
      },
      onAutoRotateChange:enabled=>{
        const button=actions.querySelector('button');button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'停止旋轉':'自動旋轉';
      },
      onPick:key=>{if(current==='estate'&&key==='cabin')api.setView('cabin');},
    });
    const failed=await api.ready;
    if(failed.length)status.textContent='部分照片材質未載入，仍可旋轉；重新整理可重試。';
  }catch(error){api?.stop();canvas.remove();throw error;}
  actions.querySelector('button').addEventListener('click',event=>api.setAutoRotate(event.currentTarget.getAttribute('aria-pressed')!=='true'));
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)api.setView(button.dataset.view);});
  levels.addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button)api.setCabinLevel(button.dataset.level);});
  prices.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)api.setView(button.dataset.room);});
  tools.addEventListener('click',event=>{
    const action=event.target.closest('[data-tool]')?.dataset.tool;
    if(action==='left')api.orbit(-Math.PI/8);
    if(action==='right')api.orbit(Math.PI/8);
    if(action==='in')api.zoom(0.8);
    if(action==='out')api.zoom(1.25);
    if(action==='reset')api.reset();
  });
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(index<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();api.setView(buttons[next].dataset.view);
  });
  section.classList.add('ready');api.setAutoRotate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  return api;
}
