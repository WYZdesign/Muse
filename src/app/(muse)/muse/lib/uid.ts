let _idCounter = 0;

export function uid(): number {
  _idCounter = (_idCounter + 1) % 1000;
  return Date.now() * 1000 + _idCounter;
}
