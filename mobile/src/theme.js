export const C = { ink: '#121212', grey: '#737373', card: '#f4f4f2', line: '#e4e4e7', bg: '#fff', idle: '#b8b8b5' };
export const serif = { fontFamily: 'Georgia' };
// name, colour, glyph
export const AGENTS = {
  planning: ['Planning', '#3b82f6', '●'], scout: ['Scout', '#22b455', '★'], shotlist: ['Shot list', '#f5c518', '■'],
  editing: ['Editing', '#ff4f8b', '▲'], review: ['Review', '#8b5cf6', '✤'], posting: ['Posting', '#ff8a3d', '⬢'],
};
export const busy = a => a.status === 'Working' || a.status === 'Needs you';
export const tone = (k, a) => (a.status === 'Waiting' ? C.idle : AGENTS[k][1]);
