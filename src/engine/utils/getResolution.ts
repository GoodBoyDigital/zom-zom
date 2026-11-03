export function getResolution(): number {
  // ?res=1 forces a render resolution (handy for software-GPU testing and slow machines).
  const forced = Number(new URLSearchParams(window.location.search).get("res"));
  if (forced > 0) return forced;

  let resolution = Math.max(window.devicePixelRatio, 2);

  if (resolution % 1 !== 0) {
    resolution = 2;
  }

  return resolution;
}
