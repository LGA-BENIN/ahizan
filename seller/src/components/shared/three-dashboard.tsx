'use client'

import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        THREE?: any;
    }
}

export function ThreeDashboard({ className }: { className?: string }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Charger Three.js de manière asynchrone s'il n'est pas déjà chargé
        if (window.THREE) {
            setIsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js';
        script.async = true;
        script.onload = () => {
            setIsLoaded(true);
        };
        script.onerror = (err) => {
            console.error('Failed to load Three.js from CDN', err);
        };
        document.body.appendChild(script);

        return () => {
            // Conserver Three.js sur l'objet global une fois chargé
        };
    }, []);

    useEffect(() => {
        if (!isLoaded || !containerRef.current || !window.THREE) return;

        const THREE = window.THREE;
        const container = containerRef.current;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        container.appendChild(renderer.domElement);

        // Create a modern geometric "Floating Dashboard" representation
        const group = new THREE.Group();

        // Main card
        const cardGeo = new THREE.BoxGeometry(3, 2, 0.1);
        const cardMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const mainCard = new THREE.Mesh(cardGeo, cardMat);
        group.add(mainCard);

        // Accent elements (Ahizan Red and Blue)
        const barGeo = new THREE.BoxGeometry(0.5, 1.5, 0.1);
        const redMat = new THREE.MeshPhongMaterial({ color: 0xe31e24 });
        const blueMat = new THREE.MeshPhongMaterial({ color: 0x0a192f });

        const bar1 = new THREE.Mesh(barGeo, redMat);
        bar1.position.set(-1.8, 0.5, 0.2);
        group.add(bar1);

        const bar2 = new THREE.Mesh(barGeo, blueMat);
        bar2.position.set(1.8, -0.5, 0.2);
        group.add(bar2);

        scene.add(group);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));

        camera.position.z = 5;

        let animationFrameId: number;
        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            group.rotation.y = Math.sin(Date.now() * 0.001) * 0.15;
            group.position.y = Math.sin(Date.now() * 0.002) * 0.1;
            renderer.render(scene, camera);
        }

        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (container && renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [isLoaded]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', height: '100%' }}
        />
    );
}
