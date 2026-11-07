/* IMPOSTOR – efekt konfetti na płótnie. */
let raf = null;
export function confetti(kind) {
  const cv = document.getElementById('fx-canvas');
  if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = kind === 'red' ? ['#ef4444', '#f43f5e', '#fb7185', '#a855f7', '#fff'] : kind === 'gold' ? ['#f59e0b', '#fcd34d', '#fff', '#f43f5e'] : ['#a855f7', '#8b5cf6', '#c084fc', '#f43f5e', '#22d3ee', '#fff'];
  const parts = [];
  for (let i = 0; i < 160; i++) {
    const fromLeft = i % 2 === 0;
    parts.push({
      x: fromLeft ? -10 : innerWidth + 10, y: innerHeight * (0.45 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9), vy: -(9 + Math.random() * 10),
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      col: colors[i % colors.length], life: 0
    });
  }
  cancelAnimationFrame(raf);
  const t0 = performance.now();
  (function frame(t) {
    c.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col;
      c.globalAlpha = Math.max(0, 1 - (t - t0) / 3800);
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); c.restore();
    }
    if (t - t0 < 3800) raf = requestAnimationFrame(frame); else c.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}
