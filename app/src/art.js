const SPOT = {
  lungs: 'lungs', heart: 'heart', brain: 'brain', moon: 'moon',
  breath: 'breath', goal: 'goal', slip: 'slip', share: 'share',
  growth: 'sprout', sprout: 'sprout', journal: 'journal',
  medal: 'medal', empty: 'empty', money: 'jar', jar: 'jar',
};

export function spot(name, size = 48) {
  const id = SPOT[name];
  if (!id) return '';
  return `<img class="spot" src="art/spots/spot-${id}.webp" width="${size}" height="${size}" alt="" decoding="async">`;
}

export function hasSpot(name) {
  return !!SPOT[name];
}

const TAB = { home: 'today', health: 'health', badges: 'growth', journal: 'journal', settings: 'settings' };

export function tabIcon(route, on) {
  const id = TAB[route] || 'today';
  return `<img class="tabart" src="art/tabs/tab-${id}-${on ? 'active' : 'inactive'}-96.webp" width="32" height="32" alt="" decoding="async">`;
}
