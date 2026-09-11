import { mountTour as mountPhotoTour } from './photo-tour-ui.js?v=20260911-photo3d1';

export async function mountTour(section, options = {}) {
  const api = mountPhotoTour(section, options);
  const params = new URLSearchParams(location.search);
  const view = params.get('view'), level = params.get('level');
  if(['estate','yunsidai','lihalai','zhenqing','cabin'].includes(view)) api.setView(view);
  if(view === 'cabin' && ['all','ground','upper'].includes(level)) api.setCabinLevel(level);
  return api;
}
