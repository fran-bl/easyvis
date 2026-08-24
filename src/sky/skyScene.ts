import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { horizontalToVector } from "./coordinates3d";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { Target } from "../astronomy/targets";


type SkyColorStop = { altitude: number; color: THREE.Color };
type Label = { marker: THREE.Object3D; label: CSS2DObject };

function localDirectionFromUV(u: number, v: number): THREE.Vector3 {
    const theta = v * Math.PI;
    const phi = u * 2 * Math.PI;

    return new THREE.Vector3(
        -Math.cos(phi) * Math.sin(theta),
        Math.cos(theta),
        -Math.sin(phi) * Math.sin(theta),
    );
}

function localDirectionFromEquatorial(raHours: number, decDeg: number): THREE.Vector3 {
    let u = 0.5 - raHours / 24;
    u = ((u % 1) + 1) % 1;
    const v = (90 - decDeg) / 180;

    return localDirectionFromUV(u, v);
}

function projectPerpendicular(v: THREE.Vector3, axis: THREE.Vector3): THREE.Vector3 {
    const a = axis.clone().normalize();
    return v.clone().sub(a.multiplyScalar(v.dot(a)));
}

const SKY_COLOR_STOPS: SkyColorStop[] = [
    { altitude: -18, color: new THREE.Color(0x02040a) },
    { altitude: -12, color: new THREE.Color(0x0a1128) },
    { altitude: -6, color: new THREE.Color(0x1e3a5f) },
    { altitude: -3, color: new THREE.Color(0x4a6fa5) },
    { altitude: 0, color: new THREE.Color(0x87a8cc) },
    { altitude: 10, color: new THREE.Color(0x8ecae6) },
    { altitude: 30, color: new THREE.Color(0x87ceeb) },
];

function smoothstep01(t: number): number {
    const c = THREE.MathUtils.clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
}

function skyColorForSunAltitude(altitudeDeg: number): THREE.Color {
    const stops = SKY_COLOR_STOPS;

    if (altitudeDeg <= stops[0].altitude) {
        return stops[0].color.clone();
    }

    if (altitudeDeg >= stops[stops.length - 1].altitude) {
        return stops[stops.length - 1].color.clone();
    }

    for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        if (altitudeDeg >= a.altitude && altitudeDeg <= b.altitude) {
            const t = smoothstep01((altitudeDeg - a.altitude) / (b.altitude - a.altitude));
            return a.color.clone().lerp(b.color, t);
        }
    }

    return stops[stops.length - 1].color.clone();
}

export class SkyScene {
    target: Target;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    controls: OrbitControls;

    private body: THREE.Mesh;
    private sun: THREE.Mesh;
    private sunGlow: THREE.Sprite;
    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private skyDome!: THREE.Mesh;
    private starSphere: THREE.Mesh | null = null;
    private bodyLabelGroup: THREE.Group;
    private pointLabels: Array<Label> = [];

    private static readonly REFERENCE_STAR_RA_HOURS = 6.752477;
    private static readonly REFERENCE_STAR_DEC_DEG = -16.716117;
    private static readonly MOON_MEAN_DISTANCE_AU = 0.00257;
    private static readonly SUN_MEAN_DISTANCE_AU = 1.0;
    private static readonly MOON_BASE_SIZE = 0.4515;
    private static readonly SUN_BASE_SIZE = 0.474075;
    private static readonly BODY_BASE_SIZE = 0.1;

    constructor(container: HTMLElement, target: Target) {
        this.target = target;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x02040a);

        this.camera = new THREE.PerspectiveCamera(20, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0.001);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
        this.labelRenderer.domElement.style.position = "absolute";
        this.labelRenderer.domElement.style.inset = "0";
        this.labelRenderer.domElement.style.pointerEvents = "none";

        container.appendChild(this.renderer.domElement);
        container.appendChild(this.labelRenderer.domElement);

        this.renderer.domElement.addEventListener("wheel", this.handleZoom, { passive: false });

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        this.controls.rotateSpeed = -0.2;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.createSkyDome();
        this.createHorizon();
        this.createReferencePoints();

