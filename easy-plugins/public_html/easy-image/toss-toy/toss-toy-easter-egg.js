/**
 * Hidden Tetris easter egg — Easy Image upload dropzone
 */
(function (global) {
    'use strict';

    const PLACEHOLDER_COUNT = 5;
    let activeEgg = null;

    const EGG_ICON_SVG = '<svg class="toss-egg-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2.2" fill="#FF7A59"/>'
        + '<rect x="13" y="2.5" width="8.5" height="8.5" rx="2.2" fill="#FFB15C"/>'
        + '<rect x="2.5" y="13" width="8.5" height="8.5" rx="2.2" fill="#8B6CF6"/>'
        + '<rect x="13" y="13" width="8.5" height="8.5" rx="2.2" fill="#35CC96"/>'
        + '<circle cx="19" cy="5" r="2" fill="#fff" opacity="0.95"/>'
        + '</svg>';

    global.TOSS_EGG_ICON_SVG = EGG_ICON_SVG;

    function isEnabled() {
        const cfg = global.TOSS_TOY_CONFIG || {};
        if (cfg.enabled === false) {
            return false;
        }
        if (cfg.easterEgg && cfg.easterEgg.enabled === false) {
            return false;
        }
        return typeof global.TossToy !== 'undefined';
    }

    function collectPlaygroundImages() {
        const previewImgs = document.querySelectorAll('#previewContainer .preview-item img');
        if (previewImgs.length >= 2) {
            return Array.from(previewImgs).map((img, index) => ({
                id: String(index),
                thumb: img.src
            }));
        }

        return Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => ({
            id: String(index),
            thumb: null
        }));
    }

    function openSecretTetris() {
        if (activeEgg || document.querySelector('.toss-toy-backdrop')) {
            return;
        }

        activeEgg = global.TossToy.open({
            playground: true,
            images: collectPlaygroundImages(),
            onContinue: function () {
                activeEgg = null;
            }
        });
    }

    function attachTrigger(dropzone) {
        if (!dropzone || dropzone.querySelector('.toss-egg-trigger')) {
            return;
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toss-egg-trigger';
        btn.setAttribute('aria-label', 'Hidden surprise');
        btn.innerHTML = '<span class="toss-egg-icon" aria-hidden="true">' + EGG_ICON_SVG + '</span>';

        btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openSecretTetris();
        });

        btn.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });

        dropzone.appendChild(btn);
    }

    function init() {
        if (!isEnabled()) {
            return;
        }
        attachTrigger(document.getElementById('dropzone'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
