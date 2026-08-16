(function () {
    'use strict';

    var storageKey = 'pnloj-theme';
    var root = document.documentElement;

    function systemTheme() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function storedTheme() {
        try {
            var value = window.localStorage.getItem(storageKey);
            return value === 'light' || value === 'dark' ? value : null;
        } catch (error) {
            return null;
        }
    }

    function currentTheme() {
        var value = root.getAttribute('data-pnloj-theme');
        return value === 'dark' ? 'dark' : 'light';
    }

    function syncEditorTheme(theme) {
        var isDark = theme === 'dark';
        var aceTheme = isDark ? 'ace/theme/twilight' : 'ace/theme/github';

        if (document.body) {
            document.body.setAttribute('data-theme', theme);
        }

        document.querySelectorAll('.main-martor .ui').forEach(function (element) {
            element.classList.toggle('inverted', isDark);
        });

        if (!window.ace) {
            return;
        }

        document.querySelectorAll('.main-martor .martor-field.ace_editor[id]').forEach(function (element) {
            window.ace.edit(element.id).setTheme(aceTheme);
        });

        document.querySelectorAll('.django-ace-widget[id]').forEach(function (element) {
            var editor = window[element.id];
            if (editor && typeof editor.setTheme === 'function') {
                editor.setTheme(aceTheme);
            }
        });
    }

    function updateThemeControls(theme) {
        var isDark = theme === 'dark';
        var isVietnamese = (document.documentElement.lang || '').toLowerCase().indexOf('vi') === 0;
        var label = isDark
            ? (isVietnamese ? 'Chuyển sang giao diện sáng' : 'Switch to light theme')
            : (isVietnamese ? 'Chuyển sang giao diện tối' : 'Switch to dark theme');

        document.querySelectorAll('[data-pnloj-theme-toggle]').forEach(function (button) {
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            button.setAttribute('aria-pressed', isDark ? 'true' : 'false');

            var icon = button.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
            }

            var text = button.querySelector('.pnloj-theme-label');
            if (text) {
                text.textContent = label;
            }
        });
    }

    function applyTheme(theme, persist) {
        var selected = theme === 'dark' ? 'dark' : 'light';
        root.setAttribute('data-pnloj-theme', selected);
        syncEditorTheme(selected);

        var baseTheme = document.getElementById('pnloj-base-theme');
        if (baseTheme) {
            var nextHref = selected === 'dark' ? baseTheme.dataset.darkUrl : baseTheme.dataset.lightUrl;
            if (nextHref && baseTheme.getAttribute('href') !== nextHref) {
                baseTheme.setAttribute('href', nextHref);
            }
        }

        var themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', selected === 'dark' ? '#1a1a1a' : '#ffffff');
        }

        if (persist) {
            try {
                window.localStorage.setItem(storageKey, selected);
            } catch (error) {
                // Storage can be unavailable in privacy modes; the current page still works.
            }
        }

        updateThemeControls(selected);
    }

    function bindThemeControls() {
        document.querySelectorAll('[data-pnloj-theme-toggle]').forEach(function (button) {
            button.addEventListener('click', function () {
                applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
            });
        });
        updateThemeControls(currentTheme());
    }

    function bindMobileNavigation() {
        var navIcon = document.getElementById('navicon');
        var navList = document.getElementById('nav-list');

        if (!navIcon || !navList) {
            return;
        }

        function isMenuOpen() {
            return navIcon.getAttribute('aria-expanded') === 'true';
        }

        function setMenuOpen(open) {
            navList.classList.toggle('show-list', open);
            navIcon.classList.toggle('hover', open);
            navIcon.setAttribute('aria-expanded', open ? 'true' : 'false');

            var icon = navIcon.querySelector('i');
            if (icon) {
                icon.className = open ? 'fa fa-times' : 'fa fa-bars';
            }
        }

        navIcon.setAttribute('role', 'button');
        navIcon.setAttribute('aria-controls', 'nav-list');
        navIcon.setAttribute('aria-expanded', 'false');

        navIcon.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            setMenuOpen(!isMenuOpen());
        }, true);

        document.addEventListener('click', function (event) {
            if (isMenuOpen() &&
                    !navList.contains(event.target) && !navIcon.contains(event.target)) {
                setMenuOpen(false);
            }
        }, true);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isMenuOpen()) {
                setMenuOpen(false);
                navIcon.focus();
            }
        });

        navList.addEventListener('click', function (event) {
            var link = event.target.closest('a');
            if (link && !link.querySelector('.nav-expand') && window.innerWidth <= 760) {
                setMenuOpen(false);
            }
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 760 && isMenuOpen()) {
                setMenuOpen(false);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindThemeControls();
        bindMobileNavigation();
    });
    applyTheme(storedTheme() || currentTheme() || systemTheme(), false);

    if (window.matchMedia) {
        var systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
        var handleSystemTheme = function (event) {
            if (!storedTheme()) {
                applyTheme(event.matches ? 'dark' : 'light', false);
            }
        };
        if (systemQuery.addEventListener) {
            systemQuery.addEventListener('change', handleSystemTheme);
        } else if (systemQuery.addListener) {
            systemQuery.addListener(handleSystemTheme);
        }
    }

    window.PNLOJTheme = {apply: applyTheme, current: currentTheme};
}());
