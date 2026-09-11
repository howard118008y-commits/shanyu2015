import { mountTour as mountHD } from './tour-hd-ui.js?v=20260911-original1';

export async function mountTour(section, options = {}) {
  const api = mountHD(section, options);
  const params = new URLSearchParams(location.search);
  const view = params.get('view'), level = params.get('level');
  if(['estate','yunsidai','lihalai','zhenqing','cabin'].includes(view)) api.setView(view);
  if(view === 'cabin' && ['ground','upper'].includes(level)) api.setCabinLevel(level);
  return api;
}
