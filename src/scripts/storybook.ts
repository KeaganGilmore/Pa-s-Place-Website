// The one scripted moment left in the storybook: on /our-story, the road
// draws itself from the little house to the signpost by the sea — once,
// when the journey page scrolls into view. Everything else on the site is
// CSS. Markup is complete without JavaScript; reduced-motion readers get
// the road already drawn and the dove already arrived.

let cleanup: AbortController | null = null;

function buildStorybook() {
  cleanup?.abort();
  cleanup = null;
  const root = document.getElementById('storybook');
  if (!root) return;
  cleanup = new AbortController();
  const { signal } = cleanup;

  const stillBook = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const journeySection = root.querySelector<HTMLElement>('[data-scene="story-journey"]');
  const journeyArt = Array.from(root.querySelectorAll<SVGSVGElement>('[data-journey-art]')).find(
    (el) => el.getBoundingClientRect().width > 0
  );
  const roadMask = journeyArt?.querySelector<SVGPathElement>('[data-journey-pathmask]') ?? null;
  const doveG = journeyArt?.querySelector<SVGGElement>('[data-journey-dove]') ?? null;
  if (!journeySection || !roadMask || !doveG) return;

  const len = roadMask.getTotalLength();
  const doveTo = (dist: number) => {
    const pt = roadMask.getPointAtLength(dist);
    doveG.setAttribute('transform', `translate(${pt.x.toFixed(1)}, ${(pt.y - 34).toFixed(1)})`);
  };

  if (stillBook || !('IntersectionObserver' in window)) {
    doveTo(len); // the book holds still: road drawn, dove arrived
    return;
  }

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
        doveTo(p * len);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { threshold: 0.35 }
  );
  io.observe(journeySection);
  signal.addEventListener('abort', () => io.disconnect());
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
