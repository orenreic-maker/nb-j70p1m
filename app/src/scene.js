import brand from './brand.json';

export const WORDMARK = brand.name;

export function mark(size = 26, dark = false) {
  const ink = dark ? '#EFE7D8' : '#2F3A2B';
  const h = Math.round(size * 20 / 26);
  return `<svg class="ic" width="${size}" height="${h}" viewBox="0 0 26 20" fill="none" stroke-linecap="round" aria-hidden="true"><path d="M6 14.5a7 7 0 0 1 14 0" fill="#EBA96A"/><path d="M1.5 15.2c4-2.6 8.5-3.4 11.5-2.4s7.5.2 11.5-1.6" stroke="${ink}" stroke-width="1.6"/><path d="M4 18.8c3-1 6-1 9 0s6 1 9 0" stroke="${ink}" stroke-width="1.4" opacity=".5"/><path d="M13 5V1.5M8 6.5 6.5 4M18 6.5 19.5 4" stroke="#C4623F" stroke-width="1.5"/></svg>`;
}

export function wordmark(size = 17, dark = false) {
  const c = dark ? '#EFE7D8' : '#2F3A2B';
  return `<span class="wordmark">${mark(Math.round(size * 1.5), dark)}<bdi dir="ltr" class="wm-name num-ltr" style="font:600 ${size}px/1 'Plex Hebrew',sans-serif;letter-spacing:-.2px;color:${c}">${WORDMARK}</bdi></span>`;
}

export function scene(w = 390, h = 430, dark = false, stones = 4, total = 7) {
  const s = w / 390;
  let sky;
  let orb;
  let hills;
  let stone;
  let cur;
  let ink;
  if (dark) {
    sky = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121815"/><stop offset=".75" stop-color="#1D2622"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sk)"/>`;
    orb = `<circle cx="92" cy="226" r="40" fill="#E9A262" opacity=".92"/><circle cx="92" cy="226" r="64" fill="#E9A262" opacity=".08"/><g fill="#EFE7D8">${[[40, 110, 1.2, .7], [150, 80, 1, .5], [210, 140, 1.4, .6], [300, 96, 1, .45], [350, 150, 1.2, .6], [250, 60, .9, .4], [120, 160, .9, .5]].map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`).join('')}</g>`;
    hills = ['#2A3530', '#33443A', '#3E5446'];
    stone = '#EFE7D8'; cur = '#D9714C'; ink = '#A9C2A1';
  } else {
    sky = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7DCC6"/><stop offset=".7" stop-color="#F1E6D3"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sk)"/>`;
    orb = `<circle cx="92" cy="232" r="46" fill="#EBA96A"/><circle cx="92" cy="232" r="70" fill="#EBA96A" opacity=".18"/><circle cx="92" cy="232" r="98" fill="#EBA96A" opacity=".09"/><g fill="none" stroke="#2F3A2B" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M40 128q6-6 12 0q6-6 12 0"/><path d="M78 108q4.5-4.5 9 0q4.5-4.5 9 0"/><path d="M24 156q4-4 8 0q4-4 8 0"/></g>`;
    hills = ['#C9C9A6', '#94A88C', '#6E8768'];
    stone = '#F6EFE3'; cur = '#C4623F'; ink = '#2F3A2B';
  }
  const pts = [[168, 412], [207, 394], [246, 379], [283, 358], [316, 349], [346, 344], [374, 342]].slice(0, total);
  let dots = '';
  pts.forEach(([x, y], i) => {
    if (i < stones - 1) dots += `<circle cx="${x}" cy="${y}" r="5" fill="${stone}"/>`;
    else if (i === stones - 1) dots += `<circle cx="${x}" cy="${y}" r="6.5" fill="${cur}" stroke="${stone}" stroke-width="2.5"/>`;
    else dots += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${stone}" stroke-width="1.5"/>`;
  });
  const g = `<g transform="translate(0 ${h - 430}) scale(${s} 1)"><path d="M0 300C60 262 120 250 190 270S310 240 390 252V430H0Z" fill="${hills[0]}"/><path d="M0 330C80 300 150 318 220 300S330 280 390 296V430H0Z" fill="${hills[1]}"/><path d="M0 372C70 344 160 360 240 346S350 336 390 346V430H0Z" fill="${hills[2]}"/><path d="M150 430C170 404 230 396 250 376S300 352 330 346" fill="none" stroke="${stone}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round" opacity=".9"/>${dots}<g stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M44 352v-26"/><path d="M44 336c-8-2-12-9-12-16 8 1 12 7 12 16Zm0-6c7-2 11-8 11-15-7 1-11 6-11 15Z" fill="${hills[1]}"/></g></g>`;
  const orbG = `<g transform="translate(0 ${h - 430})">${orb}</g>`;
  return `<svg class="scene-svg" width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${sky}${orbG}${g}</svg>`;
}

