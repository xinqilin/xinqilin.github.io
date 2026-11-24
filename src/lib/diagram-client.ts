// Step controls for the build-time diagrams from src/lib/diagram.mjs.
// Without this script a sequence shows every step, a scene its first, and the full narration list stays visible.

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Time spent on a step while playing: long enough to read its narration. */
const dwell = (text: string) => Math.min(Math.max(text.length * 130, 2500), 9000);

function setup(fig: HTMLElement) {
  const steps = [...fig.querySelectorAll<SVGGElement>('.dg-step')];
  const says = [...fig.querySelectorAll<HTMLLIElement>('.dg-says li')];
  const count = fig.querySelector<HTMLElement>('.dg-count');
  const playBtn = fig.querySelector<HTMLButtonElement>('[data-act="play"]');
  const packet = fig.querySelector<SVGCircleElement>('.dg-packet'); // sequence diagrams only
  if (!steps.length || !count || !playBtn) return;

  const last = steps.length - 1;
  const start = Math.min(Number(fig.dataset.start ?? last), last);
  let cur = start;
  let timer: number | undefined;

  function show(i: number, animate: boolean) {
    cur = i;
    steps.forEach((g, j) => {
      g.classList.toggle('is-todo', j > i);
      g.classList.toggle('is-now', j === i);
    });
    says.forEach((li, j) => li.classList.toggle('is-now', j === i));
    count!.textContent = `${i + 1} / ${steps.length}`;

    if (!packet) return;
    packet.getAnimations().forEach((a) => a.cancel());
    const { x1, x2, y } = steps[i].dataset;
    if (!animate || reduce || x1 === undefined) return;
    const run = packet.animate(
      [
        { transform: `translate(${x1}px, ${y}px)`, opacity: 1 },
        { transform: `translate(${x2}px, ${y}px)`, opacity: 1 },
      ],
      { duration: 700, easing: 'ease-in-out' },
    );
    const burst = steps[i].querySelector<SVGCircleElement>('.dg-burst');
    if (burst) {
      run.onfinish = () =>
        burst.animate(
          [
            { transform: 'scale(0.6)', opacity: 0.9 },
            { transform: 'scale(2.6)', opacity: 0 },
          ],
          { duration: 900, easing: 'ease-out' },
        );
    }
  }

  function stop() {
    window.clearTimeout(timer);
    timer = undefined;
    playBtn!.textContent = '播放';
  }

  function tick() {
    timer = window.setTimeout(() => {
      if (cur === last) return stop();
      show(cur + 1, true);
      tick();
    }, dwell(says[cur]?.textContent ?? ''));
  }

  function play() {
    if (timer !== undefined) return stop();
    playBtn!.textContent = '暫停';
    if (cur === last) show(0, true);
    tick();
  }

  fig.querySelector('[data-act="prev"]')?.addEventListener('click', () => {
    stop();
    show(Math.max(cur - 1, 0), true);
  });
  fig.querySelector('[data-act="next"]')?.addEventListener('click', () => {
    stop();
    show(Math.min(cur + 1, last), true);
  });
  playBtn.addEventListener('click', play);

  fig.classList.add('is-live');
  fig.querySelector('.dg-says')?.setAttribute('aria-live', 'polite');
  show(start, false);

  // Play once, the first time the diagram scrolls into view.
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          if (timer === undefined && cur === start) play();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(fig);
  }
}

export function initDiagrams() {
  document.querySelectorAll<HTMLElement>('figure.dg').forEach(setup);
}
