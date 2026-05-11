/* ============================================
   ФОРЕСТ — main.js (lean & robust)
   ============================================ */

(function () {
    'use strict';

    const docEl = document.documentElement;
    const body = document.body;
    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;

    // ============================================
    // THEME (light / dark)
    // ============================================
    const THEME_KEY = 'forest-theme';
    const themeMQ = window.matchMedia('(prefers-color-scheme: dark)');

    function readTheme() {
        try {
            const t = localStorage.getItem(THEME_KEY);
            if (t === 'light' || t === 'dark') return t;
        } catch (e) {}
        return themeMQ.matches ? 'dark' : 'light';
    }

    function applyTheme(theme, animate) {
        if (animate) {
            docEl.classList.add('theme-transition');
            window.setTimeout(function () {
                docEl.classList.remove('theme-transition');
            }, 500);
        }
        docEl.dataset.theme = theme;
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            btn.setAttribute('aria-label',
                theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
        });
        document.querySelectorAll('.mobile-theme-toggle .label-text').forEach(function (el) {
            el.textContent = theme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
        });
    }

    // Применяем тему ASAP, чтобы избежать вспышки
    applyTheme(readTheme(), false);

    function toggleTheme() {
        const cur = docEl.dataset.theme === 'dark' ? 'dark' : 'light';
        applyTheme(cur === 'dark' ? 'light' : 'dark', true);
    }

    document.addEventListener('click', function (e) {
        const toggle = e.target.closest('.theme-toggle, .mobile-theme-toggle');
        if (!toggle) return;
        e.preventDefault();
        toggleTheme();
    });

    themeMQ.addEventListener('change', function (ev) {
        try {
            if (localStorage.getItem(THEME_KEY)) return;
        } catch (e) {}
        applyTheme(ev.matches ? 'dark' : 'light', true);
    });

    // ============================================
    // INJECT: theme toggle + mobile theme toggle + contact modal
    // ============================================
    function injectThemeToggles() {
        const sunSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
        const moonSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
        const toggleHtml =
            '<button type="button" class="theme-toggle" aria-label="Переключить тему" aria-pressed="false">' +
            '<span class="theme-toggle-thumb"></span>' +
            '<span class="theme-toggle-icon sun">' + sunSvg + '</span>' +
            '<span class="theme-toggle-icon moon">' + moonSvg + '</span>' +
            '</button>';

        document.querySelectorAll('.header-cta').forEach(function (host) {
            if (host.querySelector('.theme-toggle')) return;
            const phone = host.querySelector('.phone-link');
            const wrap = document.createElement('span');
            wrap.innerHTML = toggleHtml;
            const toggle = wrap.firstChild;
            if (phone && phone.parentNode === host) {
                host.insertBefore(toggle, phone);
            } else {
                host.insertBefore(toggle, host.firstChild);
            }
        });

        document.querySelectorAll('.mobile-menu').forEach(function (menu) {
            if (menu.querySelector('.mobile-theme-toggle')) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mobile-theme-toggle';
            btn.setAttribute('aria-label', 'Переключить тему');
            const initial = docEl.dataset.theme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
            btn.innerHTML =
                '<span class="label-text">' + initial + '</span>' + toggleHtml;
            menu.appendChild(btn);
        });

        // Финальная синхронизация состояний
        applyTheme(docEl.dataset.theme || 'light', false);
    }

    // ============================================
    // CONTACT MODAL
    // ============================================
    function injectContactModal() {
        if (document.getElementById('contactModal')) return;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'contactModal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML =
            '<div class="modal-backdrop" data-modal-close></div>' +
            '<div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">' +
            '<button class="modal-close" type="button" aria-label="Закрыть" data-modal-close>' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>' +
            '</button>' +
            '<div class="modal-content">' +
            '<span class="eyebrow modal-eyebrow">Дизайн-проект</span>' +
            '<h2 id="contactModalTitle">Расскажите о&nbsp;вашем проекте.</h2>' +
            '<p class="modal-lede">Дизайнер свяжется с вами в течение рабочего дня, задаст уточняющие вопросы и согласует время для встречи или замера.</p>' +
            '<form class="contact-form" id="modalContactForm" novalidate>' +
            '<div class="form-row">' +
            '<div class="field"><label for="m-name">Имя</label><input type="text" id="m-name" name="name" placeholder="Как к вам обращаться" required></div>' +
            '<div class="field"><label for="m-phone">Телефон</label><input type="tel" id="m-phone" name="phone" placeholder="+7 (___) ___-__-__" required></div>' +
            '</div>' +
            '<div class="field"><label for="m-message">О проекте</label><textarea id="m-message" name="message" placeholder="Кратко о задаче, метраже, сроках"></textarea></div>' +
            '<div class="form-actions">' +
            '<button type="submit" class="btn btn-primary"><span>Отправить заявку</span>' +
            '<svg class="btn-arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 7h12M8 2l5 5-5 5"/></svg>' +
            '</button>' +
            '<p class="form-disclaimer">Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.</p>' +
            '</div>' +
            '</form>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);
    }

    let lastFocused = null;

    function openModal() {
        const modal = document.getElementById('contactModal');
        if (!modal) return;
        lastFocused = document.activeElement;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        body.classList.add('modal-open');
        // Focus first input
        const firstInput = modal.querySelector('input, textarea, button:not([data-modal-close])');
        if (firstInput) {
            window.setTimeout(function () { firstInput.focus(); }, 300);
        }
    }

    function closeModal() {
        const modal = document.getElementById('contactModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        body.classList.remove('modal-open');
        if (lastFocused && typeof lastFocused.focus === 'function') {
            lastFocused.focus();
        }
    }

    function bindModal() {
        document.addEventListener('click', function (e) {
            // Close
            if (e.target.closest('[data-modal-close]')) {
                e.preventDefault();
                closeModal();
                return;
            }
            // Open: trigger by data-modal="contact" OR href ending with #contact (вне страницы контактов)
            const trigger = e.target.closest('[data-modal="contact"], a[href$="#contact"]');
            if (!trigger) return;
            // На странице контактов оставляем якорный скролл, без модалки
            const isContactsPage = /\/contacts\.html(?:$|[?#])/.test(location.pathname);
            if (isContactsPage) return;
            e.preventDefault();
            openModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('contactModal');
                if (modal && modal.classList.contains('is-open')) {
                    e.preventDefault();
                    closeModal();
                }
            }
        });

        // Submit-обработчик внутри модалки
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (!form || form.id !== 'modalContactForm') return;
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                const span = btn.querySelector('span');
                if (span) span.textContent = 'Отправлено · ждите звонка';
            }
            window.setTimeout(closeModal, 1200);
        });
    }

    // Initialize after DOM ready
    function initEnhancements() {
        injectThemeToggles();
        injectContactModal();
        bindModal();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancements);
    } else {
        initEnhancements();
    }

    // Reveal page once everything is ready (avoid FOUC)
    function revealPage() {
        docEl.classList.remove('is-loading');
    }

    if (document.readyState === 'complete') {
        revealPage();
    } else {
        window.addEventListener('load', revealPage);
        // Fallback in case load is delayed by external assets
        setTimeout(revealPage, 1500);
    }

    // ---------- Header scroll state ----------
    const header = document.getElementById('siteHeader');

    function updateHeaderState() {
        if (!header) return;
        const scrolled = window.scrollY > 24;
        header.classList.toggle('is-scrolled', scrolled);

        // Light header only when over the dark hero (main page) or page-intro (inner pages)
        const darkHero = document.querySelector('.hero, .page-intro');
        if (darkHero) {
            const heroBottom = darkHero.getBoundingClientRect().bottom;
            const overHero = heroBottom > 80 && !scrolled;
            header.classList.toggle('is-light', overHero);
        }
    }

    window.addEventListener('scroll', updateHeaderState, { passive: true });
    window.addEventListener('resize', updateHeaderState);
    updateHeaderState();

    // ---------- Mobile menu ----------
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('menuOverlay');

    function closeMenu() {
        body.classList.remove('menu-open');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            body.classList.toggle('menu-open');
        });
    }
    if (overlay) overlay.addEventListener('click', closeMenu);

    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
        a.addEventListener('click', closeMenu);
    });

    // Legacy hamburger (inner pages: .hamburger + .nav-menu)
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        navMenu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // ---------- Smooth scroll (anchors) ----------
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (!id || id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const headerOffset =
                parseInt(
                    getComputedStyle(document.documentElement).getPropertyValue(
                        '--header-h'
                    )
                ) || 80;
            const top =
                target.getBoundingClientRect().top + window.scrollY - headerOffset + 1;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    // ---------- Reveal-on-scroll ----------
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && reveals.length) {
        const io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );
        reveals.forEach(function (el) {
            io.observe(el);
        });
    } else {
        reveals.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    // ---------- Swiper sliders ----------
    function initSwipers() {
        if (typeof Swiper === 'undefined') return;

        const common = {
            watchOverflow: true,
            observer: true,
            observeParents: true,
        };

        // Hero (fade) — главная
        document.querySelectorAll('.hero-swiper').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    loop: true,
                    speed: prefersReducedMotion ? 0 : 1200,
                    effect: prefersReducedMotion ? 'slide' : 'fade',
                    fadeEffect: { crossFade: true },
                    autoplay: prefersReducedMotion
                        ? false
                        : { delay: 5500, disableOnInteraction: false },
                    pagination: {
                        el: '#heroPagination',
                        clickable: true,
                    },
                }));
            } catch (err) {
                console.warn('hero-swiper init failed', err);
            }
        });

        // Page intro (внутренние страницы) — fade + Ken Burns
        document.querySelectorAll('.page-intro-swiper').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    loop: true,
                    speed: prefersReducedMotion ? 400 : 1400,
                    effect: 'fade',
                    fadeEffect: { crossFade: true },
                    autoplay: prefersReducedMotion
                        ? false
                        : { delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true },
                    pagination: {
                        el: el.parentElement.querySelector('.page-intro-pagination'),
                        clickable: true,
                    },
                    keyboard: { enabled: true },
                }));
            } catch (err) {
                console.warn('page-intro-swiper init failed', err);
            }
        });

        // Projects rail (cards)
        document.querySelectorAll('.projects-rail').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    slidesPerView: 1.1,
                    spaceBetween: 20,
                    breakpoints: {
                        640: { slidesPerView: 1.6, spaceBetween: 22 },
                        900: { slidesPerView: 2.2, spaceBetween: 24 },
                        1200: { slidesPerView: 3, spaceBetween: 24 },
                    },
                    navigation: {
                        prevEl: '.projects-prev',
                        nextEl: '.projects-next',
                        disabledClass: 'is-disabled',
                    },
                }));
            } catch (err) {
                console.warn('projects-rail init failed', err);
            }
        });

        // Page-showcase (inner pages) — full-bleed, fade, Ken Burns
        document.querySelectorAll('.page-showcase-swiper').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    loop: true,
                    speed: prefersReducedMotion ? 400 : 1400,
                    effect: 'fade',
                    fadeEffect: { crossFade: true },
                    autoplay: prefersReducedMotion
                        ? false
                        : { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true },
                    parallax: false,
                    pagination: {
                        el: el.querySelector('.swiper-pagination'),
                        clickable: true,
                    },
                    navigation: {
                        prevEl: el.querySelector('.swiper-button-prev'),
                        nextEl: el.querySelector('.swiper-button-next'),
                    },
                    keyboard: { enabled: true },
                }));
            } catch (err) {
                console.warn('page-showcase-swiper init failed', err);
            }
        });

        // Catalog rail
        document.querySelectorAll('.catalog-models-swiper').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    slidesPerView: 1.05,
                    spaceBetween: 20,
                    breakpoints: {
                        640: { slidesPerView: 1.8 },
                        900: { slidesPerView: 2.4 },
                        1200: { slidesPerView: 3 },
                    },
                    pagination: {
                        el: el.querySelector('.swiper-pagination'),
                        clickable: true,
                    },
                }));
            } catch (err) {
                console.warn('catalog-models-swiper init failed', err);
            }
        });

        // Projects-page rail
        document.querySelectorAll('.projects-page-swiper').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    slidesPerView: 1.05,
                    spaceBetween: 20,
                    breakpoints: {
                        640: { slidesPerView: 1.8 },
                        900: { slidesPerView: 2.2 },
                        1200: { slidesPerView: 2.6 },
                    },
                    pagination: {
                        el: el.querySelector('.swiper-pagination'),
                        clickable: true,
                    },
                    navigation: {
                        prevEl: el.querySelector('.swiper-button-prev'),
                        nextEl: el.querySelector('.swiper-button-next'),
                    },
                }));
            } catch (err) {
                console.warn('projects-page-swiper init failed', err);
            }
        });

        // Mosaic strip (free, no pagination)
        document.querySelectorAll('.mosaic-strip-swiper').forEach(function (el) {
            if (el.dataset.swiperReady) return;
            el.dataset.swiperReady = '1';
            try {
                new Swiper(el, Object.assign({}, common, {
                    slidesPerView: 'auto',
                    spaceBetween: 16,
                    freeMode: { enabled: true, momentum: !prefersReducedMotion },
                    grabCursor: true,
                }));
            } catch (err) {
                console.warn('mosaic-strip-swiper init failed', err);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSwipers);
    } else {
        initSwipers();
    }

    // ---------- Contact form (UX) ----------
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn ? btn.innerHTML : '';
            const name = form.querySelector('#name');
            const phone = form.querySelector('#phone');
            if (!name.value.trim() || !phone.value.trim()) {
                if (!name.value.trim()) name.focus();
                else phone.focus();
                return;
            }
            if (btn) {
                btn.innerHTML = 'Отправляем...';
                btn.disabled = true;
            }
            setTimeout(function () {
                if (btn) {
                    btn.innerHTML = 'Заявка отправлена ·';
                    btn.disabled = false;
                }
                form.reset();
                setTimeout(function () {
                    if (btn) btn.innerHTML = originalText;
                }, 2400);
            }, 800);
        });
    }
})();
