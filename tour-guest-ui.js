const VIEWS = {
  estate:{name:'莊園全景',detail:'雙池・L 型玻璃雨遮・雙鞦韆',image:'estate'},
  yunsidai:{name:'雲絲帶',detail:'一張雙人床・一張單人床',image:'yunsidai'},
  lihalai:{name:'里哈籟',detail:'兩張雙人床・低木平台',image:'lihalai'},
  zhenqing:{name:'山遇真情',detail:'兩張雙人床・四人房',image:'zhenqing'},
  cabin:{name:'水見曉逐',detail:'獨棟木屋・水岸露臺',image:'cabin-ground'},
};
const LEVELS = {ground:'一樓',upper:'二樓'};

export function mountTour(section, options = {}) {
  const stage=section.querySelector('.tour-stage'),tabs=section.querySelector('.tour-tabs');
  const prices=section.querySelector('.tour-prices');
  section.classList.add('tour-guest');
  let current='estate',level='ground',scene,canvas,pending=false,request=0,rotating=false;
  const poster=document.createElement('div');poster.className='tour-guest-poster';
  const photograph=section.querySelector('.hero3d-load img')||document.createElement('img');
  photograph.decoding='async';photograph.fetchPriority='high';
  poster.append(photograph);stage.prepend(poster);
  tabs.innerHTML=Object.entries(VIEWS).map(([key,view])=>
    `<button type="button" role="tab" id="tour-tab-${key}" aria-controls="tour-stage" data-view="${key}">${view.name}</button>`).join('');
  const actions=document.createElement('div');actions.className='tour-guest-actions';
  actions.innerHTML='<button type="button" data-action="rotate" aria-pressed="false">旋轉看空間</button><button type="button" data-action="enlarge" aria-pressed="false">放大畫面</button>';
  stage.append(actions);
  const rotateButton=actions.querySelector('[data-action="rotate"]'),enlargeButton=actions.querySelector('[data-action="enlarge"]');
  const levels=document.createElement('div');levels.className='tour-levels';levels.setAttribute('role','group');levels.setAttribute('aria-label','水見曉逐樓層');
  levels.innerHTML=Object.entries(LEVELS).map(([key,name])=>`<button type="button" data-level="${key}">${name}</button>`).join('');stage.append(levels);
  const tools=document.createElement('div');tools.className='tour-tools';tools.hidden=true;
  tools.setAttribute('role','group');tools.setAttribute('aria-label','旋轉與縮放');
  tools.innerHTML=[['left','向左旋轉','↶'],['right','向右旋轉','↷'],['out','縮小','−'],['in','放大','＋'],['reset','重設視角','⌂']].map(([key,label,symbol])=>
    `<button type="button" data-tool="${key}" aria-label="${label}" title="${label}">${symbol}</button>`).join('');stage.append(tools);
  const status=document.createElement('p');status.className='tour-guest-status';status.setAttribute('role','status');stage.append(status);
  function showPoster(){
    request++;rotating=false;poster.hidden=false;tools.hidden=true;
    stage.classList.remove('is-rotating');scene?.setAutoRotate(false);scene?.setPaused(true);
    if(canvas)canvas.tabIndex=-1;
    rotateButton.setAttribute('aria-pressed','false');rotateButton.textContent=pending?'正在準備旋轉…':'旋轉看空間';
    section.querySelector('.tour-footer>p').textContent='高清模擬圖・配置為示意';status.textContent='';
  }
  function updateView(key){
    if(!Object.hasOwn(VIEWS,key))return;
    showPoster();current=key;const view=VIEWS[key],suffix=key==='cabin'?'・'+LEVELS[level]:'';
    const image=key==='cabin'?'cabin-'+level:view.image;
    photograph.src='assets/hd-models/'+image+'.png';photograph.alt=view.name+suffix+'高清空間模擬圖';
    stage.dataset.view=key;stage.setAttribute('aria-labelledby','tour-tab-'+key);
    levels.hidden=key!=='cabin';
    levels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level)));
    tabs.querySelectorAll('button').forEach(button=>{
      const selected=button.dataset.view===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    section.querySelector('.tour-current').textContent=view.name+suffix;
    section.querySelector('.tour-detail').textContent=view.detail;
    prices.querySelectorAll('[data-rate]').forEach(row=>{
      const selected=row.dataset.rate===key,button=row.querySelector('button');
      row.classList.toggle('is-current',selected);button.disabled=false;
      button.setAttribute('aria-label','查看'+VIEWS[row.dataset.rate].name+'模擬圖');
      if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    options.onViewChange?.(key);
  }
  function setCabinLevel(next){
    if(next==='all')next='ground';
    if(!Object.hasOwn(LEVELS,next))return;level=next;updateView('cabin');
  }
  async function startRotation(){
    if(pending)return;
    if(rotating){showPoster();return;}
    const selectedRequest=++request;
    pending=true;rotateButton.disabled=true;rotateButton.textContent='正在準備旋轉…';
    status.textContent='正在準備網頁旋轉，模擬圖仍可觀看。';
    try{
      if(!scene){
        const {buildScene}=await import('./scene3d.js?v=20260911-guest1');
        canvas=document.createElement('canvas');canvas.tabIndex=-1;stage.prepend(canvas);
        canvas.setAttribute('aria-description','拖曳或方向鍵旋轉，滾輪或加減鍵縮放，右鍵拖曳或 Shift 加方向鍵平移');
        scene=buildScene(canvas);scene.setPaused(true);
        await scene.ready;
      }
      if(selectedRequest!==request)return;
      scene.setView(current);if(current==='cabin')scene.setCabinLevel(level);
      scene.zoom(0.94);scene.setAutoRotate(false);scene.setPaused(false);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(selectedRequest!==request){scene.setPaused(true);return;}
      rotating=true;poster.hidden=true;tools.hidden=false;stage.classList.add('is-rotating');
      canvas.tabIndex=0;canvas.setAttribute('aria-label',VIEWS[current].name+'可旋轉空間');canvas.focus({preventScroll:true});
      rotateButton.setAttribute('aria-pressed','true');
      section.querySelector('.tour-footer>p').textContent='依照片重建・遮擋面推估，非實測';
      status.textContent='拖曳旋轉 · 滾輪縮放 · 右鍵或雙指平移';
    }catch(error){
      scene?.stop();scene=undefined;canvas?.remove();canvas=undefined;
      if(selectedRequest===request)status.textContent='旋轉暫時無法使用，仍可查看高清模擬圖；點按可重試。';
      console.error(error);
    }finally{
      pending=false;rotateButton.disabled=false;rotateButton.textContent=rotating?'回到模擬圖':'旋轉看空間';
    }
  }
  rotateButton.addEventListener('click',startRotation);
  enlargeButton.addEventListener('click',()=>{
    const expanded=section.classList.toggle('tour-enlarged');
    enlargeButton.setAttribute('aria-pressed',String(expanded));enlargeButton.textContent=expanded?'縮回畫面':'放大畫面';
    stage.scrollIntoView({block:'center',behavior:'instant'});
  });
  levels.addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button)setCabinLevel(button.dataset.level);});
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)updateView(button.dataset.view);});
  prices.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)updateView(button.dataset.room);});
  tools.addEventListener('click',event=>{
    const action=event.target.closest('[data-tool]')?.dataset.tool;
    if(action==='left')scene.orbit(-Math.PI/8);
    if(action==='right')scene.orbit(Math.PI/8);
    if(action==='in')scene.zoom(0.8);
    if(action==='out')scene.zoom(1.25);
    if(action==='reset')scene.reset();
  });
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(index<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();updateView(buttons[next].dataset.view);
  });
  photograph.addEventListener('error',()=>{status.textContent='圖片尚未載入，請重新整理頁面。';});
  updateView('estate');section.classList.add('ready');
  return {setView:updateView,setCabinLevel};
}
