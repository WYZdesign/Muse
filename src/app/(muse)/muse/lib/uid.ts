let _idCounter = 0;
let _lastTimestamp = 0;

export function uid(): number {
  const now = Date.now();
  if (now === _lastTimestamp) {
    _idCounter++;
  } else {
    _lastTimestamp = now;
    _idCounter = 0;
  }
  return now * 10000 + _idCounter;
}
