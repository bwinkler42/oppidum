const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export const modes = {
  move: {move: [1, 3600]},
  fischer: {main: [1, 86400],increment: [0, 600]},
  delay: {main: [1, 86400],delay: [0, 600]},
  absolute: {main: [1, 86400]},
  byo: {main: [0, 86400],period: [1, 3600],periods: [1, 20]},
  free: {}
};
export function validateSettings(data) {
  if (![6,8,10].includes(data.size) || !Object.hasOwn(modes,data.mode)) throw Error('Ungültige Partieeinstellung.');
  const settings = {size:data.size,mode:data.mode};
  for (const [key,[min,max]] of Object.entries(modes[data.mode])) {
    if (!integer(data[key],min,max)) throw Error('Zeitwert außerhalb des erlaubten Bereichs.');
    settings[key] = data[key];
  }
  return settings;
}
export function initialClock(settings) {
  return {main:(settings.main ?? 0)*1000,periods:settings.periods ?? 0};
}
export function deadline(settings,clock,started) {
  if (started===null || settings.mode==='free') return null;
  return started + (settings.mode==='move' ? settings.move*1000 :
    clock.main+(settings.delay??0)*1000+clock.periods*(settings.period??0)*1000);
}
export function spend(settings,clock,elapsed) {
  const next={...clock};
  if (settings.mode==='move'||settings.mode==='free') return next;
  next.main=Math.max(0,clock.main-Math.max(0,elapsed-(settings.delay??0)*1000));
  if (settings.mode==='fischer') next.main+=settings.increment*1000;
  if (settings.mode==='byo'&&elapsed>clock.main) {
    next.periods-=Math.max(0,Math.floor((elapsed-clock.main)/(settings.period*1000)));
  }
  return next;
}
