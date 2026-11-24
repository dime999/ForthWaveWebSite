/*
 * The Šanko ad player, shared by the home page and the Šanko page.
 *
 * Markup: a [data-ad] box with data-src (1080p) and data-src-sm (720p).
 * - Clicking the big button plays it with sound.
 * - Opening the page at the box's own #id (the QR code on the business
 *   cards points to sanko/#reklama) plays it at once, muted, because
 *   browsers only allow muted autoplay; a large "sound on" button stays up.
 * - data-after="#id": a "skip to details" link while it plays, and when it
 *   ends the page glides on to that part by itself.
 */
(() => {
  const LABELS = {
    en: { play: "Play", pause: "Pause", sound: "Sound on", mute: "Sound off", full: "Full screen", seek: "Seek" },
    bs: { play: "Pusti", pause: "Pauza", sound: "Uključi zvuk", mute: "Isključi zvuk", full: "Preko cijelog ekrana", seek: "Premotaj" },
  };
  const label = (k) => (LABELS[document.documentElement.lang] || LABELS.en)[k];
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-ad]").forEach(setup);

  function setup(box) {
    const q = (s) => box.querySelector(s);
    const v = q("video");
    const frame = q(".ad-frame");
    const toggle = q(".ad-toggle");
    const sound = q(".ad-sound");
    const full = q(".ad-full");
    const seek = q(".ad-seek");
    const time = q(".ad-time");
    const after = box.dataset.after && document.querySelector(box.dataset.after);

    // On phones the long "all about Šanko" label would cover the picture, so a
    // copy of it sits under the player there (styles.css swaps the two).
    const more = q(".ad-more");
    if (more) {
      const out = more.cloneNode(true);
      out.className = "ad-more-out";
      frame.after(out);
    }

    const small = window.matchMedia("(max-width: 900px)").matches ||
      (navigator.connection && navigator.connection.saveData);
    v.src = small ? box.dataset.srcSm : box.dataset.src;

    function sync() {
      const playing = !v.paused && !v.ended;
      box.classList.toggle("playing", playing);
      box.classList.toggle("muted", v.muted);
      toggle.setAttribute("aria-label", label(playing ? "pause" : "play"));
      sound.setAttribute("aria-label", label(v.muted ? "sound" : "mute"));
      full.setAttribute("aria-label", label("full"));
      seek.setAttribute("aria-label", label("seek"));
    }

    function play(muted) {
      if (muted !== undefined) v.muted = muted;
      if (v.ended) v.currentTime = 0;
      box.classList.add("started");
      box.classList.remove("ended");
      const p = v.play();
      // Sound was refused (no tap yet): play muted and let them turn it on.
      if (p) p.catch(() => { v.muted = true; v.play().catch(() => {}); sync(); });
    }

    q(".ad-start").addEventListener("click", () => play(false));
    toggle.addEventListener("click", () => (v.paused || v.ended ? play() : v.pause()));
    v.addEventListener("click", () => (v.paused ? play() : v.pause()));
    q(".ad-unmute").addEventListener("click", () => { v.muted = false; if (v.paused) play(); sync(); });
    sound.addEventListener("click", () => { v.muted = !v.muted; sync(); });
    q(".ad-replay").addEventListener("click", () => play(false));

    full.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (frame.requestFullscreen) frame.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iPhone
    });

    seek.addEventListener("input", () => {
      if (v.duration) v.currentTime = (seek.value / 1000) * v.duration;
    });

    v.addEventListener("timeupdate", () => {
      const d = v.duration || 0;
      if (!d) return;
      seek.value = Math.round((v.currentTime / d) * 1000);
      box.style.setProperty("--done", (v.currentTime / d).toFixed(4));
      time.textContent = `${fmt(v.currentTime)} / ${fmt(d)}`;
    });
    v.addEventListener("loadedmetadata", () => { time.textContent = `0:00 / ${fmt(v.duration)}`; });
    ["play", "pause", "volumechange"].forEach((e) => v.addEventListener(e, sync));

    v.addEventListener("ended", () => {
      box.classList.add("ended");
      sync();
      if (document.fullscreenElement) document.exitFullscreen();
      if (after) {
        setTimeout(() => {
          if (box.classList.contains("ended")) after.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        }, 1800);
      }
    });

    // Scrolled away: stop, so it doesn't talk on in the background.
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && !v.paused) v.pause();
    }, { threshold: 0.2 }).observe(box);

    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    sync();

    // Opened from the QR code: straight to the ad.
    if (box.id && location.hash === `#${box.id}`) {
      box.classList.add("qr");
      requestAnimationFrame(() => box.scrollIntoView({ block: "start" }));
      play(true);
    }
  }
})();
