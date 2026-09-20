(() => {
  'use strict';
  const id = window.SHANYU_GA4_ID || '';
  const production = ['shanyu2015.com', 'www.shanyu2015.com'].includes(location.hostname);
  window.shanyuAnalyticsStatus = !/^G-[A-Z0-9]{6,15}$/.test(id) ? 'pending_configuration' : !production ? 'disabled_preview' : 'configured';
  if (window.shanyuAnalyticsStatus !== 'configured') return;

  // Only public, fixed site paths and controlled labels enter analytics.
  // Never include query strings, hashes, destination URLs or user-entered text.
  const pages = {
    '/': '山遇莊園民宿', '/index.html': '山遇莊園民宿',
    '/main-building.html': '花蓮壽豐11人包棟', '/cabin.html': '花蓮壽豐獨棟木屋',
    '/tour.html': '山遇空間預覽'
  };
  const path = Object.hasOwn(pages, location.pathname) ? location.pathname : '/';
  const page = { page_location: `https://shanyu2015.com${path}`, page_title: pages[path], page_referrer: '' };
  try { page.page_referrer = new URL(document.referrer).origin; } catch (_) { /* Direct visit. */ }
  const campaign = new URLSearchParams(location.search);
  const sources = ['google', 'facebook', 'instagram', 'line', 'twstay'];
  const media = ['organic', 'social', 'referral', 'cpc'];
  const campaigns = ['business_profile', 'main_building', 'cabin'];
  if (sources.includes(campaign.get('utm_source'))) page.campaign_source = campaign.get('utm_source');
  if (media.includes(campaign.get('utm_medium'))) page.campaign_medium = campaign.get('utm_medium');
  if (campaigns.includes(campaign.get('utm_campaign'))) page.campaign_name = campaign.get('utm_campaign');

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    ...page, send_page_view: false,
    allow_google_signals: false, allow_ad_personalization_signals: false
  });
  window.gtag('event', 'page_view', { ...page, send_to: id });
  const script = document.createElement('script');
  script.async = true;
  script.referrerPolicy = 'origin';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.append(script);

  const rooms = ['main-building', 'cabin', 'yunsidai', 'lihalai', 'zhenqing', 'all'];
  const placements = ['hero', 'room-card', 'comparison', 'footer', 'sticky', 'nav', 'faq', 'landing-hero', 'landing-details'];
  const allowedEvents = ['line_click', 'phone_click', 'room_select'];
  const send = (event, room, placement) => window.gtag('event', event, {
    ...page, send_to: id, room: rooms.includes(room) ? room : 'all',
    placement: placements.includes(placement) ? placement : 'other', transport_type: 'beacon'
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-track]');
    if (!link || !allowedEvents.includes(link.dataset.track)) return;
    send(link.dataset.track, link.dataset.room, link.dataset.placement);
  });
  if ('IntersectionObserver' in window) {
    const viewed = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const room = entry.target.dataset.roomView;
        if (!entry.isIntersecting || entry.intersectionRatio < .5 || !rooms.includes(room) || viewed.has(room)) return;
        viewed.add(room);
        send('room_view', room, entry.target.dataset.placement);
        observer.unobserve(entry.target);
      });
    }, { threshold: .5 });
    document.querySelectorAll('[data-room-view]').forEach(element => observer.observe(element));
  }
})();
