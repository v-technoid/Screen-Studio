/* Recnook: site level behaviour (analytics events, hero button, offline support, install button).
 * The tool code lives in app.js. This file never touches your recordings or files.
 */
(function () {
  'use strict';

  // ================= shared page UI (every page) =================
  // ---------- mobile menu ----------
  var hamburgerBtn = document.getElementById('hamburgerBtn');
  var mobileNav = document.getElementById('mobileNav');
  if(hamburgerBtn){
    hamburgerBtn.addEventListener('click', function(){
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ mobileNav.classList.remove('open'); });
    });
  }

  // ---------- scroll reveal ----------
  if('IntersectionObserver' in window){
    var revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function(el){ revealObserver.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-visible'); });
  }

  // ---------- side nav active tool (sidebar and the chip bar on small screens) ----------
  var toolLinks = document.querySelectorAll('.side-nav .sn-tool, .tool-chips a');
  if(toolLinks.length && 'IntersectionObserver' in window){
    var navObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var id = entry.target.id;
        toolLinks.forEach(function(a){
          var on = a.dataset.target === id;
          a.classList.toggle('active', on);
          if(on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
          var grp = a.closest('.sn-group');
          if(grp) grp.classList.toggle('active', on);
          if(on && a.closest('.tool-chips')){ try{ a.scrollIntoView({ inline: 'center', block: 'nearest' }); }catch(e){} }
        });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    document.querySelectorAll('.tool-section').forEach(function(sec){ navObserver.observe(sec); });
  }

  // Sub feature links: some panels stay hidden until a file is loaded, so fall back to the tool itself.
  document.querySelectorAll('.sn-sub-link').forEach(function(link){
    link.addEventListener('click', function(e){
      var target = document.querySelector(link.getAttribute('href'));
      if(target && target.getClientRects().length) return;
      var grp = link.closest('.sn-group');
      var tool = grp && grp.querySelector('.sn-tool');
      var section = tool && document.getElementById(tool.dataset.target);
      if(section){ e.preventDefault(); section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // ---------- FAQ: smooth open and close, one answer open at a time ----------
  var faqItems = document.querySelectorAll('.faq-item');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(.22,.9,.3,1)';
  function faqOpen(d){
    if(d._anim) d._anim.cancel();
    d.classList.remove('is-closing');
    var from = d.offsetHeight;
    d.open = true;
    if(reduceMotion || !d.animate) return;
    var to = d.scrollHeight;
    d.style.height = from + 'px';
    var p = d.querySelector('p');
    if(p) p.animate({ opacity: [0, 1], transform: ['translateY(-8px)', 'none'] }, { duration: 520, easing: EASE, delay: 60, fill: 'backwards' });
    d._anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 460, easing: EASE });
    d._anim.onfinish = d._anim.oncancel = function(){ d.style.height = ''; d._anim = null; };
  }
  function faqClose(d){
    if(!d.open) return;
    if(d._anim) d._anim.cancel();
    var summary = d.querySelector('summary');
    d.classList.add('is-closing');
    if(reduceMotion || !d.animate){ d.open = false; d.classList.remove('is-closing'); return; }
    var from = d.offsetHeight;
    var to = summary.offsetHeight + (d.offsetHeight - d.clientHeight);
    d._anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 380, easing: EASE });
    d._anim.onfinish = function(){ d.open = false; d.classList.remove('is-closing'); d.style.height = ''; d._anim = null; };
    d._anim.oncancel = function(){ d.style.height = ''; };
  }
  faqItems.forEach(function(d){
    var summary = d.querySelector('summary');
    if(!summary) return;
    summary.addEventListener('click', function(e){
      e.preventDefault();
      if(d.open && !d.classList.contains('is-closing')){ faqClose(d); return; }
      faqItems.forEach(function(o){ if(o !== d) faqClose(o); });
      faqOpen(d);
    });
  });

  // ---------- top bar: hide while scrolling down, slide back in when scrolling up ----------
  var topbarEl = document.querySelector('.topbar');
  if(topbarEl){
    var lastY = window.pageYOffset, ticking = false;
    var setBarHidden = function(hidden){
      topbarEl.classList.toggle('is-hidden', hidden);
      document.body.classList.toggle('bar-hidden', hidden);
    };
    var barBusy = function(){
      return (mobileNav && mobileNav.classList.contains('open')) || topbarEl.matches(':hover') || topbarEl.querySelector('.menu:focus-within');
    };
    var onBarScroll = function(){
      ticking = false;
      var y = Math.max(0, window.pageYOffset);
      var dy = y - lastY;
      if(y < 70){ setBarHidden(false); lastY = y; return; }
      if(Math.abs(dy) < 8) return;
      if(dy > 0){ if(!barBusy()) setBarHidden(true); } else { setBarHidden(false); }
      lastY = y;
    };
    window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; window.requestAnimationFrame(onBarScroll); } }, { passive: true });
    topbarEl.addEventListener('focusin', function(){ setBarHidden(false); });
  }

  // ---------- start recording card: light follows the pointer ----------
  var ctaCard = document.getElementById('ctaCard');
  if(ctaCard && !reduceMotion){
    ctaCard.addEventListener('pointermove', function(e){
      var r = ctaCard.getBoundingClientRect();
      ctaCard.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      ctaCard.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  // ---------- dark mode ----------
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var sunIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var moonIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem('ss-theme', t); }catch(e){}
    if(themeToggleBtn){
      themeToggleBtn.innerHTML = t === 'dark' ? sunIcon : moonIcon;
      themeToggleBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    // keep the browser bar color in step with a manual choice, not only the system setting
    themeColorMetas.forEach(function(m){ m.setAttribute('content', t === 'dark' ? '#06070c' : '#eceef7'); m.removeAttribute('media'); });
  }
  var savedTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  try{ savedTheme = localStorage.getItem('ss-theme') || savedTheme; }catch(e){}
  applyTheme(savedTheme);

  // Click: a circle of the new theme grows from the button (Chrome, Edge, Safari). Other browsers get a soft fade.
  function switchTheme(next, x, y){
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(themeToggleBtn && !reduce){
      themeToggleBtn.classList.remove('spin'); void themeToggleBtn.offsetWidth;
    }
    if(reduce){ applyTheme(next); return; }
    if(document.startViewTransition){
      var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      var vt = document.startViewTransition(function(){ applyTheme(next); if(themeToggleBtn) themeToggleBtn.classList.add('spin'); });
      vt.ready.then(function(){
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(.22,.9,.3,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function(){});
    } else {
      var root = document.documentElement;
      root.classList.add('theme-fade');
      applyTheme(next);
      if(themeToggleBtn) themeToggleBtn.classList.add('spin');
      setTimeout(function(){ root.classList.remove('theme-fade'); }, 520);
    }
  }
  if(themeToggleBtn){
    themeToggleBtn.addEventListener('click', function(){
      var cur = document.documentElement.getAttribute('data-theme');
      var r = themeToggleBtn.getBoundingClientRect();
      switchTheme(cur === 'dark' ? 'light' : 'dark', r.left + r.width / 2, r.top + r.height / 2);
    });
  }

  // ---------- hero word stagger ----------
  var heroTitle = document.getElementById('heroTitle');
  if(heroTitle){
    var heroWords = heroTitle.querySelectorAll('.hero-word');
    heroWords.forEach(function(w, i){ w.style.transitionDelay = (i * 0.045) + 's'; });
    if('IntersectionObserver' in window){
      var heroObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            heroObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      heroObserver.observe(heroTitle);
    } else {
      heroTitle.classList.add('is-visible');
    }
  }

  // ---------- local visit counter ----------
  var visitCounterEl = document.getElementById('visitCounter');
  if(visitCounterEl){
    try{
      var visits = parseInt(localStorage.getItem('ss-visits') || '0', 10) + 1;
      localStorage.setItem('ss-visits', visits);
      visitCounterEl.textContent = 'Opened on this device ' + visits + (visits === 1 ? ' time' : ' times');
    }catch(e){
      visitCounterEl.textContent = '';
    }
  }

  // ---------- auto-updating copyright year ----------
  var copyrightYearEl = document.getElementById('copyrightYear');
  if(copyrightYearEl){
    copyrightYearEl.textContent = new Date().getFullYear();
  }



  // ---------- analytics ----------
  // Vercel Web Analytics custom events. Page views work on every plan, but custom events need a Pro or
  // Enterprise plan on Vercel. On a free plan these calls are simply ignored, nothing breaks.
  // The window.va stub and the insights script are added in index.html.
  window.ssTrack = function (name, data) {
    try {
      if (typeof window.va !== 'function') return;
      window.va('event', data ? { name: name, data: data } : { name: name });
    } catch (e) { /* analytics must never break the app */ }
  };

  // Any element with data-track="event_name" reports a click.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (el) window.ssTrack(el.getAttribute('data-track'));
    var card = e.target.closest && e.target.closest('.bento');
    if (card) window.ssTrack('feature_tile_click', { page: (card.getAttribute('href') || '').replace('/', '') });
}, true); // capture phase: the click is logged before the button's own action runs

  // Scroll depth at 25, 50 and 75 percent, once each per visit.
  var depthSent = {};
  var depthTicking = false;
  function checkDepth() {
    depthTicking = false;
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight, document.body.scrollHeight);
    if (total <= window.innerHeight) return;
    var pct = ((window.scrollY || window.pageYOffset) + window.innerHeight) / total * 100;
    [25, 50, 75].forEach(function (mark) {
      if (pct >= mark && !depthSent[mark]) {
        depthSent[mark] = true;
        window.ssTrack('scroll_depth', { percent: mark });
      }
    });
  }
  window.addEventListener('scroll', function () {
    if (!depthTicking) { depthTicking = true; requestAnimationFrame(checkDepth); }
  }, { passive: true });


  // ---------- scroll progress bar ----------
  var bar = document.getElementById('scrollProgress');
  if (bar) {
    var barTick = false;
    var paintBar = function () {
      barTick = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, (window.scrollY || 0) / max) : 0) + ')';
    };
    window.addEventListener('scroll', function () { if (!barTick) { barTick = true; requestAnimationFrame(paintBar); } }, { passive: true });
    paintBar();
  }

  // ---------- cursor spotlight on the hero ----------
  var heroEl = document.getElementById('top');
  if (heroEl && window.matchMedia('(hover: hover)').matches) {
    heroEl.addEventListener('mousemove', function (e) {
      var r = heroEl.getBoundingClientRect();
      heroEl.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      heroEl.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  // ---------- demo clock in the hero mockup ----------
  var demoTimer = document.getElementById('demoTimer');
  if (demoTimer) {
    var secs = 12;
    setInterval(function () {
      secs = (secs + 1) % 600;
      demoTimer.textContent = (secs < 600 ? '0' : '') + Math.floor(secs / 60) + ':' + (secs % 60 < 10 ? '0' : '') + (secs % 60);
    }, 1000);
  }

  // ---------- count up numbers ----------
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cObs.unobserve(en.target);
        var el = en.target, to = parseInt(el.getAttribute('data-count'), 10), t0 = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - t0) / 1100);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cObs.observe(c); });
  }

  // ---------- gentle 3D tilt on the hero demo (mouse only) ----------
  var demo = document.getElementById('heroStage');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (demo && !reduce && window.matchMedia('(hover: hover)').matches) {
    var hero = document.getElementById('top');
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      demo.style.transform = 'rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
    });
    hero.addEventListener('mouseleave', function () { demo.style.transform = ''; });
  }

  // ---------- "Start recording" buttons anywhere on the page ----------
  // They scroll to the recorder and press the real Start button. Calling click() inside the user's own click
  // keeps the browser's permission to open the screen picker.
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  var startButtons = document.querySelectorAll('[data-start-recording]');
  var heroNote = document.getElementById('heroNote');
  var onHome = !!document.getElementById('startRecBtn');
  startButtons.forEach(function (btn) {
    if (onHome && !canRecord) {
      var label = btn.querySelector('.btn-label');
      if (label) label.textContent = 'Open the tools';
      var dot = btn.querySelector('svg'); if (dot) dot.style.display = 'none';
    }
    btn.addEventListener('click', function (e) {
      if (!onHome) return; // on other pages the link goes to the home page recorder
      e.preventDefault();
      var rec = document.getElementById('record');
      var startBtn = document.getElementById('startRecBtn');
      if (rec) rec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (canRecord && startBtn && !startBtn.disabled) startBtn.click();
    });
  });
  if (onHome && !canRecord && heroNote) {
    heroNote.textContent = 'Screen recording needs a desktop browser such as Chrome or Edge. You can still use the editor and the other tools here.';
  }

  // ---------- offline support ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* offline mode is a bonus, ignore failures */ });
    });
  }

  // ---------- install button ----------
  var deferredPrompt = null;
  var installBtn = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) return;
    var bar = document.querySelector('.topbar-inner');
    var themeBtn = document.getElementById('themeToggleBtn');
    if (!bar) return;
    installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.className = 'install-btn';
    installBtn.textContent = 'Install app';
    bar.insertBefore(installBtn, themeBtn);
    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        if (installBtn) { installBtn.remove(); installBtn = null; }
      });
    });
  });
  window.addEventListener('appinstalled', function () { window.ssTrack('app_installed'); });
})();
