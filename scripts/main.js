(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const CONFIG = window.TL_CONFIG || {};
  const WORKS = window.TL_WORKS || [];
  const byId = new Map(WORKS.map((w) => [w.id, w]));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  if (hasGsap) {
    document.documentElement.classList.add("has-gsap");
    gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText].filter(Boolean));
  }

  const KIND_LABEL = { video: "Video", reel: "Reel", poster: "Poster" };
  const FILTER_LABEL = { editing: "Video Editing", shorts: "Shorts / Reels", posters: "Posters & Graphics" };
  const FPS = 25;

  const timecode = (seconds) => {
    const s = Math.max(0, seconds || 0);
    const pad = (n) => String(Math.floor(n)).padStart(2, "0");
    return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad((s % 1) * FPS)}`;
  };

  /* ---------------------------------------------------------------------
     Config bindings (email, socials, booking)
     --------------------------------------------------------------------- */
  function bindConfig() {
    $$("[data-config-text='email']").forEach((el) => (el.textContent = CONFIG.email || ""));
    $$("[data-config-href='mailto']").forEach((el) => {
      if (CONFIG.email) el.href = `mailto:${CONFIG.email}`;
      else el.hidden = true;
    });
    $$("[data-social]").forEach((a) => {
      const url = CONFIG.socials?.[a.dataset.social];
      if (url) a.href = url;
      else a.parentElement.hidden = true;
    });
    const book = $("[data-calendly]");
    if (book) {
      const calendlyUrl = CONFIG.calendlyUrl || "https://calendly.com/studiotimelinee";
      book.href = calendlyUrl;
      book.addEventListener("click", (e) => {
        e.preventDefault();
        window.open(calendlyUrl, "_blank", "noopener,noreferrer");
      });
    }
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  function openCalendly() {
    const url = CONFIG.calendlyUrl || "https://calendly.com/studiotimelinee";
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* ---------------------------------------------------------------------
     Light / dark theme
     --------------------------------------------------------------------- */
  function initTheme() {
    const root = document.documentElement;
    const btn = $("[data-theme-toggle]");
    const meta = $("meta[name='theme-color']");
    const apply = (theme) => {
      root.dataset.theme = theme;
      const light = theme === "light";
      btn.setAttribute("aria-pressed", String(light));
      btn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
      meta.content = light ? "#f4f4f1" : "#000000";
    };
    apply(root.dataset.theme === "light" ? "light" : "dark");
    btn.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      root.classList.add("theme-anim");
      apply(next);
      try { localStorage.setItem("tl-theme", next); } catch { /* storage disabled: theme lasts for this visit */ }
      setTimeout(() => root.classList.remove("theme-anim"), 600);
    });
  }

  /* ---------------------------------------------------------------------
     Live studio clock (Bengaluru)
     --------------------------------------------------------------------- */
  function startClock() {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const els = $$("[data-clock]");
    const tick = () => els.forEach((el) => (el.textContent = `BLR ${fmt.format(new Date())} IST`));
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------------------- */
  let lenis = null;
  function initScroll() {
    if (!reduceMotion && window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      if (hasGsap && window.ScrollTrigger) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    }
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      const target = a.getAttribute("href") === "#top" ? 0 : $(a.getAttribute("href"));
      if (target === null) return;
      e.preventDefault();
      closeMenu();
      scrollTo(target);
    });
    $("[data-to-top]").addEventListener("click", () => scrollTo(0));
  }
  const scrollTo = (target) => {
    if (lenis) return lenis.scrollTo(target, { duration: 1.4 });
    const behavior = reduceMotion ? "auto" : "smooth";
    if (target === 0) window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior });
  };
  const lockScroll = (on) => {
    document.body.classList.toggle("is-locked", on);
    if (lenis) on ? lenis.stop() : lenis.start();
  };

  /* ---------------------------------------------------------------------
     Cursor
     --------------------------------------------------------------------- */
  function initCursor() {
    if (!canHover) return;
    const cursor = $(".cursor");
    const label = $(".cursor__label", cursor);
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("is-visible"); }, { passive: true });
    document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
    const loop = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();

    const LABELS = { play: "Play", view: "View", drag: "Drag" };
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest("[data-cursor]");
      cursor.classList.remove("is-hover", "is-label");
      if (!el) return;
      const mode = el.dataset.cursor;
      if (LABELS[mode]) {
        label.textContent = LABELS[mode];
        cursor.classList.add("is-label");
      } else cursor.classList.add("is-hover");
    });
  }

  /* ---------------------------------------------------------------------
     Navigation
     --------------------------------------------------------------------- */
  const menu = $("[data-menu]");
  const toggle = $("[data-menu-toggle]");
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    lockScroll(false);
  }
  function initNav() {
    const nav = $("[data-nav]");
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 40);
      nav.classList.toggle("is-hidden", y > last && y > innerHeight * 0.6 && menu.hidden);
      last = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toggle.addEventListener("click", () => {
      if (!menu.hidden) return closeMenu();
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      lockScroll(true);
      if (hasGsap && !reduceMotion) gsap.from($$("nav a", menu), { yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.7, ease: "power3.out" });
    });

    const links = $$(".nav__links a");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${en.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["work", "about", "services", "contact"].forEach((id) => io.observe(document.getElementById(id)));
  }

  /* ---------------------------------------------------------------------
     Hero: looping showreel + faux NLE timeline
     --------------------------------------------------------------------- */
  const reel = (CONFIG.showreel || []).map((id) => byId.get(id)).filter((w) => w && w.src);

  function initHero() {
    const videos = $$(".hero__video");
    const clipsEl = $("[data-hero-clips]");
    const playhead = $("[data-hero-playhead]");
    const tcEl = $("[data-hero-tc]");
    const titleEl = $("[data-hero-title]");
    if (!reel.length) return;

    clipsEl.innerHTML = reel.map((w) => `<span data-name="${escapeHtml(w.title)}" style="flex:1"></span>`).join("");
    const clipEls = [...clipsEl.children];
    let index = 0;
    let active = 0;

    const load = (video, clip) => {
      video.poster = clip.thumb;
      video.src = clip.src;
      video.load();
    };

    const setClip = (i) => {
      index = i;
      clipEls.forEach((el, n) => el.classList.toggle("is-active", n === i));
      titleEl.textContent = `SEQ ${String(i + 1).padStart(2, "0")} — ${reel[i].client} / ${reel[i].title}`.toUpperCase();
    };

    load(videos[0], reel[0]);
    setClip(0);
    if (reduceMotion) return;

    const advance = () => {
      const next = (index + 1) % reel.length;
      const cur = videos[active];
      const nxt = videos[1 - active];
      if (nxt.dataset.clip !== String(next)) load(nxt, reel[next]);
      nxt.currentTime = 0;
      nxt.play().catch(() => {});
      nxt.classList.add("is-active");
      cur.classList.remove("is-active");
      active = 1 - active;
      setClip(next);
      setTimeout(() => cur.pause(), 1200);
    };

    videos.forEach((v) => {
      v.dataset.clip = "";
      v.addEventListener("timeupdate", () => {
        if (v !== videos[active] || !v.duration) return;
        const t = v.currentTime;
        playhead.style.left = `${((index + t / v.duration) / reel.length) * 100}%`;
        tcEl.textContent = timecode(t);
        // Clips cut at ~8s so the hero feels like a showreel, not a single video.
        const out = Math.min(v.duration - 0.3, 8);
        if (t >= out && !v.dataset.cut) {
          v.dataset.cut = "1";
          const nextIdx = (index + 1) % reel.length;
          const nxt = videos[1 - active];
          load(nxt, reel[nextIdx]);
          nxt.dataset.clip = String(nextIdx);
          nxt.addEventListener("canplay", function go() {
            nxt.removeEventListener("canplay", go);
            delete v.dataset.cut;
            advance();
          });
        }
      });
    });

    const hero = $(".hero");
    const start = () => videos[active].play().catch(() => {});
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : videos.forEach((v) => v.pause())), { threshold: 0.05 }).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? videos.forEach((v) => v.pause()) : start()));
  }

  /* ---------------------------------------------------------------------
     Work grid
     --------------------------------------------------------------------- */
  const PAGE = 15;
  const grid = $("[data-grid]");
  const moreBtn = $("[data-more]");
  let filter = "all";
  let visible = PAGE;
  let filtered = [];

  const ORDER = (() => {
    // Interleave formats so "All" reads like a curated reel rather than three blocks.
    const buckets = { video: [], reel: [], poster: [] };
    WORKS.forEach((w) => buckets[w.kind]?.push(w));
    const out = [];
    const pattern = ["video", "reel", "poster", "reel", "poster", "video", "reel", "poster"];
    while (out.length < WORKS.length) {
      for (const k of pattern) if (buckets[k].length) out.push(buckets[k].shift());
    }
    return out;
  })();

  function cardHtml(w, i) {
    const landscape = w.orientation === "landscape";
    const ar = w.kind === "reel" ? "9 / 16" : w.ar || (landscape ? "16 / 9" : "4 / 5");
    const cursor = w.kind === "poster" ? "view" : "play";
    const tag = KIND_LABEL[w.kind];
    return `
      <article class="card card--${w.kind}${landscape ? " card--landscape" : ""}" data-index="${i}" data-kind="${w.kind}">
        <div class="card__media" style="--ar:${ar}">
          <img src="${w.thumb}" alt="${escapeHtml(w.title)} — ${escapeHtml(w.client)}" loading="lazy" decoding="async" />
          ${w.kind === "video" ? `<video muted loop playsinline preload="none" data-src="${w.src}"></video><span class="card__tc">00:00:00:00</span>` : ""}
          <span class="card__badge"><i></i>${tag}</span>
          ${w.kind !== "poster" ? `<span class="card__progress"><span></span></span>` : ""}
        </div>
        <div class="card__info">
          <div>
            <h3 class="card__title">${escapeHtml(w.title)}</h3>
            <p class="card__client">${escapeHtml(w.client)}</p>
          </div>
          <span class="card__type mono">${String(i + 1).padStart(2, "0")}</span>
        </div>
        <button class="card__link" type="button" aria-label="Open ${escapeHtml(w.title)}" data-cursor="${cursor}"></button>
      </article>`;
  }

  // Masonry: each card spans as many 8px rows as its rendered height needs.
  const ROW = 8;
  const sizeObserver = new ResizeObserver((entries) => entries.forEach(({ target }) => spanCard(target)));
  function spanCard(card) {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
    const h = $(".card__media", card).offsetHeight + $(".card__info", card).offsetHeight;
    card.style.gridRowEnd = `span ${Math.ceil((h + gap * 1.6) / ROW)}`;
  }

  function renderGrid({ append = false, initial = false } = {}) {
    filtered = filter === "all" ? ORDER : ORDER.filter((w) => w.tags.includes(filter));
    const shown = filtered.slice(0, visible);
    const prevCount = grid.children.length;

    if (!append) {
      $$(".card", grid).forEach((c) => sizeObserver.unobserve(c));
      grid.innerHTML = shown.map(cardHtml).join("");
    } else {
      grid.insertAdjacentHTML("beforeend", shown.slice(prevCount).map((w, n) => cardHtml(w, prevCount + n)).join(""));
    }
    const fresh = $$(".card", grid).slice(append ? prevCount : 0);
    fresh.forEach((c) => { sizeObserver.observe(c); spanCard(c); bindCard(c); });

    moreBtn.parentElement.hidden = visible >= filtered.length;
    moreBtn.textContent = `Load more work (${filtered.length - Math.min(visible, filtered.length)})`;

    if (hasGsap && !reduceMotion) {
      const reveal = (els) => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.06, clearProps: "transform" });
      if (initial && window.ScrollTrigger) {
        gsap.set(fresh, { opacity: 0 });
        ScrollTrigger.batch(fresh, { start: "top 92%", once: true, onEnter: reveal });
      } else reveal(fresh);
    }
    window.ScrollTrigger?.refresh();
  }

  function bindCard(card) {
    const w = filtered[+card.dataset.index];
    $(".card__link", card).addEventListener("click", () => Lightbox.open(filtered, +card.dataset.index));
    if (w.kind !== "video") return;

    const video = $("video", card);
    const tc = $(".card__tc", card);
    const bar = $(".card__progress span", card);
    const play = () => {
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => card.classList.add("is-playing")).catch(() => {});
    };
    const stop = () => { video.pause(); card.classList.remove("is-playing"); };
    video.addEventListener("timeupdate", () => {
      tc.textContent = timecode(video.currentTime);
      if (video.duration) bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
    });

    if (canHover) {
      card.addEventListener("pointerenter", play);
      card.addEventListener("pointerleave", stop);
    } else {
      touchPlayer.observe(card);
      card._play = play;
      card._stop = stop;
    }
  }

  // On touch devices the card most in view previews automatically.
  const touchPlayer = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.intersectionRatio > 0.7 ? en.target._play?.() : en.target._stop?.()));
  }, { threshold: [0, 0.7, 1] });

  function initWork() {
    const counts = { all: WORKS.length };
    WORKS.forEach((w) => w.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    $$("[data-filter]").forEach((btn) => {
      $("sup", btn).textContent = counts[btn.dataset.filter] || 0;
      btn.addEventListener("click", () => {
        if (btn.dataset.filter === filter) return;
        $$("[data-filter]").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
        filter = btn.dataset.filter;
        visible = PAGE;
        const swap = () => renderGrid();
        if (hasGsap && !reduceMotion) gsap.to(grid.children, { opacity: 0, y: 16, duration: 0.25, stagger: 0.01, onComplete: swap });
        else swap();
      });
    });
    moreBtn.addEventListener("click", () => { visible += PAGE; renderGrid({ append: true }); });
    renderGrid({ initial: true });
  }

  /* ---------------------------------------------------------------------
     Lightbox (videos, reels, posters, showreel playlist)
     --------------------------------------------------------------------- */
  const Lightbox = (() => {
    const root = $("[data-lightbox]");
    const stage = $("[data-lb-stage]");
    const title = $("[data-lb-title]");
    const meta = $("[data-lb-meta]");
    const link = $("[data-lb-link]");
    const count = $("[data-lb-count]");
    let list = [];
    let idx = 0;
    let player = null;
    let mode = "item";
    let lastFocus = null;

    const destroy = () => {
      player?.destroy();
      player = null;
      stage.innerHTML = "";
    };

    function mountVideo(w, { autoplay = true, onEnded } = {}) {
      const v = document.createElement("video");
      v.src = w.src;
      v.poster = w.thumb;
      v.playsInline = true;
      v.controls = true;
      if (w.orientation === "portrait") v.classList.add("is-portrait");
      stage.append(v);
      if (window.Plyr) {
        player = new Plyr(v, { autoplay, ratio: w.orientation === "portrait" ? "9:16" : "16:9", controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "fullscreen"], keyboard: { focused: true, global: false } });
        if (w.orientation === "portrait") player.elements.container.classList.add("is-portrait");
        if (onEnded) player.on("ended", onEnded);
      } else {
        if (autoplay) v.play().catch(() => {});
        if (onEnded) v.addEventListener("ended", onEnded);
      }
    }

    function render() {
      destroy();
      const w = list[idx];
      root.classList.toggle("lightbox--reel", w.kind === "reel");
      title.textContent = w.title;
      const label = mode === "showreel" ? "Showreel" : FILTER_LABEL[w.tags[0]] || KIND_LABEL[w.kind];
      meta.textContent = `${label} — ${w.client}`;
      link.hidden = !w.link;
      if (w.link) link.href = w.link;

      if (w.kind === "video") {
        mountVideo(w, { onEnded: mode === "showreel" ? () => go(1) : null });
      } else if (w.kind === "reel") {
        const f = document.createElement("iframe");
        f.src = w.embed;
        f.title = `${w.title} on Instagram`;
        f.allow = "autoplay; encrypted-media; picture-in-picture";
        f.loading = "lazy";
        stage.append(f);
      } else {
        const img = new Image();
        img.src = w.src;
        img.alt = `${w.title} — ${w.client}`;
        img.addEventListener("click", () => img.classList.toggle("is-zoomed"));
        stage.append(img);
      }

      if (mode === "showreel") {
        count.innerHTML = `<span class="lightbox__chapters">${list.map((c, n) => `<button type="button" aria-label="Clip ${n + 1}: ${escapeHtml(c.title)}" class="${n < idx ? "is-done" : ""}" data-chapter="${n}"><span${n === idx ? ' style="transform:scaleX(.5)"' : ""}></span></button>`).join("")}</span>`;
        $$("[data-chapter]", count).forEach((b) => b.addEventListener("click", () => { idx = +b.dataset.chapter; render(); }));
      } else {
        count.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
      }
      if (hasGsap && !reduceMotion) gsap.fromTo(stage, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power3.out" });
    }

    function go(step) {
      idx = (idx + step + list.length) % list.length;
      render();
    }

    function open(items, index = 0, as = "item") {
      list = items;
      idx = index;
      mode = as;
      lastFocus = document.activeElement;
      root.hidden = false;
      lockScroll(true);
      render();
      $("[data-lb-close].icon-btn", root).focus();
      if (hasGsap && !reduceMotion) gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    }

    function close() {
      if (root.hidden) return;
      const done = () => { destroy(); root.hidden = true; lockScroll(false); lastFocus?.focus(); };
      if (hasGsap && !reduceMotion) gsap.to(root, { opacity: 0, duration: 0.25, onComplete: done });
      else done();
    }

    $$("[data-lb-close]", root).forEach((el) => el.addEventListener("click", close));
    $("[data-lb-prev]", root).addEventListener("click", () => go(-1));
    $("[data-lb-next]", root).addEventListener("click", () => go(1));
    document.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Tab") {
        const focusable = $$("button, a[href], iframe, [tabindex]:not([tabindex='-1'])", root).filter((el) => !el.hidden && el.offsetParent);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    return { open, close };
  })();

  function initShowreel() {
    $$("[data-showreel]").forEach((btn) => btn.addEventListener("click", () => reel.length && Lightbox.open(reel, 0, "showreel")));
  }

  /* ---------------------------------------------------------------------
     Services accordion + cursor-following preview
     --------------------------------------------------------------------- */
  function initServices() {
    const items = $$(".svc__item");
    items.forEach((item, i) => {
      const row = $(".svc__row", item);
      row.addEventListener("click", () => {
        const open = !item.classList.contains("is-open");
        items.forEach((it) => { it.classList.remove("is-open"); $(".svc__row", it).setAttribute("aria-expanded", "false"); });
        item.classList.toggle("is-open", open);
        row.setAttribute("aria-expanded", String(open));
        setTimeout(() => window.ScrollTrigger?.refresh(), 650);
      });
      if (i === 0) row.click();
    });

    if (!canHover) return;
    const float = $("[data-svc-float]");
    const img = $("img", float);
    let x = 0, y = 0, fx = 0, fy = 0, raf = 0;
    const loop = () => {
      fx += (x - fx) * 0.14;
      fy += (y - fy) * 0.14;
      float.style.translate = `${fx + 24}px ${fy - float.offsetHeight / 2}px`;
      raf = requestAnimationFrame(loop);
    };
    items.forEach((item) => {
      const row = $(".svc__row", item);
      row.addEventListener("pointerenter", (e) => {
        img.src = item.dataset.preview;
        if (!raf) { fx = e.clientX; fy = e.clientY; loop(); }
        float.classList.add("is-visible");
      });
      row.addEventListener("pointerleave", () => {
        float.classList.remove("is-visible");
        setTimeout(() => { if (!float.classList.contains("is-visible")) { cancelAnimationFrame(raf); raf = 0; } }, 400);
      });
    });
    addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     Clients (derived from portfolio data)
     --------------------------------------------------------------------- */
  const CLIENTS = [
    { name: "EVORA", sector: "EV charging · Web3", match: /evora|raj pratap/i },
    { name: "Priya", sector: "Creator · Lifestyle", match: /^priya/i },
    { name: "R3spawn", sector: "Creator · Gaming", match: /r3spawn/i },
    { name: "Stylfort", sector: "Vacation clothing", match: /stylfort/i },
    { name: "Treevenii", sector: "Indian fashion", match: /treevenii/i },
    { name: "Float Finance", sector: "DeFi", match: /float/i },
  ];
  CLIENTS.forEach((c) => (c.works = WORKS.filter((w) => c.match.test(w.client))));

  function initClients() {
    $("[data-clients]").innerHTML = CLIENTS.map((c) => `
      <div class="client" data-cursor="hover">
        <div class="client__bg">${c.works[0] ? `<img src="${c.works[0].thumb}" alt="" loading="lazy" />` : ""}</div>
        <span class="client__name">${c.name}</span>
        <span class="client__meta mono"><span>${c.sector}</span><b>${String(c.works.length).padStart(2, "0")} ${c.works.length === 1 ? "project" : "projects"}</b></span>
      </div>`).join("");
  }

  /* ---------------------------------------------------------------------
     Marquee (velocity-reactive)
     --------------------------------------------------------------------- */
  function initMarquee() {
    const track = $("[data-marquee]");
    const list = $(".marquee__list", track);
    while (track.scrollWidth < innerWidth * 2) track.append(list.cloneNode(true));
    track.append(...[...track.children].map((l) => l.cloneNode(true)));
    $$(".marquee__list", track).slice(1).forEach((l) => l.setAttribute("aria-hidden", "true"));
    if (!hasGsap || reduceMotion) return;
    const tween = gsap.to(track, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    if (lenis) {
      lenis.on("scroll", ({ velocity }) => {
        gsap.to(tween, { timeScale: 1 + Math.min(Math.abs(velocity) / 6, 4) * Math.sign(velocity || 1), duration: 0.3, overwrite: true });
      });
    }
  }

  /* ---------------------------------------------------------------------
     Founder card tilt
     --------------------------------------------------------------------- */
  function initTilt() {
    if (!canHover || reduceMotion) return;
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  /* ---------------------------------------------------------------------
     Stats counters
     --------------------------------------------------------------------- */
  function initStats() {
    const views = CONFIG.stats?.views || { value: 0, suffix: "" };
    const values = { views: views.value, projects: WORKS.length, brands: CLIENTS.length };
    $("[data-count-suffix='views']").textContent = views.suffix || "";
    const els = $$("[data-count]");
    const target = (el) => +(el.dataset.countValue ?? values[el.dataset.count] ?? 0);
    if (!hasGsap || !window.ScrollTrigger || reduceMotion) {
      els.forEach((el) => (el.textContent = target(el)));
      return;
    }
    els.forEach((el) => {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target(el), duration: 2, ease: "power2.out",
        onUpdate: () => (el.textContent = Math.round(obj.v)),
        scrollTrigger: { trigger: "[data-stats]", start: "top 85%", once: true },
      });
    });
  }

  /* ---------------------------------------------------------------------
     Intake form
     --------------------------------------------------------------------- */
  function initForm() {
    const form = $("[data-intake]");
    if (!form) return;
    const status = $("[data-form-status]");
    const label = $("[data-submit-label]");
    const setStatus = (content, kind = "") => {
      status.className = `intake__status mono ${kind ? `is-${kind}` : ""}`;
      if (typeof content === "string") {
        status.textContent = content;
      } else {
        status.innerHTML = "";
        status.appendChild(content);
      }
    };

    form.addEventListener("input", (e) => e.target.closest(".field")?.classList.remove("is-invalid"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const invalid = ["name", "email", "message"].filter((k) => {
        const el = form.elements[k];
        return !el.value.trim() || (k === "email" && !el.checkValidity());
      });
      invalid.forEach((k) => form.elements[k].closest(".field").classList.add("is-invalid"));
      if (invalid.length) {
        form.elements[invalid[0]].focus();
        return setStatus("Please fill in your name, a valid email and a short brief.", "error");
      }

      const payload = {
        name: data.get("name").trim(),
        email: data.get("email").trim(),
        projectType: data.getAll("type").join(", ") || "Not specified",
        budget: data.get("budget") || "Not specified",
        message: data.get("message").trim(),
      };

      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      const originalLabel = label.textContent;
      label.textContent = "Sending…";
      setStatus("Sending brief to studiotimelinee@gmail.com…");

      const endpoint = CONFIG.formEndpoint || `https://formsubmit.co/ajax/${CONFIG.email || "studiotimelinee@gmail.com"}`;
      const subject = `New Project Brief — ${payload.name} (${payload.projectType})`;
      const bodyText = `Name: ${payload.name}\nEmail: ${payload.email}\nProject Type: ${payload.projectType}\nBudget: ${payload.budget}\n\nBrief:\n${payload.message}`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            "Project Type": payload.projectType,
            Budget: payload.budget,
            Brief: payload.message,
            _subject: subject,
            _replyto: payload.email,
            _captcha: "false",
            _template: "table",
          }),
        });

        const resData = await res.json().catch(() => ({}));

        if (!res.ok || resData.success === false || resData.success === "false") {
          const msg = resData.message || "";
          if (msg.toLowerCase().includes("activation")) {
            setStatus("Activation required: please click 'Activate Form' in the email sent to studiotimelinee@gmail.com.", "error");
          } else {
            throw new Error(msg || `Submission failed with status ${res.status}`);
          }
        } else {
          form.reset();
          setStatus("Brief sent to studiotimelinee@gmail.com! We'll reply within 24 hours.", "success");
        }
      } catch (err) {
        console.warn("Form endpoint submission failed, offering direct compose:", err);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONFIG.email || "studiotimelinee@gmail.com")}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
        const fallbackSpan = document.createElement("span");
        fallbackSpan.innerHTML = `Could not send automatically. <a href="${gmailUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);text-decoration:underline;">Click here to send directly via Gmail</a>`;
        setStatus(fallbackSpan, "error");
      } finally {
        btn.disabled = false;
        label.textContent = originalLabel;
      }
    });
  }

  /* ---------------------------------------------------------------------
     Scroll-driven reveals
     --------------------------------------------------------------------- */
  function initReveals() {
    if (!hasGsap || !window.ScrollTrigger || reduceMotion) {
      $$(".reveal-up").forEach((el) => (el.style.opacity = 1));
      return;
    }

    if (window.SplitText) {
      $$("[data-split]").forEach((el) => {
        const inHero = !!el.closest(".hero");
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, {
            yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.08,
            delay: inHero ? 0.15 : 0,
            scrollTrigger: inHero ? null : { trigger: el, start: "top 85%", once: true },
            paused: inHero && !introDone,
            id: inHero ? "hero-title" : undefined,
          }),
        });
      });

      const statement = $("[data-words]");
      SplitText.create(statement, {
        type: "words",
        wordsClass: "word",
        onSplit: (self) => gsap.fromTo(self.words, { opacity: 0.14 }, {
          opacity: 1, stagger: 0.05, ease: "none",
          scrollTrigger: { trigger: statement, start: "top 80%", end: "bottom 45%", scrub: true },
        }),
      });
    }

    gsap.utils.toArray(".principles li, .process li, .svc__item, .client, .intake .field").forEach((el) => {
      gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });

    gsap.to(".hero__video", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__content", { yPercent: -12, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });
    gsap.from(".footer__word", { yPercent: 40, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 85%", once: true } });
  }

  /* ---------------------------------------------------------------------
     Loader + hero intro
     --------------------------------------------------------------------- */
  let introDone = false;
  function playIntro() {
    const loader = $(".loader");
    const heroReveals = $$(".hero .reveal-up");
    const finish = () => {
      introDone = true;
      loader.remove();
      if (!hasGsap || reduceMotion) { heroReveals.forEach((el) => (el.style.opacity = 1)); return; }
      gsap.getById("hero-title")?.play();
      gsap.to(heroReveals, { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.35 });
      gsap.from(".hero__timeline", { opacity: 0, y: 20, duration: 1, delay: 0.6, ease: "power3.out" });
      // Animate children: .nav itself owns a CSS transform transition for hide-on-scroll.
      gsap.from(".nav > *", { y: -24, opacity: 0, duration: 0.9, delay: 0.2, stagger: 0.08, ease: "power3.out", clearProps: "all" });
    };
    let seen = false;
    try {
      seen = !!sessionStorage.getItem("tl-intro");
      sessionStorage.setItem("tl-intro", "1");
    } catch { /* storage disabled: always play the intro */ }
    if (!hasGsap || reduceMotion || seen) return finish();

    lockScroll(true);
    const counter = $(".loader__count");
    const p = { v: 0 };
    gsap.timeline({ onComplete: () => { lockScroll(false); finish(); } })
      .to(p, { v: 1, duration: 1.6, ease: "power2.inOut", onUpdate: () => {
        counter.textContent = timecode(p.v * 4);
        $(".loader__fill").style.transform = `scaleX(${p.v})`;
        $(".loader__head").style.left = `${p.v * 100}%`;
      } })
      .to(".loader__inner", { opacity: 0, y: -20, duration: 0.4, ease: "power2.in" })
      .to(loader, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "-=0.1");
  }

  /* ---------------------------------------------------------------------
     Utils
     --------------------------------------------------------------------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  bindConfig();
  initTheme();
  startClock();
  initScroll();
  initCursor();
  initNav();
  initHero();
  initShowreel();
  initWork();
  initServices();
  initClients();
  initMarquee();
  initTilt();
  initStats();
  initForm();
  (document.fonts?.ready || Promise.resolve()).then(initReveals);
  playIntro();
})();