/** Home sky. Hills run off the bottom of the box; a CSS mask fades them into the page. */
export function sceneCompact(dark = false, stones = 4, total = 7) {
  const w = 390;
  const h = 280;
  const sky = dark
    ? `<defs><linearGradient id="skc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121815"/><stop offset=".55" stop-color="#1B2420"/><stop offset="1" stop-color="#151B17"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#skc)"/>`
    : `<defs><linearGradient id="skc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4D7BE"/><stop offset=".5" stop-color="#F1E6D3"/><stop offset="1" stop-color="#F6EFE3"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#skc)"/>`;
  const sun = dark ? '#E9A262' : '#EBA96A';
  const hills = dark ? ['#2A3530', '#33443A', '#3E5446'] : ['#C9C9A6', '#94A88C', '#6E8768'];
  const stone = dark ? '#EFE7D8' : '#F6EFE3';
  const cur = dark ? '#D9714C' : '#C4623F';
  const ink = dark ? '#A9C2A1' : '#2F3A2B';
  const bird = dark ? '#EFE7D8' : '#2F3A2B';
  const orb = `<circle cx="196" cy="58" r="44" fill="${sun}" opacity=".14"/><circle cx="196" cy="58" r="28" fill="${sun}"/>`;
  const stars = dark
    ? `<g fill="#EFE7D8">${[[78, 46, 1.1, .5], [108, 30, .9, .4], [300, 36, 1.2, .45], [332, 54, .8, .35]].map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`).join('')}</g>`
    : `<g fill="none" stroke="${bird}" stroke-width="1.5" stroke-linecap="round" opacity=".4"><path d="M78 44q5-5 10 0q5-5 10 0"/><path d="M108 30q4-4 8 0q4-4 8 0"/></g>`;
  const ground = `<path d="M0 94C80 80 150 98 220 86S330 82 390 94V${h}H0Z" fill="${hills[0]}"/><path d="M0 114C90 100 170 118 250 106S340 110 390 118V${h}H0Z" fill="${hills[1]}"/><path d="M0 136C100 122 190 140 280 128S350 132 390 140V${h}H0Z" fill="${hills[2]}"/>`;
  const pts = [[148, 110], [184, 104], [220, 100], [254, 96], [288, 94], [320, 93], [350, 92]].slice(0, total);
  let dots = `<path d="M128 118C168 108 214 100 262 96S324 92 358 93" fill="none" stroke="${stone}" stroke-width="1.7" stroke-dasharray="1.6 6" stroke-linecap="round" opacity=".85"/>`;
  pts.forEach(([x, y], i) => {
    if (i < stones - 1) dots += `<circle cx="${x}" cy="${y}" r="4.5" fill="${stone}"/>`;
    else if (i === stones - 1) dots += `<circle cx="${x}" cy="${y}" r="5.4" fill="${cur}" stroke="${stone}" stroke-width="2"/>`;
    else dots += `<circle cx="${x}" cy="${y}" r="3.6" fill="none" stroke="${stone}" stroke-width="1.4"/>`;
  });
  const sprout = `<g stroke="${ink}" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M46 114V94"/><path d="M46 104c-7-1-10-7-10-12 7 1 10 6 10 12Zm0-5c6-1 9-6 9-11-6 1-9 5-9 11Z" fill="${hills[1]}"/></g>`;
  return `<svg class="scene-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${sky}${stars}${orb}${ground}${dots}${sprout}</svg>`;
}
