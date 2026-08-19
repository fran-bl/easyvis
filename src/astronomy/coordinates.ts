export function angularSeparation(
    ra1H: number,
    dec1Deg: number,
    ra2H: number,
    dec2Deg: number
) {
    const ra1 = (ra1H * 15.0 * Math.PI) / 180.0;
    const ra2 = (ra2H * 15.0 * Math.PI) / 180.0;
    const d1 = (dec1Deg * Math.PI) / 180.0;
    const d2 = (dec2Deg * Math.PI) / 180.0;
    const cosSep = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(ra1 - ra2);
    const clamped = Math.max(-1.0, Math.min(1.0, cosSep));
    return (Math.acos(clamped) * 180.0) / Math.PI;
}