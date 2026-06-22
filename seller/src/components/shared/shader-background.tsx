'use client'

import React, { useEffect, useRef } from 'react';

export function ShaderBackground({ className }: { className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let animationFrameId: number;
        let resizeObserver: ResizeObserver | null = null;

        function syncSize() {
            if (!canvas) return;
            const w = canvas.clientWidth || 1280;
            const h = canvas.clientHeight || 720;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
        }

        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(syncSize);
            resizeObserver.observe(canvas);
        }
        syncSize();

        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (!gl) return;

        const vs = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fs = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform float u_time;
            uniform vec2 u_resolution;

            void main() {
                vec2 uv = v_texCoord;
                
                // Abstract flowing background using Ahizan colors
                vec3 colorRed = vec3(0.89, 0.12, 0.14); // #E31E24
                vec3 colorBlue = vec3(0.04, 0.1, 0.18); // #0A192F
                vec3 colorWhite = vec3(1.0, 1.0, 1.0);
                
                float noise = sin(uv.x * 3.0 + u_time * 0.5) * cos(uv.y * 2.0 + u_time * 0.3);
                float glow = smoothstep(0.4, 0.6, noise + 0.5);
                
                vec3 finalColor = mix(colorWhite, colorBlue, uv.y * 0.2);
                finalColor = mix(finalColor, colorRed, glow * 0.05);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        function compileShader(glContext: WebGLRenderingContext, type: number, src: string) {
            const s = glContext.createShader(type);
            if (!s) return null;
            glContext.shaderSource(s, src);
            glContext.compileShader(s);
            if (!glContext.getShaderParameter(s, glContext.COMPILE_STATUS)) {
                console.error('Shader compile error:', glContext.getShaderInfoLog(s));
                glContext.deleteShader(s);
                return null;
            }
            return s;
        }

        const prog = gl.createProgram();
        if (!prog) return;

        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vs);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fs);

        if (!vertexShader || !fragmentShader) return;

        gl.attachShader(prog, vertexShader);
        gl.attachShader(prog, fragmentShader);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            return;
        }

        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        const pos = gl.getAttribLocation(prog, 'a_position');
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uRes = gl.getUniformLocation(prog, 'u_resolution');
        const uMouse = gl.getUniformLocation(prog, 'u_mouse');

        let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

        const handleMouseMove = (event: MouseEvent) => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            if (rect.width && rect.height) {
                const nx = (event.clientX - rect.left) / rect.width;
                const ny = 1.0 - (event.clientY - rect.top) / rect.height;
                mouse.x = nx * canvas.width;
                mouse.y = ny * canvas.height;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        function render(t: number) {
            if (!canvas || !gl) return;
            if (typeof ResizeObserver === 'undefined') syncSize();
            gl.viewport(0, 0, canvas.width, canvas.height);
            if (uTime) gl.uniform1f(uTime, t * 0.001);
            if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
            if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            animationFrameId = requestAnimationFrame(render);
        }

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (gl) {
                gl.deleteProgram(prog);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                gl.deleteBuffer(buf);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ display: 'block', width: '100%', height: '100%' }}
        />
    );
}
