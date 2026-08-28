/* =====================================================================
   Jayashree Kathiresan — Portfolio
   Vanilla JS. Lenis is used for momentum scrolling when it is available and
   the page falls back to native smooth scrolling when it is not (e.g. offline).
   ===================================================================== */

const reduceMotion = false; // window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------------------------------------------------------------
   Smooth scrolling
   --------------------------------------------------------------- */
let lenis = null;

if (typeof Lenis !== 'undefined' && !reduceMotion) {
    lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true
    });
    // Lenis drives scrolling itself; native smooth scrolling would fight it.
    document.documentElement.style.scrollBehavior = 'auto';
}

/* One requestAnimationFrame loop drives Lenis and the tilt easing together */
const tiltStates = new Map();

function frame(time) {
    if (lenis) lenis.raf(time);

    tiltStates.forEach((state, card) => {
        const ease = 0.12;
        state.x += (state.tx - state.x) * ease;
        state.y += (state.ty - state.y) * ease;
        state.lift += (state.tLift - state.lift) * ease;

        const settled =
            Math.abs(state.tx - state.x) < 0.01 &&
            Math.abs(state.ty - state.y) < 0.01 &&
            Math.abs(state.tLift - state.lift) < 0.01;

        if (settled && state.tx === 0 && state.ty === 0 && state.tLift === 0) {
            card.style.transform = '';
            card.style.boxShadow = '';
            card.classList.remove('is-tilting');
            tiltStates.delete(card);
            return;
        }

        card.style.transform =
            `perspective(1000px) rotateX(${state.x.toFixed(3)}deg) ` +
            `rotateY(${state.y.toFixed(3)}deg) translateY(${state.lift.toFixed(2)}px)`;

        const strength = Math.min(Math.abs(state.lift) / 8, 1);
        card.style.boxShadow = `0 20px 40px -10px rgba(139, 92, 246, ${(0.3 * strength).toFixed(3)})`;
    });

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* Anchor links — routed through Lenis so in-page jumps stay smooth */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const id = anchor.getAttribute('href');
        if (id === '#' || id.length < 2) return;

        const target = document.querySelector(id);
        if (!target) return;

        if (lenis) {
            e.preventDefault();
            lenis.scrollTo(target, { offset: -80, duration: 1.4 });
            history.replaceState(null, '', id);
        }
    });
});

/* ---------------------------------------------------------------
   Scroll progress + nav state
   --------------------------------------------------------------- */
const progressEl = document.querySelector('.scroll-progress');
const navEl = document.querySelector('.nav');
const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const sections = navAnchors
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

let scrollQueued = false;

function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    progressEl.style.width = (max > 0 ? Math.min((y / max) * 100, 100) : 0) + '%';
    navEl.classList.toggle('scrolled', y > 50);

    // active nav link = last section whose top has passed a third of the viewport
    let current = null;
    const line = y + window.innerHeight * 0.32;
    sections.forEach(sec => {
        if (sec.offsetTop <= line) current = '#' + sec.id;
    });
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === current));

    scrollQueued = false;
}

window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(onScroll);
}, { passive: true });

window.addEventListener('resize', onScroll);
onScroll();

/* ---------------------------------------------------------------
   Mouse position tracking — drives the background glow
   --------------------------------------------------------------- */
if (!reduceMotion && finePointer) {
    let glowQueued = false;
    let mx = 50;
    let my = 50;

    document.addEventListener('mousemove', e => {
        mx = e.clientX / window.innerWidth * 100;
        my = e.clientY / window.innerHeight * 100;

        if (glowQueued) return;
        glowQueued = true;

        requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--mouse-x', mx + '%');
            document.documentElement.style.setProperty('--mouse-y', my + '%');
            glowQueued = false;
        });
    }, { passive: true });
}

/* ---------------------------------------------------------------
   3D tilt on cards — eased in the shared rAF loop above
   --------------------------------------------------------------- */
if (!reduceMotion && finePointer) {
    const tiltCards = document.querySelectorAll(
        '.project-card, .skill-card, .design-card, .edu-card, .social-item, ' +
        '.cert-item, .highlight-item, .stat-item, .profile-card'
    );

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const state = tiltStates.get(card) || { x: 0, y: 0, lift: 0, tx: 0, ty: 0, tLift: 0 };

            state.tx = (e.clientY - rect.top - rect.height / 2) / 14;
            state.ty = (rect.width / 2 - (e.clientX - rect.left)) / 14;
            state.tLift = -8;

            card.classList.add('is-tilting');
            tiltStates.set(card, state);
        });

        card.addEventListener('mouseleave', () => {
            const state = tiltStates.get(card);
            if (!state) return;
            state.tx = 0;
            state.ty = 0;
            state.tLift = 0;
        });
    });
}

/* ---------------------------------------------------------------
   Typing animation
   --------------------------------------------------------------- */
const typingText = document.getElementById('typing-text');
const roles = [
    'Full-stack Developer',
    'UI/UX Designer',
    'Frontend Developer',
    'Figma Prototyper',
    'AI Tools Builder'
];

