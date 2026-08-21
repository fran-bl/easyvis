import * as THREE from "three";


export function horizontalToVector(altitude: number, azimuth: number, radius = 100): THREE.Vector3 {
    const alt = THREE.MathUtils.degToRad(altitude);
    const az = THREE.MathUtils.degToRad(azimuth);

    return new THREE.Vector3(
        radius * Math.cos(alt) * Math.sin(az),
        radius * Math.sin(alt),
        -radius * Math.cos(alt) * Math.cos(az)
    );
}