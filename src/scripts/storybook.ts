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

  /* ---- cover: the night sky drifts as the reader leaves it ---- */
  const moon = root.querySelector<SVGElement>('[data-cover-moon]');
  const stars = root.querySelector<HTMLElement>('[data-cover-stars]');
  const far = root.querySelector<SVGGElement>('[data-cover-far]');
  if (!stillBook && moon && stars && far) {
    const drift = () => {
      const s = Math.min(Math.max(window.scrollY, 0), window.innerHeight);
      moon.style.transform = `translateY(${(s * 0.4).toFixed(1)}px)`;
      stars.style.transform = `translateY(${(s * 0.18).toFixed(1)}px)`;
      far.style.transform = `translateY(${((-26 * s) / window.innerHeight).toFixed(1)}px)`;
    };
    window.addEventListener('scroll', drift, { passive: true, signal });
    drift();
  }

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