/* The first role is already in the HTML so there is no layout jump before the
   script runs — which means the loop has to start in the deleting phase. */
let roleIndex = 0;
let charIndex = roles[0].length;
let isDeleting = true;

function type() {
    const current = roles[roleIndex];
    let speed;

    if (isDeleting) {
        charIndex = Math.max(0, charIndex - 1);
        speed = 40;
    } else {
        charIndex = Math.min(current.length, charIndex + 1);
        speed = 110;
    }

    typingText.textContent = current.substring(0, charIndex);

    if (!isDeleting && charIndex === current.length) {
        isDeleting = true;
        speed = 2200;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        speed = 500;
    }

    setTimeout(type, speed);
}

/* ---------------------------------------------------------------
   Reveal on scroll
   --------------------------------------------------------------- */
const revealTargets = document.querySelectorAll(
    '.section, .stats-matrix, .stat-item, .project-card, .skill-card, ' +
    '.design-card, .cert-item, .highlight-item'
);

const pendingReveals = new Set();
let revealObserver = null;

function reveal(el, delay) {
    if (!pendingReveals.has(el)) return;
    pendingReveals.delete(el);
    if (revealObserver) revealObserver.unobserve(el);

    if (delay) setTimeout(() => el.classList.add('revealed'), delay);
    else el.classList.add('revealed');
}

revealTargets.forEach(el => {
    el.classList.add('reveal-init');
    pendingReveals.add(el);
});

if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) reveal(entry.target, index * 90);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    pendingReveals.forEach(el => revealObserver.observe(el));
} else {
    [...pendingReveals].forEach(el => reveal(el, 0));
}

/* Safety net. A fast flick can carry an element through the viewport between
   two IntersectionObserver samples, and it would then stay at opacity 0
   forever. Anything already at or above the middle of the screen is revealed
   outright; elements still coming up from the bottom keep the staggered
   observer reveal. */
function sweepReveals() {
    if (!pendingReveals.size) return;
    const limit = window.innerHeight * 0.5;
    [...pendingReveals].forEach(el => {
        if (el.getBoundingClientRect().top < limit) reveal(el, 0);
    });
}

/* Registered here rather than inside onScroll() so it cannot run before
   pendingReveals is initialised. It stops doing any work as soon as the set
   empties out. */
window.addEventListener('scroll', sweepReveals, { passive: true });
window.addEventListener('resize', sweepReveals);
window.addEventListener('load', sweepReveals);
sweepReveals();

/* Drop the will-change hint once a reveal has finished so the compositor
   is not holding a layer for every card on the page. Only the reveal's own
   properties count — the tilt manages its own hint via `.is-tilting`. */
document.addEventListener('transitionend', e => {
    if (e.propertyName !== 'opacity' && e.propertyName !== 'translate') return;
    if (e.target.classList && e.target.classList.contains('revealed')) {
        e.target.style.willChange = 'auto';
    }
});

/* ---------------------------------------------------------------
   Mobile menu
   --------------------------------------------------------------- */
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
const menuIcon = menuBtn.querySelector('use');

function setMenu(open) {
    navLinks.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuIcon.setAttribute('href', open ? '#i-close' : '#i-menu');

    if (lenis) open ? lenis.stop() : lenis.start();
}

menuBtn.addEventListener('click', () => {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
});

navLinks.addEventListener('click', e => {
    if (e.target.closest('a')) setMenu(false);
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setMenu(false);
});

/* ---------------------------------------------------------------
   Certificate lightbox
   --------------------------------------------------------------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
let lastFocused = null;

function openLightbox(src, alt) {
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || 'Certificate';
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    if (lenis) lenis.stop();

    // next frame so the transition has a starting state to animate from
    requestAnimationFrame(() => lightbox.classList.add('open'));
    lightboxClose.focus();
}

function closeLightbox() {
    if (lightbox.hidden) return;
    lightbox.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    if (lenis) lenis.start();

    const finish = () => {
        lightbox.hidden = true;
        // removeAttribute rather than src='' — an empty src re-requests the page
        lightboxImg.removeAttribute('src');
    };

    if (reduceMotion) finish();
    else setTimeout(finish, 350);

    if (lastFocused) lastFocused.focus();
}

document.querySelectorAll('[data-cert]').forEach(btn => {
    btn.addEventListener('click', () => {
        const img = btn.querySelector('img');
        openLightbox(btn.dataset.cert, img ? img.alt : '');
    });
});

lightbox.addEventListener('click', closeLightbox);
lightboxClose.addEventListener('click', closeLightbox);

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeLightbox();
    setMenu(false);
});

/* ---------------------------------------------------------------
   Footer year + start typing
   --------------------------------------------------------------- */
document.getElementById('year').textContent = new Date().getFullYear();

if (reduceMotion) {
    typingText.textContent = roles[0];
} else {
    setTimeout(type, 1200);
  }
        
