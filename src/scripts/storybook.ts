// Light-touch motion for the homepage — no libraries, no pinning, no
// scroll-jacking. A gentle parallax on the night cover (passive scroll
// listener, transforms only), one play-once page-opening on the mission
// photo (IntersectionObserver + CSS transition, so it completes even in
// throttled tabs), and drag-to-scroll on the album. The markup is complete
// without JavaScript — reduced-motion and no-JS readers get a finished,
// still book.

let cleanup: AbortController | null = null;

function buildStorybook() {
  cleanup?.abort();
  cleanup = null;
  const root = document.getElementById('storybook');
  if (!root) return;
  cleanup = new AbortController();
  const { signal } = cleanup;

  const stillBook = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mission: the drawing opens into the photograph, once ---- */
  const mission = root.querySelector<HTMLElement>('[data-scene="mission"]');
  if (!stillBook && mission && 'IntersectionObserver' in window) {
    mission.classList.add('iris-closed');
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        mission.classList.add('iris-open');
        mission.classList.remove('iris-closed');
      },
      { threshold: 0.4 }
    );
    io.observe(mission);
    signal.addEventListener('abort', () => io.disconnect());
  }

  /* ---- story journey: the road draws itself, once, dove in tow ---- */
  const journeySection = root.querySelector<HTMLElement>('[data-scene="story-journey"]');
  const journeyArt = Array.from(root.querySelectorAll<SVGSVGElement>('[data-journey-art]')).find(
    (el) => el.getBoundingClientRect().width > 0
  );
  const roadMask = journeyArt?.querySelector<SVGPathElement>('[data-journey-pathmask]') ?? null;
  const doveG = journeyArt?.querySelector<SVGGElement>('[data-journey-dove]') ?? null;
  if (!stillBook && journeySection && roadMask && doveG && 'IntersectionObserver' in window) {
    const len = roadMask.getTotalLength();
    roadMask.style.strokeDasharray = `${len + 2}`;
    roadMask.style.strokeDashoffset = `${len + 2}`;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const DUR = 4200;
        const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const tick = (now: number) => {
          if (signal.aborted) return;
          const p = ease(Math.min(1, (now - t0) / DUR));
          roadMask.style.strokeDashoffset = String((1 - p) * (len + 2));
          const pt = roadMask.getPointAtLength(p * len);
          doveG.setAttribute('transform', `translate(${pt.x.toFixed(1)}, ${(pt.y - 34).toFixed(1)})`);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );
    io.observe(journeySection);
    signal.addEventListener('abort', () => io.disconnect());
  } else if (stillBook && roadMask) {
    // reduced motion: the road is simply there, dove at the signpost
    if (doveG) {
      const end = roadMask.getPointAtLength(roadMask.getTotalLength());
      doveG.setAttribute('transform', `translate(${end.x.toFixed(1)}, ${(end.y - 34).toFixed(1)})`);
    }
  }

  /* ---- album: drag the strip with a mouse (touch scrolls natively) ---- */
  const vp = root.querySelector<HTMLElement>('[data-album-viewport]');
  if (vp) {
    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    vp.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        dragging = true;
        startX = e.clientX;
        startLeft = vp.scrollLeft;
        vp.style.cursor = 'grabbing';
        vp.style.scrollSnapType = 'none';
      },
      { signal }
    );
    vp.addEventListener(
      'pointermove',
      (e) => {
        if (!dragging) return;
        vp.scrollLeft = startLeft - (e.clientX - startX);
      },
      { signal }
    );
    const release = () => {
      if (!dragging) return;
      dragging = false;
      vp.style.cursor = '';
      vp.style.scrollSnapType = '';
    };
    vp.addEventListener('pointerup', release, { signal });
    vp.addEventListener('pointerleave', release, { signal });
  }
}

document.addEventListener('astro:page-load', buildStorybook);
document.addEventListener('astro:before-swap', () => {
  cleanup?.abort();
  cleanup = null;
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  buildStorybook();
} else {
  document.addEventListener('DOMContentLoaded', buildStorybook, { once: true });
}
