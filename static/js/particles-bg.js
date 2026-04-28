(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'particles-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    const ctx = canvas.getContext('2d', { alpha: true });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    let mouseTimeout = null;

    const COLORS = [
        'rgba(97, 200, 224, 0.85)',   // brand cyan
        'rgba(54, 185, 216, 0.75)',   // link blue
        'rgba(139, 92, 246, 0.70)',   // vivid violet
        'rgba(244, 114, 182, 0.65)',  // pink accent
        'rgba(251, 191, 36, 0.65)',   // amber accent
        'rgba(52, 211, 153, 0.65)',   // mint accent
    ];

    let particles = [];

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const target = Math.min(220, Math.max(80, Math.floor((width * height) / 9000)));
        if (particles.length < target) {
            for (let i = particles.length; i < target; i++) particles.push(spawn());
        } else if (particles.length > target) {
            particles.length = target;
        }
    }

    function spawn() {
        const baseR = Math.random() * 2.0 + 1.0;
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.32,
            vy: (Math.random() - 0.5) * 0.32,
            r: baseR,
            baseR: baseR,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
    }

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => { mouse.active = false; }, 250);
    }, { passive: true });

    window.addEventListener('resize', resize);
    resize();

    const REPEL_RADIUS = 140;
    const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const REPEL_FORCE = 4;

    function frame() {
        ctx.clearRect(0, 0, width, height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -10) p.x = width + 10;
            else if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            else if (p.y > height + 10) p.y = -10;

            if (mouse.active) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < REPEL_RADIUS_SQ && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
                    p.x += (dx / dist) * force * REPEL_FORCE;
                    p.y += (dy / dist) * force * REPEL_FORCE;
                    p.r = p.baseR + force * 1.6;
                } else {
                    p.r += (p.baseR - p.r) * 0.1;
                }
            } else if (p.r !== p.baseR) {
                p.r += (p.baseR - p.r) * 0.1;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }

        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