        this.ambientLight = new THREE.AmbientLight(0x223344, 0.15);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
        this.sunLight.target.position.set(0, 0, 0);
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        if (this.target.name === "Moon") {
            this.body = this.createLitBody(0xffffff, SkyScene.MOON_BASE_SIZE);
        } else {
            this.body = this.createBody(0xffffff, SkyScene.BODY_BASE_SIZE);
        }

        this.sun = this.createBody(0xffcc55, SkyScene.SUN_BASE_SIZE);
        this.sunGlow = this.createSunGlow();
        this.sunGlow.scale.set(15, 15, 1);

        this.body.renderOrder = 2;
        this.sun.renderOrder = 1;
        this.sunGlow.renderOrder = 3;
        this.skyDome.renderOrder = -2;

        this.scene.add(this.body);
        this.scene.add(this.sun);
        this.scene.add(this.sunGlow);

        this.bodyLabelGroup = new THREE.Group();
        this.scene.add(this.bodyLabelGroup);

        const bodyLabelEl = document.createElement("div");
        bodyLabelEl.className = "point-label";
        bodyLabelEl.textContent = this.target.name;

        const bodyLabel = new CSS2DObject(bodyLabelEl);
        this.bodyLabelGroup.add(bodyLabel);

        this.animate();
    }

    loadStarSphere(textureUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                textureUrl,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.repeat.x = -1;
                    texture.needsUpdate = true;

                    const geometry = new THREE.SphereGeometry(105, 64, 32);
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.BackSide,
                        depthWrite: false,
                    });

                    if (this.starSphere) {
                        this.scene.remove(this.starSphere);
                        this.starSphere.geometry.dispose();
                        (this.starSphere.material as THREE.MeshBasicMaterial).map?.dispose();
                        (this.starSphere.material as THREE.MeshBasicMaterial).dispose();
                    }

                    this.starSphere = new THREE.Mesh(geometry, material);
                    this.starSphere.renderOrder = -1;
                    this.scene.add(this.starSphere);
                    resolve();
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    setStarSphereOrientation(
        poleHorizontal: { altitude: number; azimuth: number },
        referenceHorizontal: { altitude: number; azimuth: number },
    ) {
        if (!this.starSphere) {
            return;
        }

        const localPoleDir = localDirectionFromEquatorial(0, 90);
        const localReferenceDir = localDirectionFromEquatorial(
            SkyScene.REFERENCE_STAR_RA_HOURS,
            SkyScene.REFERENCE_STAR_DEC_DEG,
        );

        const worldPoleDir = horizontalToVector(poleHorizontal.altitude, poleHorizontal.azimuth, 1).normalize();
        const worldReferenceDir = horizontalToVector(referenceHorizontal.altitude, referenceHorizontal.azimuth, 1).normalize();

        const q1 = new THREE.Quaternion().setFromUnitVectors(localPoleDir.normalize(), worldPoleDir);
        const rotatedReference = localReferenceDir.clone().normalize().applyQuaternion(q1);
        const projRotated = projectPerpendicular(rotatedReference, worldPoleDir).normalize();
        const projWorld = projectPerpendicular(worldReferenceDir, worldPoleDir).normalize();

        let twistAngle = projRotated.angleTo(projWorld);
        const cross = new THREE.Vector3().crossVectors(projRotated, projWorld);

        if (cross.dot(worldPoleDir) < 0) {
            twistAngle = -twistAngle;
        }

        const q2 = new THREE.Quaternion().setFromAxisAngle(worldPoleDir, twistAngle);

        this.starSphere.quaternion.copy(q2.multiply(q1));
    }

    private createSkyDome() {
        const geometry = new THREE.SphereGeometry(105, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x050812, side: THREE.BackSide, transparent: true, depthWrite: false });
        const dome = new THREE.Mesh(geometry, material);

        this.skyDome = dome;
        this.scene.add(dome);
    }

    private createHorizon() {
        const points = new THREE.Path().absarc(0, 0, 105, 0, Math.PI * 2).getSpacedPoints(64);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x888888 });
        const horizon = new THREE.LineLoop(geometry, material);

        horizon.rotation.x = -Math.PI / 2;

        this.scene.add(horizon);
    }

    private createReferencePoints() {
        const referencePoints: Array<{ name: string; altitude: number; azimuth: number; shape?: "plus" }> = [
            { name: "N", altitude: 0, azimuth: 0 },
            { name: "NE", altitude: 0, azimuth: 45 },
            { name: "E", altitude: 0, azimuth: 90 },
            { name: "SE", altitude: 0, azimuth: 135 },
            { name: "S", altitude: 0, azimuth: 180 },
            { name: "SW", altitude: 0, azimuth: 225 },
            { name: "W", altitude: 0, azimuth: 270 },
            { name: "NW", altitude: 0, azimuth: 315 },
            { name: "", altitude: 90, azimuth: 0, shape: "plus" },
            { name: "", altitude: -90, azimuth: 0, shape: "plus" },
        ];

        for (const point of referencePoints) {
            const position = horizontalToVector(point.altitude, point.azimuth, 105);
            const marker = point.shape === "plus"
                ? this.createPlusMarker(0x888888, 1.5, 0.1)
                : this.createDotMarker(0x888888, 0.1);

            const labelEl = document.createElement("div");
            labelEl.className = "point-label";
            labelEl.textContent = point.name;

            const label = new CSS2DObject(labelEl);
            label.position.set(0, -1.0, 0);

            marker.add(label);
            marker.position.copy(position);
            this.pointLabels.push({ marker, label });

            this.scene.add(marker);
        }
    }

    private createDotMarker(color: number, size: number): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(size, 10, 10);
        const material = new THREE.MeshBasicMaterial({ color });

        return new THREE.Mesh(geometry, material);
    }

    private createPlusMarker(color: number, armLength: number, armThickness: number): THREE.Group {
        const group = new THREE.Group();
        const material = new THREE.MeshBasicMaterial({ color });

        const armX = new THREE.Mesh(new THREE.BoxGeometry(armLength, armThickness, armThickness), material);
        const armZ = new THREE.Mesh(new THREE.BoxGeometry(armThickness, armThickness, armLength), material);

        group.add(armX);
        group.add(armZ);

        return group;
    }

    private updateSkyColor(sunAltitude: number) {
        const color = skyColorForSunAltitude(sunAltitude);

        (this.skyDome.material as THREE.MeshBasicMaterial).color.copy(color);
        this.scene.background = color;
    }

    private updatePointLabels() {
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);

        for (const { marker, label } of this.pointLabels) {
            const markerDirection = marker.position.clone().normalize();
            label.visible = cameraDirection.dot(markerDirection) > 0;
        }
    }

    private createBody(color: number, size: number): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(size, 64, 64);
        const material = new THREE.MeshBasicMaterial({ color });

        return new THREE.Mesh(geometry, material);
    }

    private createLitBody(color: number, size: number): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(size, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 1,
            metalness: 0,
        });

        return new THREE.Mesh(geometry, material);
    }

    private createSunGlow(): THREE.Sprite {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d")!;
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

        gradient.addColorStop(0.0, "rgba(255,255,255,1.0)");
        gradient.addColorStop(0.2, "rgba(255,238,200,0.85)");
        gradient.addColorStop(0.5, "rgba(255,214,140,0.25)");
        gradient.addColorStop(0.8, "rgba(255,214,140,0.1)");
        gradient.addColorStop(1.0, "rgba(255,200,120,0.0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            opacity: 0,
        });

        return new THREE.Sprite(material);
    }

    private updateSunGlow(altitude: number, position: THREE.Vector3) {
        this.sunGlow.position.copy(position);

        const material = this.sunGlow.material as THREE.SpriteMaterial;
        const skyMaterial = this.skyDome.material as THREE.MeshBasicMaterial;
        const visibility = smoothstep01(altitude / 3);

        let eclipseMagnitude = 0.0;

        if (this.target.name === "Moon") {
            eclipseMagnitude = 1 - THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(this.body.position.angleTo(position)), 0, 1);
        }

        material.opacity = 0.9 * visibility * (1.1 - eclipseMagnitude);
        skyMaterial.opacity = 1 - Math.max(THREE.MathUtils.clamp(-altitude / 18, 0, 1), THREE.MathUtils.clamp(0.001 * Math.sinh(15 * eclipseMagnitude - 7.3), 0, 1));

        if (visibility <= 0) {
            this.sunGlow.visible = false;
            material.opacity = 0;
            return;
        }

        this.sunGlow.visible = true;
    }

    private setBodyLabelPosition() {
        const bodyDirection = this.body.position.clone().normalize();
        const labelDistance = THREE.MathUtils.degToRad(1);

        let reference = new THREE.Vector3(0, -1, 0);

        if (Math.abs(bodyDirection.dot(reference)) > 0.95) {
            reference = new THREE.Vector3(1, 0, 0);
        }

        const tangent = new THREE.Vector3().crossVectors(reference, bodyDirection).normalize();
        const labelDirection = bodyDirection.clone().multiplyScalar(Math.cos(labelDistance)).add(tangent.multiplyScalar(Math.sin(labelDistance)));

        this.bodyLabelGroup.position.copy(labelDirection.multiplyScalar(100));
    }

    setBodyPosition(altitude: number, azimuth: number, distanceAU: number) {
        const position = horizontalToVector(altitude, azimuth, 100);

        if (this.target.name === "Moon") {
            const scale = SkyScene.MOON_MEAN_DISTANCE_AU / distanceAU;
            this.body.scale.setScalar(scale);
        }

        this.body.position.copy(position);
        this.setBodyLabelPosition();
    }

    setSunPosition(altitude: number, azimuth: number, distanceAU: number) {
        const position = horizontalToVector(altitude, azimuth, 105);

        this.sun.position.copy(position);
        this.sunLight.position.copy(position);
        this.updateSkyColor(altitude);
        this.updateSunGlow(altitude, position);

        const scale = SkyScene.SUN_MEAN_DISTANCE_AU / distanceAU;
        this.sun.scale.setScalar(scale);
    }

    setCameraOrientation(altitude: number, azimuth: number) {
        const position = horizontalToVector(altitude, azimuth, 100);
        const direction = position.normalize();

        this.camera.position.copy(direction).multiplyScalar(-0.001);
        this.camera.fov = 20;
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    resize() {
        const width = this.renderer.domElement.parentElement?.clientWidth ?? 0;
        const height = this.renderer.domElement.parentElement?.clientHeight ?? 0;
        if (width === 0 || height === 0) {
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }

    private animate = () => {
        requestAnimationFrame(this.animate);

        this.controls.update();
        this.updatePointLabels();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    };

    private handleZoom = (event: WheelEvent) => {
        event.preventDefault();

        const zoomSpeed = 0.002;
        const fovSpeed = 1.0;

        const minDistance = 1;
        const maxDistance = 1;

        const zoomIn = event.deltaY < 0;
        const distance = this.camera.position.length();

        if (zoomIn) {
            if (distance > minDistance) {
                const newDistance = Math.max(minDistance, distance + event.deltaY * zoomSpeed);

                this.camera.position.normalize().multiplyScalar(newDistance);
            } else {
                this.camera.fov = Math.max(10, this.camera.fov - fovSpeed);
                this.camera.updateProjectionMatrix();
            }
        } else {
            if (this.camera.fov < 60) {
                this.camera.fov = Math.min(60, this.camera.fov + fovSpeed);
                this.camera.updateProjectionMatrix();
            } else {
                const newDistance = Math.min(maxDistance, distance + event.deltaY * zoomSpeed);

                this.camera.position.normalize().multiplyScalar(newDistance);
            }
        }
    };

    dispose() {
        this.renderer.domElement.remove();
        this.labelRenderer.domElement.remove();

        (this.sunGlow.material as THREE.SpriteMaterial).map?.dispose();
        (this.sunGlow.material as THREE.SpriteMaterial).dispose();

        if (this.starSphere) {
            this.starSphere.geometry.dispose();
            (this.starSphere.material as THREE.MeshBasicMaterial).map?.dispose();
            (this.starSphere.material as THREE.MeshBasicMaterial).dispose();
        }

        this.renderer.dispose();
        this.controls.dispose();
    }
}