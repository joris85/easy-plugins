/**
 * Toss the Pics — bridge between Easy Image processing and TossToy overlay.
 * Safe to remove: delete this file + toss-toy hooks in app.js if not using the toy.
 */
(function (global) {
    'use strict';

    let activeToy = null;
    let shown = false;
    let objectUrlsToRevoke = [];

    function getConfig() {
        return global.TOSS_TOY_CONFIG || { enabled: false };
    }

    function isEnabled() {
        const cfg = getConfig();
        return cfg.enabled === true && typeof global.TossToy !== 'undefined';
    }

    function shouldShow(files, fileFlags) {
        const cfg = getConfig();
        if (!files || !files.length) {
            return false;
        }
        if (files.length >= (cfg.minImages || 2)) {
            return true;
        }
        if (files.length === 1 && cfg.showForSingleLargeImage) {
            const idx = 0;
            if (fileFlags && fileFlags[idx] && fileFlags[idx].isLarge) {
                return true;
            }
            if (files[0].size > (global.Config && global.Config.LARGE_FILE_BYTES) || 10 * 1024 * 1024) {
                return true;
            }
        }
        return false;
    }

    function collectThumbUrl(file, index) {
        const previewImgs = document.querySelectorAll('#previewContainer .preview-item img');
        const previewImg = previewImgs[index];
        if (previewImg && previewImg.src) {
            return previewImg.src;
        }
        const url = URL.createObjectURL(file);
        objectUrlsToRevoke.push(url);
        return url;
    }

    function buildImageList(files) {
        return files.map((file, index) => ({
            id: String(index),
            thumb: collectThumbUrl(file, index)
        }));
    }

    function revokeCreatedUrls() {
        objectUrlsToRevoke.forEach((url) => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) { /* ignore */ }
        });
        objectUrlsToRevoke = [];
    }

    function safeCall(fn) {
        try {
            return fn();
        } catch (e) {
            console.warn('[TossToy] skipped:', e);
            return null;
        }
    }

    const bridge = {
        /** @returns {Promise<void>} resolves when user continues or toy was skipped */
        start: function (files, fileFlags) {
            shown = false;
            activeToy = null;
            revokeCreatedUrls();

            if (!isEnabled() || !shouldShow(files, fileFlags)) {
                return Promise.resolve();
            }

            return safeCall(() => {
                const images = buildImageList(files);
                activeToy = global.TossToy.open({
                    mount: document.body,
                    images,
                    onContinue: function () {
                        activeToy = null;
                        shown = false;
                        revokeCreatedUrls();
                    }
                });
                shown = true;
                return activeToy.waitForContinue();
            }) || Promise.resolve();
        },

        imageDone: function (index) {
            if (!shown || !activeToy) {
                return;
            }
            safeCall(() => activeToy.markDone(String(index)));
        },

        finishProcessing: function () {
            if (!shown || !activeToy) {
                return;
            }
            safeCall(() => activeToy.finishAll());
        },

        abort: function () {
            if (!activeToy) {
                revokeCreatedUrls();
                shown = false;
                return;
            }
            safeCall(() => activeToy.close());
            activeToy = null;
            shown = false;
            revokeCreatedUrls();
        },

        wasShown: function () {
            return shown;
        }
    };

    global.TossToyBridge = bridge;
})(window);
