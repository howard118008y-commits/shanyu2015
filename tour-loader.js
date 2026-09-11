import { mountTour as mountReconstruction } from './tour-reconstruction-ui.js?v=20260911-rebuild1';

export async function mountTour(section, options = {}) {
  const api = await mountReconstruction(section, options);
  const params = new URLSearchParams(location.search);
  const view = params.get('view'), level = params.get('level');
  if(['estate','yunsidai','lihalai','zhenqing','cabin'].includes(view)) api.setView(view);
  if(view === 'cabin' && ['all','ground','upper'].includes(level)) api.setCabinLevel(level);
  return api;
}
