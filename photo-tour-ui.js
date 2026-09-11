const VIEWS = {
  estate:{name:'莊園全景',detail:'雙池・L 型玻璃雨遮・雙鞦韆',image:'estate'},
  yunsidai:{name:'雲絲帶',detail:'一張雙人床・一張單人床',image:'yunsidai'},
  lihalai:{name:'里哈籟',detail:'兩張雙人床・低木平台',image:'lihalai'},
  zhenqing:{name:'山遇真情',detail:'兩張雙人床・四人房',image:'zhenqing'},
  cabin:{name:'水見曉逐',detail:'獨棟木屋・水岸露臺',image:'cabin-ground'},
};
const LEVELS={ground:'一樓',upper:'二樓'};

export function mountTour(section,options={}) {
  const stage=section.querySelector('.tour-stage'),tabs=section.querySelector('.tour-tabs'),prices=section.querySelector('.tour-prices');
  section.classList.add('tour-guest','tour-photo3d');
  let current='estate',level='ground',sequence=0,scene,scenePromise,automatic=false;
  const poster=document.createElement('div');poster.className='tour-guest-poster';
  const photograph=section.querySelector('.hero3d-load img')||document.createElement('img');
  photograph.decoding='async';photograph.fetchPriority='high';poster.append(photograph);stage.prepend(poster);
  const canvas=document.createElement('canvas');canvas.tabIndex=-1;
  canvas.setAttribute('aria-description','方向鍵或拖曳可小角度旋轉，滾輪、加減鍵或雙指可縮放，Home 回到正面');stage.prepend(canvas);
  tabs.innerHTML=Object.entries(VIEWS).map(([key,view])=>`<button type="button" role="tab" id="tour-tab-${key}" aria-controls="tour-stage" data-view="${key}">${view.name}</button>`).join('');
  const actions=document.createElement('div');actions.className='tour-guest-actions';
  actions.innerHTML='<button type="button" data-action="rotate" aria-pressed="false" disabled>準備迴轉</button><button type="button" data-action="enlarge" aria-pressed="false">放大畫面</button><button type="button" data-action="reset" disabled>回到正面</button>';stage.append(actions);
  const rotateButton=actions.querySelector('[data-action="rotate"]'),resetButton=actions.querySelector('[data-action="reset"]');
  const levels=document.createElement('div');levels.className='tour-levels';levels.setAttribute('role','group');levels.setAttribute('aria-label','水見曉逐樓層');
  levels.innerHTML=Object.entries(LEVELS).map(([key,name])=>`<button type="button" data-level="${key}">${name}</button>`).join('');stage.append(levels);
  const status=document.createElement('p');status.className='tour-guest-status';status.setAttribute('role','status');stage.append(status);
  section.querySelector('.tour-footer>p').textContent='原圖深度立體・小角度迴轉，非 360° 全景';
  function onAutoRotateChange(value){
    automatic=value;rotateButton.setAttribute('aria-pressed',String(value));rotateButton.textContent=value?'暫停迴轉':'開始迴轉';
  }
  async function displayDepth(image){
    const selection=++sequence;
    poster.hidden=false;stage.classList.remove('is-rotating');canvas.tabIndex=-1;
    rotateButton.disabled=true;resetButton.disabled=true;status.textContent='';
    try{
      if(!scenePromise)scenePromise=import('./photo-depth-scene.js?v=20260911-photo3d1').then(({createPhotoScene})=>{
        scene=createPhotoScene(canvas,{onAutoRotateChange});return scene;
      }).catch(error=>{scenePromise=undefined;throw error;});
      const viewer=await scenePromise;
      if(selection!==sequence)return;
      const loaded=await viewer.setImage(image);
      if(!loaded||selection!==sequence)return;
      poster.hidden=true;stage.classList.add('is-rotating');canvas.tabIndex=0;
      canvas.setAttribute('aria-label',VIEWS[current].name+(current==='cabin'?'・'+LEVELS[level]:'')+'高清深度立體圖');
      rotateButton.disabled=false;resetButton.disabled=false;onAutoRotateChange(automatic);
      status.textContent='拖曳查看立體視角 · 滾輪或雙指放大';
    }catch(error){
      if(selection===sequence){status.textContent='目前顯示高清原圖；此瀏覽器暫時無法播放立體效果。';rotateButton.textContent='高清原圖';}
      console.error(error);
    }
  }
  function setView(key){
    if(!Object.hasOwn(VIEWS,key))return;
    current=key;const view=VIEWS[key],suffix=key==='cabin'?'・'+LEVELS[level]:'';
    const image=key==='cabin'?'cabin-'+level:view.image;
    photograph.src='assets/hd-models/'+image+'.png';photograph.alt=view.name+suffix+'高清立體模擬圖';
    stage.dataset.view=key;stage.setAttribute('aria-labelledby','tour-tab-'+key);levels.hidden=key!=='cabin';
    levels.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.level===level)));
    tabs.querySelectorAll('button').forEach(button=>{
      const selected=button.dataset.view===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    });
    section.querySelector('.tour-current').textContent=view.name+suffix;section.querySelector('.tour-detail').textContent=view.detail;
    prices.querySelectorAll('[data-rate]').forEach(row=>{
      const selected=row.dataset.rate===key,button=row.querySelector('button');row.classList.toggle('is-current',selected);button.disabled=false;
      button.setAttribute('aria-label','查看'+VIEWS[row.dataset.rate].name+'高清立體圖');
      if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    options.onViewChange?.(key);displayDepth(image);
  }
  function setCabinLevel(next){
    if(next==='all')next='ground';
    if(!Object.hasOwn(LEVELS,next))return;level=next;setView('cabin');
  }
  rotateButton.addEventListener('click',()=>scene?.setAutoRotate(!automatic));
  resetButton.addEventListener('click',()=>scene?.reset());
  actions.querySelector('[data-action="enlarge"]').addEventListener('click',event=>{
    const expanded=section.classList.toggle('tour-enlarged');
    event.currentTarget.setAttribute('aria-pressed',String(expanded));event.currentTarget.textContent=expanded?'縮回畫面':'放大畫面';stage.scrollIntoView({block:'center',behavior:'instant'});
  });
  levels.addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button)setCabinLevel(button.dataset.level);});
  tabs.addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)setView(button.dataset.view);});
  prices.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)setView(button.dataset.room);});
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=[...tabs.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(index<0)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();setView(buttons[next].dataset.view);
  });
  photograph.addEventListener('error',()=>{status.textContent='圖片尚未載入，請重新整理頁面。';});
  setView('estate');section.classList.add('ready');
  return {setView,setCabinLevel};
}
