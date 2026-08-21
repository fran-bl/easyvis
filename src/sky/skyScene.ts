import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { horizontalToVector } from "./coordinates3d";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { Target } from "../astronomy/targets";


export class SkyScene {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    controls: OrbitControls;

    private body: THREE.Mesh;
    private sun: THREE.Mesh;
    private sunLight: THREE.DirectionalLight;
    private ambientLight: THREE.AmbientLight;
    private pointLabels: Array<{
        marker: THREE.Object3D;
        label: CSS2DObject;
    }> = [];

    constructor(container: HTMLElement, target: Target) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x02040a);

        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
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

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enablePan = false;
        this.controls.enableZoom = false;
        this.controls.rotateSpeed = -0.2;
        this.controls.minDistance = 0.001;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.createSkyDome();
        this.createHorizon();
        this.createReferencePoints();

        this.ambientLight = new THREE.AmbientLight(0x223344, 1.0);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
        this.sunLight.target.position.set(0, 0, 0);
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target);

        if (target.name === "Moon") {
            this.body = this.createLitBody(0xffffff, 2);
        } else {
            this.body = this.createBody(0xffffff, 0.5);
        }

        this.sun = this.createBody(0xffcc55, 2);

        this.body.renderOrder = 2;
        this.sun.renderOrder = 1;

        (this.body.material as THREE.MeshBasicMaterial).depthTest = false;

        this.scene.add(this.body);
        this.scene.add(this.sun);

        this.animate();
    }

    private createSkyDome() {
        const geometry = new THREE.SphereGeometry(100, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x050812, side: THREE.BackSide, opacity: 0.8, depthWrite: false });
        const dome = new THREE.Mesh(geometry, material);

        this.scene.add(dome);
    }

    private createHorizon() {
        const points = new THREE.Path().absarc(0, 0, 100, 0, Math.PI * 2).getSpacedPoints(64);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x888888 });
        const horizon = new THREE.LineLoop(geometry, material);

        horizon.rotation.x = -Math.PI / 2;

        this.scene.add(horizon);
    }

    private createReferencePoints() {
        const referencePoints = [
            { name: "N", altitude: 0, azimuth: 0 },
            { name: "NE", altitude: 0, azimuth: 45 },
            { name: "E", altitude: 0, azimuth: 90 },
            { name: "SE", altitude: 0, azimuth: 135 },
            { name: "S", altitude: 0, azimuth: 180 },
            { name: "SW", altitude: 0, azimuth: 225 },
            { name: "W", altitude: 0, azimuth: 270 },
            { name: "NW", altitude: 0, azimuth: 315 },
            { name: "", altitude: 90, azimuth: 0 }
        ];

        for (const point of referencePoints) {
            const position = horizontalToVector(point.altitude, point.azimuth, 100);
            const geometry = new THREE.SphereGeometry(0.5, 10, 10);
            const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
            const marker = new THREE.Mesh(geometry, material);

            const labelEl = document.createElement("div");
            labelEl.className = "point-label";
            labelEl.textContent = point.name;

            const label = new CSS2DObject(labelEl);
            label.position.set(0, -2.0, 0);

            marker.add(label);
            marker.position.copy(position);
            this.pointLabels.push({ marker, label });

            this.scene.add(marker);
        }
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
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });

        return new THREE.Mesh(geometry, material);
    }

    private createLitBody(color: number, size: number): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(size, 48, 48);
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 1,
            metalness: 0,
        });

        return new THREE.Mesh(geometry, material);
    }

    setBodyPosition(altitude: number, azimuth: number) {
        const position = horizontalToVector(altitude, azimuth, 100);

        this.body.position.copy(position);
    }

    setSunPosition(altitude: number, azimuth: number) {
        const position = horizontalToVector(altitude, azimuth, 100);

        this.sun.position.copy(position);
        this.sunLight.position.copy(position);
    }

    setCameraOrientation(altitude: number, azimuth: number) {
        const position = horizontalToVector(altitude, azimuth, 100);
        const direction = position.normalize();

        this.camera.position.copy(direction).multiplyScalar(-0.001);
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

    dispose() {
        this.renderer.domElement.remove();
        this.labelRenderer.domElement.remove();

        this.renderer.dispose();
        this.controls.dispose();
    }
}