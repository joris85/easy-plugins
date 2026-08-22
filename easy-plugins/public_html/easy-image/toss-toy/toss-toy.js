/**
 * Toss the Pics — Blocks waiting game host
 * Public API: TossToy.open({ mount, images, reducedMotion, onContinue })
 */
(function (global) {
    'use strict';

    const HINT = 'This is Blocks — use your keyboard to play ;-)';
    const COUNTDOWN_SECONDS = 10;

    function createOverlayDom(reducedMotion) {
        const backdrop = document.createElement('div');
        backdrop.className = 'toss-toy-backdrop' + (reducedMotion ? ' toss-toy--static' : '');
        backdrop.setAttribute('role', 'dialog');
        backdrop.setAttribute('aria-modal', 'true');
        backdrop.setAttribute('aria-label', 'Processing your images');

        backdrop.innerHTML = `
            <div class="toss-toy-overlay">
                <button type="button" class="toss-toy-close" aria-label="Close">&times;</button>
                <div class="toss-toy-head">
                    <h2 class="toss-toy-title"><span class="toss-toy-spark" aria-hidden="true">✨</span> Working on your images…</h2>
                    <p class="toss-toy-hint"></p>
                    <div class="toss-toy-progress-row">
                        <div class="toss-toy-track"><div class="toss-toy-bar"></div></div>
                        <div class="toss-toy-count"></div>
                    </div>
                </div>
                <div class="toss-toy-stage-wrap">
                    <div class="toss-toy-stage"></div>
                </div>
                <div class="toss-toy-foot">
                    <p class="toss-toy-ready-msg" hidden></p>
                    <div class="toss-toy-foot-actions">
                        <button type="button" class="toss-toy-keep-playing" hidden>Keep playing…</button>
                        <button type="button" class="toss-toy-continue" disabled aria-label="Continue to download">Continue</button>
                    </div>
                </div>
            </div>
        `;

        return {
            backdrop,
            overlayEl: backdrop.querySelector('.toss-toy-overlay'),
            titleEl: backdrop.querySelector('.toss-toy-title'),
            hintEl: backdrop.querySelector('.toss-toy-hint'),
            barEl: backdrop.querySelector('.toss-toy-bar'),
            countEl: backdrop.querySelector('.toss-toy-count'),
            stageEl: backdrop.querySelector('.toss-toy-stage'),
            continueEl: backdrop.querySelector('.toss-toy-continue'),
            keepPlayingEl: backdrop.querySelector('.toss-toy-keep-playing'),
            readyMsgEl: backdrop.querySelector('.toss-toy-ready-msg'),
            closeEl: backdrop.querySelector('.toss-toy-close')
        };
    }

    function preloadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    function open(options) {
        const opts = options || {};
        const mount = opts.mount || document.body;
        const allImages = Array.isArray(opts.images) ? opts.images : [];
        const totalCount = allImages.length;
        const cfg = global.TOSS_TOY_CONFIG || {};
        const maxVisibleSetting = cfg.maxVisibleCards || 0;
        const visibleImages = maxVisibleSetting > 0 ? allImages.slice(0, maxVisibleSetting) : allImages;
        const hiddenCount = Math.max(0, totalCount - visibleImages.length);
        const reducedMotion = opts.reducedMotion === true
            || (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const isPlayground = opts.playground === true;

        const dom = createOverlayDom(reducedMotion);
        dom.hintEl.textContent = reducedMotion
            ? 'Your images are being processed. They will light up green as each one finishes.'
            : HINT;

        if (isPlayground) {
            dom.overlayEl.classList.add('toss-toy-playground');
            dom.titleEl.innerHTML = '<span class="toss-toy-spark toss-egg-icon" aria-hidden="true">'
                + (global.TOSS_EGG_ICON_SVG || '') + '</span> You found the secret Blocks game!';
            const progressRow = dom.backdrop.querySelector('.toss-toy-progress-row');
            if (progressRow) {
                progressRow.hidden = true;
            }
            dom.continueEl.disabled = false;
            dom.continueEl.textContent = 'Close';
            dom.continueEl.classList.add('toss-toy-playground-close');
            if (dom.keepPlayingEl) {
                dom.keepPlayingEl.hidden = true;
            }
            if (dom.readyMsgEl) {
                dom.readyMsgEl.hidden = true;
            }
        }

        const instance = {
            closed: false,
            totalCount,
            doneIds: new Set(),
            allDone: false,
            activeGame: null,
            imageMap: {},
            staticCards: {},
            onContinue: typeof opts.onContinue === 'function' ? opts.onContinue : null,
            onCancel: typeof opts.onCancel === 'function' ? opts.onCancel : null,
            _continueResolve: null,
            _continuePromise: null
        };

        instance.waitForContinue = function () {
            if (!instance._continuePromise) {
                instance._continuePromise = new Promise((resolve) => {
                    instance._continueResolve = resolve;
                });
            }
            return instance._continuePromise;
        };

        let gameListeners = [];

        function addGameListener(target, type, fn, lopts) {
            target.addEventListener(type, fn, lopts);
            gameListeners.push({ target, type, fn, opts: lopts });
        }

        function clearGameListeners() {
            gameListeners.forEach(({ target, type, fn, opts: lopts }) => {
                target.removeEventListener(type, fn, lopts);
            });
            gameListeners = [];
        }

        let countdownTimer = null;
        let countdownValue = 0;
        let keepPlayingMode = false;
        let keepPlayingGuardUntil = 0;

        function clearCountdownTimer() {
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
        }

        function setKeepPlayingUi(active) {
            if (!dom.keepPlayingEl) {
                return;
            }
            if (active) {
                dom.keepPlayingEl.hidden = false;
                dom.keepPlayingEl.disabled = true;
                dom.keepPlayingEl.textContent = 'Playing Blocks…';
                dom.keepPlayingEl.setAttribute('aria-pressed', 'true');
            } else {
                dom.keepPlayingEl.disabled = false;
                dom.keepPlayingEl.textContent = 'Keep playing…';
                dom.keepPlayingEl.removeAttribute('aria-pressed');
            }
        }

        function updateReadyMessage() {
            if (!dom.readyMsgEl) {
                return;
            }
            if (countdownTimer) {
                dom.readyMsgEl.textContent = 'All done! Opening your downloads in ' + countdownValue + ' second'
                    + (countdownValue === 1 ? '' : 's') + '…';
            } else if (keepPlayingMode) {
                dom.readyMsgEl.textContent = 'All done! Keep playing Blocks, or click Go to download when you\'re ready.';
            } else if (instance.allDone) {
                dom.readyMsgEl.textContent = 'All done! Click Go to download when you\'re ready.';
            }
        }

        function formatDownloadButtonText(seconds) {
            if (typeof seconds === 'number' && seconds > 0) {
                return 'Go to download (' + seconds + ')';
            }
            return 'Go to download';
        }

        function updateCountdownButton() {
            dom.continueEl.textContent = formatDownloadButtonText(countdownValue);
            if (countdownTimer && countdownValue > 0) {
                dom.continueEl.setAttribute('aria-label', 'Go to download in ' + countdownValue + ' seconds');
            } else {
                dom.continueEl.setAttribute('aria-label', 'Go to download');
            }
        }

        function stopCountdown(fromKeepPlaying) {
            clearCountdownTimer();
            dom.continueEl.classList.remove('toss-toy-countdown-active');
            dom.continueEl.textContent = 'Go to download';
            dom.continueEl.setAttribute('aria-label', 'Go to download');
            if (fromKeepPlaying) {
                keepPlayingMode = true;
                keepPlayingGuardUntil = Date.now() + 450;
                setKeepPlayingUi(true);
            } else if (dom.keepPlayingEl) {
                dom.keepPlayingEl.hidden = true;
                setKeepPlayingUi(false);
            }
            if (instance.allDone) {
                updateReadyMessage();
            }
        }

        function setReadyUi() {
            if (dom.overlayEl) {
                dom.overlayEl.classList.add('toss-toy-all-done');
            }
            if (dom.titleEl) {
                dom.titleEl.innerHTML = '<span class="toss-toy-spark" aria-hidden="true">✓</span> Your images are ready!';
            }
            if (dom.readyMsgEl) {
                dom.readyMsgEl.hidden = false;
            }
            if (dom.barEl && dom.barEl.parentElement) {
                dom.barEl.parentElement.classList.add('toss-toy-track--complete');
            }
        }

        function continueToDownload() {
            if (instance.closed) {
                return;
            }
            clearCountdownTimer();
            if (instance.onContinue) {
                instance.onContinue();
            }
            instance.close();
        }

        function triggerAutoContinue() {
            if (instance.closed || keepPlayingMode) {
                return;
            }
            continueToDownload();
        }

        function startCountdown() {
            if (instance.closed || countdownTimer || keepPlayingMode) {
                return;
            }
            setReadyUi();
            dom.continueEl.classList.add('toss-toy-ready');
            dom.continueEl.classList.add('toss-toy-countdown-active');
            dom.continueEl.disabled = false;
            setKeepPlayingUi(false);
            if (dom.keepPlayingEl) {
                dom.keepPlayingEl.hidden = false;
            }
            countdownValue = COUNTDOWN_SECONDS;
            updateCountdownButton();
            updateReadyMessage();
            countdownTimer = setInterval(() => {
                if (!countdownTimer || keepPlayingMode) {
                    return;
                }
                countdownValue -= 1;
                if (countdownValue <= 0) {
                    clearCountdownTimer();
                    triggerAutoContinue();
                    return;
                }
                updateCountdownButton();
                updateReadyMessage();
            }, 1000);
        }

        function enableWhenAllDone() {
            if (instance.allDone || isPlayground) {
                return;
            }
            instance.allDone = true;
            startCountdown();
        }

        function updateProgress() {
            const done = instance.doneIds.size;
            dom.barEl.style.width = (totalCount ? (done / totalCount) * 100 : 0) + '%';
            dom.countEl.textContent = done + ' of ' + totalCount + ' done';
            if (done >= totalCount) {
                enableWhenAllDone();
            }
        }

        function destroyActiveGame() {
            clearGameListeners();
            if (instance.activeGame) {
                instance.activeGame.destroy();
                instance.activeGame = null;
            }
        }

        function startBlocks() {
            destroyActiveGame();
            if (!global.TossBlocks) {
                return;
            }
            instance.activeGame = global.TossBlocks.create({
                stageEl: dom.stageEl,
                images: visibleImages,
                imageMap: instance.imageMap,
                doneIds: instance.doneIds,
                config: cfg.blocks || {},
                addListener: addGameListener
            });
            instance.activeGame.start();
        }

        function markCardDone(id) {
            if (instance.doneIds.has(id)) {
                return;
            }
            instance.doneIds.add(id);
            updateProgress();
            if (reducedMotion) {
                const el = instance.staticCards[id];
                if (el) {
                    el.classList.add('toss-toy-done');
                }
                return;
            }
            if (instance.activeGame && instance.activeGame.markDone) {
                instance.activeGame.markDone(id);
            }
        }

        instance.markDone = function (id) {
            if (instance.closed) {
                return;
            }
            markCardDone(String(id));
        };

        instance.finishAll = function () {
            if (instance.closed || isPlayground) {
                return;
            }
            enableWhenAllDone();
        };

        instance.close = function () {
            if (instance.closed) {
                return;
            }
            instance.closed = true;
            clearCountdownTimer();
            destroyActiveGame();
            document.removeEventListener('keydown', onEscapeKey, true);
            document.body.classList.remove('toss-toy-scroll-lock');
            if (dom.backdrop.parentNode) {
                dom.backdrop.parentNode.removeChild(dom.backdrop);
            }
            if (instance._continueResolve) {
                instance._continueResolve();
                instance._continueResolve = null;
            }
        };

        // The overlay must never trap the user: the close control is always
        // available. Closing before processing finishes cancels the batch, so
        // ask first.
        function requestClose() {
            if (instance.closed) {
                return;
            }
            if (isPlayground) {
                instance.close();
                if (instance.onContinue) {
                    instance.onContinue();
                }
                return;
            }
            if (instance.allDone) {
                continueToDownload();
                return;
            }
            const stop = global.confirm(
                'Your images are still being processed. Closing this window will stop the processing.\n\nStop processing and close?'
            );
            if (!stop) {
                return;
            }
            if (instance.onCancel) {
                try {
                    instance.onCancel();
                } catch (e) {
                    console.warn('[TossToy] onCancel failed:', e);
                }
            }
            instance.close();
        }

        function onEscapeKey(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                requestClose();
            }
        }

        if (dom.closeEl) {
            dom.closeEl.addEventListener('click', requestClose);
        }
        document.addEventListener('keydown', onEscapeKey, true);

        dom.continueEl.addEventListener('click', () => {
            if (dom.continueEl.disabled) {
                return;
            }
            if (Date.now() < keepPlayingGuardUntil) {
                return;
            }
            if (isPlayground) {
                instance.close();
                if (instance.onContinue) {
                    instance.onContinue();
                }
                return;
            }
            continueToDownload();
        });

        if (dom.keepPlayingEl) {
            dom.keepPlayingEl.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (keepPlayingMode || !countdownTimer) {
                    return;
                }
                stopCountdown(true);
                if (dom.continueEl) {
                    dom.continueEl.blur();
                }
            });
        }

        document.body.classList.add('toss-toy-scroll-lock');
        mount.appendChild(dom.backdrop);

        if (hiddenCount > 0) {
            const more = document.createElement('p');
            more.className = 'toss-toy-more-label';
            more.textContent = '+' + hiddenCount + ' more image' + (hiddenCount === 1 ? '' : 's') + ' processing';
            dom.stageEl.parentNode.insertBefore(more, dom.stageEl.nextSibling);
        }

        if (reducedMotion && !isPlayground) {
            dom.stageEl.innerHTML = '<div class="toss-toy-static-grid"></div>';
            const grid = dom.stageEl.querySelector('.toss-toy-static-grid');
            visibleImages.forEach((item) => {
                const card = document.createElement('div');
                card.className = 'toss-toy-static-card';
                card.dataset.id = String(item.id);
                const img = document.createElement('img');
                img.alt = '';
                img.src = item.thumb || '';
                const badge = document.createElement('span');
                badge.className = 'toss-toy-static-badge';
                badge.textContent = '✓';
                badge.setAttribute('aria-hidden', 'true');
                card.appendChild(img);
                card.appendChild(badge);
                grid.appendChild(card);
                instance.staticCards[String(item.id)] = card;
            });
            updateProgress();
            instance.waitForContinue();
            return instance;
        }

        Promise.all(visibleImages.map((item) => {
            if (!item.thumb) {
                return Promise.resolve(null);
            }
            return preloadImage(item.thumb);
        })).then((loaded) => {
            if (instance.closed) {
                return;
            }
            visibleImages.forEach((item, i) => {
                instance.imageMap[String(item.id)] = loaded[i];
            });
            startBlocks();
            updateProgress();
        });

        instance.waitForContinue();
        return instance;
    }

    global.TossToy = { open };
})(window);
