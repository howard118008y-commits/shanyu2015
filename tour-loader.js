const VIEWS = ['estate','yunsidai','lihalai','zhenqing','cabin'];

export async function mountTour(section, options = {}) {
  const params = new URLSearchParams(location.search);
  let api;
  if(params.get('mode') === 'hd') {
    const module = await import('./tour-hd-ui.js?v=20260911-hd2');
    api = module.mountTour(section, options);
  } else {
    try {
      const module = await import('./tour-ui.js?v=20260911-mesh1');
      api = module.mountTour(section, options);
    } catch(error) {
      console.error(error);
      section.querySelectorAll('.tour-reference,.tour-tools,.tour-photo-dialog,.tour-levels,.tour-mesh-actions,.tour-mesh-status').forEach(element=>element.remove());
      const module = await import('./tour-hd-ui.js?v=20260911-hd2');
      api = module.mountTour(section, options);
      const status = document.createElement('p');
      status.className = 'tour-mesh-status';
      status.setAttribute('role','status');
      status.textContent = '此裝置未能載入互動 3D，目前顯示高清靜態圖。';
      section.querySelector('.tour-stage').append(status);
    }
  }
  const view = params.get('view'), level = params.get('level');
  if(VIEWS.includes(view)) api.setView(view);
  if(view === 'cabin' && ['ground','upper'].includes(level)) api.setCabinLevel(level);
  return api;
}
