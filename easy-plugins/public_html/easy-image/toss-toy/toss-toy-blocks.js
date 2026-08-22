/**
 * Toss the Pics — image Blocks waiting game
 * API: TossBlocks.create({ stageEl, images, imageMap, doneIds, config, addListener, removeListeners })
 */
(function (global) {
    'use strict';

    const COLS = 8;
    const ROWS = 16;
    const VISIBLE_ROWS = 14;
    const HIDDEN_ROWS = 2;
    const DONE_COLOR = 'rgba(43,191,138,0.95)';
    const BLOCK_COLORS = ['#FF7A59', '#FFB15C', '#8B6CF6', '#35CC96', '#5CB8FF', '#F472B6', '#FACC15'];

    function colorForImageId(imageId) {
        const parsed = parseInt(imageId, 10);
        const index = Number.isFinite(parsed) ? parsed : String(imageId).length;
        return BLOCK_COLORS[Math.abs(index) % BLOCK_COLORS.length];
    }

    function isDrawableImage(img) {
        return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    }
    const LOCK_DELAY_MS = 300;
    const SOFT_DROP_MS = 45;
    const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
    const LINES_PER_LEVEL = 10;

    const SHAPES = {
        I: [
            [[1, 0], [1, 1], [1, 2], [1, 3]],
            [[0, 2], [1, 2], [2, 2], [3, 2]],
            [[2, 0], [2, 1], [2, 2], [2, 3]],
            [[0, 1], [1, 1], [2, 1], [3, 1]]
        ],
        O: [
            [[0, 1], [0, 2], [1, 1], [1, 2]]
        ],
        T: [
            [[0, 1], [1, 0], [1, 1], [1, 2]],
            [[0, 1], [1, 1], [1, 2], [2, 1]],
            [[1, 0], [1, 1], [1, 2], [2, 1]],
            [[0, 1], [1, 0], [1, 1], [2, 1]]
        ],
        S: [
            [[0, 1], [0, 2], [1, 0], [1, 1]],
            [[0, 1], [1, 1], [1, 2], [2, 2]]
        ],
        Z: [
            [[0, 0], [0, 1], [1, 1], [1, 2]],
            [[0, 2], [1, 1], [1, 2], [2, 1]]
        ],
        J: [
            [[0, 0], [1, 0], [1, 1], [1, 2]],
            [[0, 1], [0, 2], [1, 1], [2, 1]],
            [[1, 0], [1, 1], [1, 2], [2, 2]],
            [[0, 1], [1, 1], [2, 0], [2, 1]]
        ],
        L: [
            [[0, 2], [1, 0], [1, 1], [1, 2]],
            [[0, 1], [1, 1], [2, 1], [2, 2]],
            [[1, 0], [1, 1], [1, 2], [2, 0]],
            [[0, 0], [0, 1], [1, 1], [2, 1]]
        ]
    };

    const SHAPE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function buildImagePool(images, repeatsPerImage) {
        const pool = [];
        images.forEach((item) => {
            for (let i = 0; i < repeatsPerImage; i++) {
                pool.push(String(item.id));
            }
        });
        return shuffle(pool);
    }

    function create(options) {
        const stageEl = options.stageEl;
        const images = options.images || [];
        const imageMap = options.imageMap || {};
        const doneIds = options.doneIds;
        const config = options.config || {};
        const addListener = options.addListener;
        const piecesPerMinute = config.piecesPerMinute || 20;
        const repeatsPerImage = config.repeatsPerImage || 4;
        const dropIntervalMs = Math.max(280, Math.round(60000 / (piecesPerMinute * 8)));

        let destroyed = false;
        let rafId = null;
        let canvas = null;
        let ctx = null;
        let W = 0;
        let H = 0;
        let DPR = 1;
        let cellW = 40;
        let cellH = 40;
        let offsetY = 0;
        let keysPopup = null;
        let keysPopupTimer = null;

        const grid = [];
        for (let r = 0; r < ROWS; r++) {
            grid.push(new Array(COLS).fill(null));
        }

        let imagePool = buildImagePool(images, repeatsPerImage);
        let poolIndex = 0;
        let activePiece = null;
        let lockTimer = null;
        let dropAccumulator = 0;
        let lastTick = 0;
        let flashEffects = [];
        let softDropping = false;
        let gameOver = false;
        let gameOverEl = null;
        let replayBtn = null;
        let hudEl = null;
        let scoreEl = null;
        let linesEl = null;
        let levelEl = null;
        let bestEl = null;
        let bestBtn = null;
        let scoreFlashEl = null;
        let leaderboardEl = null;
        let leaderboardListEl = null;
        let scoreEntryEl = null;
        let nameInputEl = null;
        let saveScoreBtn = null;
        let scoreEntryMsgEl = null;
        let score = 0;
        let linesCleared = 0;
        let level = 1;
        let scoreFlashTimer = null;
        let leaderboardBest = 0;
        let scoreSubmitted = false;
        let scoreSubmitting = false;
        const baseDropIntervalMs = dropIntervalMs;
        const scoresApi = global.TossBlocksScores || null;

        function getBestScore() {
            if (scoresApi) {
                return scoresApi.getCachedLeaderboard().best || scoresApi.getLocalBest();
            }
            return 0;
        }

        function refreshBestFromCache() {
            leaderboardBest = getBestScore();
            if (bestEl) {
                bestEl.textContent = leaderboardBest.toLocaleString();
            }
        }

        async function loadLeaderboard() {
            if (!scoresApi) {
                refreshBestFromCache();
                return getCachedLeaderboardEntries();
            }
            const data = await scoresApi.fetchLeaderboard();
            leaderboardBest = data.best || 0;
            if (bestEl) {
                bestEl.textContent = leaderboardBest.toLocaleString();
            }
            return data.entries || [];
        }

        function getCachedLeaderboardEntries() {
            if (!scoresApi) {
                return [];
            }
            return scoresApi.getCachedLeaderboard().entries || [];
        }

        function renderLeaderboardList(entries) {
            if (!leaderboardListEl) {
                return;
            }
            if (!entries.length) {
                leaderboardListEl.innerHTML = '<li class="toss-toy-blocks-board-empty">No scores yet — be the first!</li>';
                return;
            }
            leaderboardListEl.innerHTML = entries.map((entry, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? ' toss-toy-blocks-board-rank--top' : '';
                return ''
                    + '<li class="toss-toy-blocks-board-row">'
                    + '<span class="toss-toy-blocks-board-rank' + rankClass + '">' + rank + '</span>'
                    + '<span class="toss-toy-blocks-board-name">' + escapeHtml(entry.name || 'Player') + '</span>'
                    + '<span class="toss-toy-blocks-board-score">' + (entry.score || 0).toLocaleString() + '</span>'
                    + '</li>';
            }).join('');
        }

        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function showLeaderboard() {
            if (!leaderboardEl) {
                return;
            }
            leaderboardEl.hidden = false;
            stageEl.classList.add('toss-toy-stage--leaderboard-open');
            leaderboardListEl.innerHTML = '<li class="toss-toy-blocks-board-empty">Loading…</li>';
            loadLeaderboard().then((entries) => {
                if (!leaderboardEl || leaderboardEl.hidden) {
                    return;
                }
                renderLeaderboardList(entries);
            });
        }

        function hideLeaderboard() {
            if (!leaderboardEl) {
                return;
            }
            leaderboardEl.hidden = true;
            stageEl.classList.remove('toss-toy-stage--leaderboard-open');
        }

        function toggleLeaderboard() {
            if (!leaderboardEl) {
                return;
            }
            if (leaderboardEl.hidden) {
                showLeaderboard();
            } else {
                hideLeaderboard();
            }
        }

        function setScoreEntryVisible(visible) {
            if (!scoreEntryEl) {
                return;
            }
            scoreEntryEl.hidden = !visible;
            if (visible && nameInputEl) {
                nameInputEl.value = '';
                if (scoreEntryMsgEl) {
                    scoreEntryMsgEl.textContent = '';
                }
                setTimeout(() => {
                    if (nameInputEl && !scoreEntryEl.hidden) {
                        nameInputEl.focus();
                    }
                }, 60);
            }
        }

        async function submitScoreFromForm() {
            if (!scoresApi || scoreSubmitted || scoreSubmitting || score <= 0 || !nameInputEl) {
                return;
            }
            const name = nameInputEl.value.trim();
            if (name.length < 2) {
                if (scoreEntryMsgEl) {
                    scoreEntryMsgEl.textContent = 'Enter at least 2 characters.';
                }
                return;
            }
            scoreSubmitting = true;
            if (saveScoreBtn) {
                saveScoreBtn.disabled = true;
                saveScoreBtn.textContent = 'Saving…';
            }
            if (scoreEntryMsgEl) {
                scoreEntryMsgEl.textContent = '';
            }
            const result = await scoresApi.submitScore(name, score);
            scoreSubmitting = false;
            if (saveScoreBtn) {
                saveScoreBtn.disabled = false;
                saveScoreBtn.textContent = 'Save score';
            }
            if (!result || !result.entries) {
                if (scoreEntryMsgEl) {
                    scoreEntryMsgEl.textContent = 'Could not save score. Try again.';
                }
                return;
            }
            scoreSubmitted = true;
            leaderboardBest = result.best || leaderboardBest;
            if (bestEl) {
                bestEl.textContent = leaderboardBest.toLocaleString();
            }
            setScoreEntryVisible(false);
            if (scoreEntryMsgEl) {
                scoreEntryMsgEl.textContent = '';
            }
            if (gameOverEl) {
                const hint = gameOverEl.querySelector('.toss-toy-blocks-over-hint');
                if (hint) {
                    hint.textContent = 'Score saved! ' + score.toLocaleString()
                        + ' · Board best ' + leaderboardBest.toLocaleString();
                }
            }
            if (!leaderboardEl.hidden) {
                renderLeaderboardList(result.entries);
            }
        }

        function getDropInterval() {
            return Math.max(160, baseDropIntervalMs - (level - 1) * 18);
        }

        function showScoreFlash(text) {
            if (!scoreFlashEl) {
                return;
            }
            scoreFlashEl.textContent = text;
            scoreFlashEl.classList.add('is-visible');
            if (scoreFlashTimer) {
                clearTimeout(scoreFlashTimer);
            }
            scoreFlashTimer = setTimeout(() => {
                if (scoreFlashEl) {
                    scoreFlashEl.classList.remove('is-visible');
                }
            }, 900);
        }

        function updateHud() {
            if (scoreEl) {
                scoreEl.textContent = score.toLocaleString();
            }
            if (linesEl) {
                linesEl.textContent = String(linesCleared);
            }
            if (levelEl) {
                levelEl.textContent = String(level);
            }
            if (bestEl) {
                bestEl.textContent = getBestScore().toLocaleString();
            }
        }

        function addScore(points, flashText) {
            if (!points) {
                return;
            }
            score += points;
            updateHud();
            if (flashText) {
                showScoreFlash(flashText);
            }
        }

        function resetScoreState() {
            score = 0;
            linesCleared = 0;
            level = 1;
            updateHud();
        }

        function resetGrid() {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    grid[r][c] = null;
                }
            }
        }

        function showGameOverOverlay() {
            if (!gameOverEl) {
                return;
            }
            gameOverEl.hidden = false;
            stageEl.classList.add('toss-toy-stage--game-over');
        }

        function hideGameOverOverlay() {
            if (!gameOverEl) {
                return;
            }
            gameOverEl.hidden = true;
            stageEl.classList.remove('toss-toy-stage--game-over');
        }

        function triggerGameOver() {
            if (gameOver || destroyed) {
                return;
            }
            gameOver = true;
            activePiece = null;
            softDropping = false;
            dropAccumulator = 0;
            if (lockTimer) {
                clearTimeout(lockTimer);
                lockTimer = null;
            }
            const best = getBestScore();
            updateHud();
            if (gameOverEl) {
                const hint = gameOverEl.querySelector('.toss-toy-blocks-over-hint');
                if (hint) {
                    hint.textContent = 'Score ' + score.toLocaleString()
                        + ' · Best ' + best.toLocaleString();
                }
            }
            if (score > 0 && scoresApi && !scoreSubmitted) {
                setScoreEntryVisible(true);
            } else {
                setScoreEntryVisible(false);
            }
            showGameOverOverlay();
        }

        function restartGame() {
            if (destroyed) {
                return;
            }
            gameOver = false;
            scoreSubmitted = false;
            scoreSubmitting = false;
            hideGameOverOverlay();
            hideLeaderboard();
            setScoreEntryVisible(false);
            if (gameOverEl) {
                const hint = gameOverEl.querySelector('.toss-toy-blocks-over-hint');
                if (hint) {
                    hint.textContent = 'Blocks reached the top.';
                }
            }
            resetGrid();
            flashEffects = [];
            softDropping = false;
            dropAccumulator = 0;
            lastTick = 0;
            resetScoreState();
            imagePool = buildImagePool(images, repeatsPerImage);
            poolIndex = 0;
            activePiece = spawnPiece();
            if (!activePiece) {
                triggerGameOver();
            }
        }

        function nextImageId() {
            if (poolIndex >= imagePool.length) {
                imagePool = buildImagePool(images, repeatsPerImage);
                poolIndex = 0;
            }
            return imagePool[poolIndex++];
        }

        function randomShapeKey() {
            return SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
        }

        function getCells(piece) {
            const shape = SHAPES[piece.key][piece.rotation % SHAPES[piece.key].length];
            return shape.map(([dr, dc]) => [piece.row + dr, piece.col + dc]);
        }

        function isValid(cells) {
            return cells.every(([r, c]) => {
                if (c < 0 || c >= COLS || r >= ROWS) {
                    return false;
                }
                if (r < 0) {
                    return true;
                }
                return grid[r][c] === null;
            });
        }

        function spawnPiece() {
            const key = randomShapeKey();
            const piece = {
                key,
                rotation: 0,
                row: 0,
                col: 2,
                imageId: nextImageId()
            };
            const cells = getCells(piece);
            if (!isValid(cells)) {
                return null;
            }
            return piece;
        }

        function lockPiece() {
            if (!activePiece || gameOver) {
                return;
            }
            const cells = getCells(activePiece);
            cells.forEach(([r, c]) => {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    grid[r][c] = {
                        imageId: activePiece.imageId,
                        img: imageMap[activePiece.imageId] || null
                    };
                }
            });
            activePiece = null;

            if (cells.some(([r]) => r < HIDDEN_ROWS)) {
                triggerGameOver();
                return;
            }

            clearLines();
            scheduleSpawn();
        }

        function clearLines() {
            const full = [];
            for (let r = HIDDEN_ROWS; r < ROWS; r++) {
                let ok = true;
                for (let c = 0; c < COLS; c++) {
                    if (!grid[r][c]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    full.push(r);
                }
            }
            if (!full.length) {
                return;
            }
            const lineCount = full.length;
            const linePoints = (LINE_SCORES[lineCount] || lineCount * 100) * level;
            addScore(linePoints, '+' + linePoints.toLocaleString());
            linesCleared += lineCount;
            level = Math.floor(linesCleared / LINES_PER_LEVEL) + 1;
            updateHud();

            full.forEach((r) => {
                flashEffects.push({ drawRow: r - HIDDEN_ROWS, alpha: 1 });
            });
            full.sort((a, b) => b - a);
            full.forEach((row) => {
                grid.splice(row, 1);
                grid.unshift(new Array(COLS).fill(null));
            });
        }

        function scheduleSpawn() {
            if (lockTimer) {
                clearTimeout(lockTimer);
                lockTimer = null;
            }
            lockTimer = setTimeout(() => {
                lockTimer = null;
                if (!destroyed && !gameOver) {
                    activePiece = spawnPiece();
                    if (!activePiece) {
                        triggerGameOver();
                    }
                }
            }, LOCK_DELAY_MS);
        }

        function tryMove(dr, dc) {
            if (!activePiece || gameOver) {
                return false;
            }
            const next = {
                ...activePiece,
                row: activePiece.row + dr,
                col: activePiece.col + dc
            };
            if (isValid(getCells(next))) {
                activePiece = next;
                if (dr === 1 && softDropping) {
                    addScore(1);
                }
                return true;
            }
            return false;
        }

        function tryRotate() {
            if (!activePiece || gameOver) {
                return false;
            }
            const next = {
                ...activePiece,
                rotation: activePiece.rotation + 1
            };
            if (isValid(getCells(next))) {
                activePiece = next;
                return true;
            }
            const kicks = [-1, 1, -2, 2];
            for (const kick of kicks) {
                const kicked = { ...next, col: next.col + kick };
                if (isValid(getCells(kicked))) {
                    activePiece = kicked;
                    return true;
                }
            }
            return false;
        }

        function hardDropStep() {
            if (!activePiece) {
                return;
            }
            if (tryMove(1, 0)) {
                dropAccumulator = 0;
            } else {
                lockPiece();
            }
        }

        function size() {
            const r = canvas.getBoundingClientRect();
            DPR = Math.min(global.devicePixelRatio || 1, 2);
            W = r.width;
            H = r.height;
            canvas.width = Math.round(W * DPR);
            canvas.height = Math.round(H * DPR);
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            cellW = W / COLS;
            cellH = H / VISIBLE_ROWS;
            offsetY = -HIDDEN_ROWS * cellH;
        }

        function cellRect(col, row) {
            return {
                x: col * cellW,
                y: offsetY + row * cellH,
                w: cellW,
                h: cellH
            };
        }

        function drawImageCover(img, x, y, w, h) {
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const cellRatio = w / h;
            let drawW;
            let drawH;
            let drawX;
            let drawY;

            if (imgRatio > cellRatio) {
                drawH = h;
                drawW = h * imgRatio;
                drawX = x - (drawW - w) / 2;
                drawY = y;
            } else {
                drawW = w;
                drawH = w / imgRatio;
                drawX = x;
                drawY = y - (drawH - h) / 2;
            }

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }

        function drawCell(x, y, w, h, img, imageId, pad) {
            const inset = pad || 2;
            const ix = x + inset;
            const iy = y + inset;
            const iw = w - inset * 2;
            const ih = h - inset * 2;

            ctx.fillStyle = '#fff';
            ctx.fillRect(x, y, w, h);

            ctx.save();
            ctx.beginPath();
            ctx.rect(ix, iy, iw, ih);
            ctx.clip();
            if (isDrawableImage(img)) {
                drawImageCover(img, ix, iy, iw, ih);
            } else {
                ctx.fillStyle = colorForImageId(imageId);
                ctx.fillRect(ix, iy, iw, ih);
            }
            ctx.restore();

            if (doneIds.has(imageId)) {
                ctx.strokeStyle = DONE_COLOR;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            }
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);

            for (let r = HIDDEN_ROWS; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = grid[r][c];
                    if (!cell) {
                        continue;
                    }
                    const rect = cellRect(c, r);
                    drawCell(rect.x, rect.y, rect.w, rect.h, cell.img, cell.imageId);
                }
            }

            flashEffects.forEach((f) => {
                if (f.alpha <= 0) {
                    return;
                }
                const y = offsetY + (f.drawRow + HIDDEN_ROWS) * cellH;
                ctx.fillStyle = 'rgba(255,255,255,' + (f.alpha * 0.8) + ')';
                ctx.fillRect(0, y, W, cellH);
            });
            flashEffects = flashEffects
                .map((f) => ({ ...f, alpha: f.alpha - 0.07 }))
                .filter((f) => f.alpha > 0);

            if (activePiece) {
                getCells(activePiece).forEach(([r, c]) => {
                    const rect = cellRect(c, r);
                    const img = imageMap[activePiece.imageId] || null;
                    drawCell(rect.x, rect.y, rect.w, rect.h, img, activePiece.imageId, 1);
                });
            }
        }

        function tick(now) {
            if (destroyed) {
                return;
            }
            if (!lastTick) {
                lastTick = now;
            }
            const dt = now - lastTick;
            lastTick = now;

            if (activePiece && !gameOver) {
                dropAccumulator += dt;
                const interval = softDropping ? SOFT_DROP_MS : getDropInterval();
                while (dropAccumulator >= interval) {
                    dropAccumulator -= interval;
                    if (!tryMove(1, 0)) {
                        lockPiece();
                        break;
                    }
                }
            }

            draw();
            rafId = requestAnimationFrame(tick);
        }

        function onKeyDown(e) {
            if (destroyed || gameOver) {
                if (gameOver) {
                    const active = document.activeElement;
                    const typingInName = active
                        && active.classList
                        && active.classList.contains('toss-toy-blocks-name-input');
                    if (typingInName) {
                        if (e.key === 'Enter') {
                            submitScoreFromForm();
                            e.preventDefault();
                        }
                        return;
                    }
                    if (scoreEntryEl && !scoreEntryEl.hidden && e.key === ' ') {
                        return;
                    }
                    if (e.key === 'Enter' || e.key === ' ') {
                        restartGame();
                        e.preventDefault();
                    }
                }
                return;
            }
            if (!activePiece) {
                return;
            }
            if (e.key === 'ArrowLeft') {
                tryMove(0, -1);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                tryMove(0, 1);
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                softDropping = true;
                e.preventDefault();
            } else if (e.key === 'ArrowUp' || e.key === ' ') {
                tryRotate();
                e.preventDefault();
            }
        }

        function onKeyUp(e) {
            if (e.key === 'ArrowDown') {
                softDropping = false;
            }
        }

        function showKeysPopup(clientX, clientY) {
            const stageRect = stageEl.getBoundingClientRect();
            if (!keysPopup) {
                keysPopup = document.createElement('div');
                keysPopup.className = 'toss-toy-keys-popup';
                keysPopup.textContent = 'use your keys :-)';
                keysPopup.setAttribute('role', 'status');
                stageEl.appendChild(keysPopup);
            }
            const x = Math.max(8, Math.min(clientX - stageRect.left - 60, stageRect.width - 130));
            const y = Math.max(8, Math.min(clientY - stageRect.top - 40, stageRect.height - 48));
            keysPopup.style.left = x + 'px';
            keysPopup.style.top = y + 'px';
            keysPopup.classList.add('is-visible');
            if (keysPopupTimer) {
                clearTimeout(keysPopupTimer);
            }
            keysPopupTimer = setTimeout(() => {
                if (keysPopup) {
                    keysPopup.classList.remove('is-visible');
                }
            }, 2200);
        }

        function onCanvasPointer(e) {
            if (gameOver) {
                return;
            }
            const p = e.touches ? e.touches[0] : e;
            showKeysPopup(p.clientX, p.clientY);
            e.preventDefault();
        }

        function createHud() {
            hudEl = document.createElement('div');
            hudEl.className = 'toss-toy-blocks-hud';
            hudEl.innerHTML = ''
                + '<div class="toss-toy-blocks-hud-stat"><span>Score</span><strong class="toss-toy-blocks-score">0</strong></div>'
                + '<div class="toss-toy-blocks-hud-stat"><span>Lines</span><strong class="toss-toy-blocks-lines">0</strong></div>'
                + '<div class="toss-toy-blocks-hud-stat"><span>Lv</span><strong class="toss-toy-blocks-level">1</strong></div>'
                + '<button type="button" class="toss-toy-blocks-hud-stat toss-toy-blocks-hud-best" aria-label="View high scores">'
                + '<span>Best</span><strong class="toss-toy-blocks-best">0</strong>'
                + '</button>'
                + '<div class="toss-toy-blocks-score-flash" aria-live="polite"></div>';
            stageEl.appendChild(hudEl);
            scoreEl = hudEl.querySelector('.toss-toy-blocks-score');
            linesEl = hudEl.querySelector('.toss-toy-blocks-lines');
            levelEl = hudEl.querySelector('.toss-toy-blocks-level');
            bestEl = hudEl.querySelector('.toss-toy-blocks-best');
            bestBtn = hudEl.querySelector('.toss-toy-blocks-hud-best');
            scoreFlashEl = hudEl.querySelector('.toss-toy-blocks-score-flash');
            addListener(bestBtn, 'click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleLeaderboard();
            });
            refreshBestFromCache();
            updateHud();
        }

        function createLeaderboardPanel() {
            leaderboardEl = document.createElement('div');
            leaderboardEl.className = 'toss-toy-blocks-board';
            leaderboardEl.hidden = true;
            leaderboardEl.innerHTML = ''
                + '<div class="toss-toy-blocks-board-panel" role="dialog" aria-label="High scores">'
                + '<div class="toss-toy-blocks-board-head">'
                + '<h3 class="toss-toy-blocks-board-title">High scores</h3>'
                + '<button type="button" class="toss-toy-blocks-board-close" aria-label="Close high scores">×</button>'
                + '</div>'
                + '<ol class="toss-toy-blocks-board-list"></ol>'
                + '</div>';
            stageEl.appendChild(leaderboardEl);
            leaderboardListEl = leaderboardEl.querySelector('.toss-toy-blocks-board-list');
            const closeBtn = leaderboardEl.querySelector('.toss-toy-blocks-board-close');
            addListener(closeBtn, 'click', (event) => {
                event.preventDefault();
                hideLeaderboard();
            });
            addListener(leaderboardEl, 'click', (event) => {
                if (event.target === leaderboardEl) {
                    hideLeaderboard();
                }
            });
        }

        function createGameOverOverlay() {
            gameOverEl = document.createElement('div');
            gameOverEl.className = 'toss-toy-blocks-over';
            gameOverEl.hidden = true;
            gameOverEl.innerHTML = ''
                + '<p class="toss-toy-blocks-over-title">You lost</p>'
                + '<p class="toss-toy-blocks-over-hint">Blocks reached the top.</p>'
                + '<div class="toss-toy-blocks-score-entry" hidden>'
                + '<label class="toss-toy-blocks-score-label" for="toss-toy-blocks-name">Your name</label>'
                + '<div class="toss-toy-blocks-score-form">'
                + '<input id="toss-toy-blocks-name" class="toss-toy-blocks-name-input" type="text" maxlength="20" autocomplete="nickname" placeholder="Enter name">'
                + '<button type="button" class="toss-toy-blocks-save-score">Save score</button>'
                + '</div>'
                + '<p class="toss-toy-blocks-score-entry-msg" aria-live="polite"></p>'
                + '</div>'
                + '<button type="button" class="toss-toy-blocks-replay">Play again</button>';
            stageEl.appendChild(gameOverEl);
            replayBtn = gameOverEl.querySelector('.toss-toy-blocks-replay');
            scoreEntryEl = gameOverEl.querySelector('.toss-toy-blocks-score-entry');
            nameInputEl = gameOverEl.querySelector('.toss-toy-blocks-name-input');
            saveScoreBtn = gameOverEl.querySelector('.toss-toy-blocks-save-score');
            scoreEntryMsgEl = gameOverEl.querySelector('.toss-toy-blocks-score-entry-msg');
            addListener(replayBtn, 'click', (event) => {
                event.preventDefault();
                restartGame();
            });
            addListener(saveScoreBtn, 'click', (event) => {
                event.preventDefault();
                submitScoreFromForm();
            });
        }

        return {
            start() {
                stageEl.innerHTML = '';
                canvas = document.createElement('canvas');
                stageEl.appendChild(canvas);
                ctx = canvas.getContext('2d');
                stageEl.classList.add('toss-toy-stage--blocks');
                createHud();
                createLeaderboardPanel();
                createGameOverOverlay();

                addListener(canvas, 'mousedown', onCanvasPointer);
                addListener(canvas, 'touchstart', onCanvasPointer, { passive: false });
                addListener(global, 'keydown', onKeyDown);
                addListener(global, 'keyup', onKeyUp);
                addListener(global, 'resize', size);

                size();
                gameOver = false;
                resetScoreState();
                activePiece = spawnPiece();
                if (!activePiece) {
                    triggerGameOver();
                }
                loadLeaderboard();
                rafId = requestAnimationFrame(tick);
            },

            markDone() {
                /* redraw picks up doneIds */
            },

            destroy() {
                destroyed = true;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                if (lockTimer) {
                    clearTimeout(lockTimer);
                    lockTimer = null;
                }
                if (keysPopupTimer) {
                    clearTimeout(keysPopupTimer);
                    keysPopupTimer = null;
                }
                if (scoreFlashTimer) {
                    clearTimeout(scoreFlashTimer);
                    scoreFlashTimer = null;
                }
                keysPopup = null;
                hudEl = null;
                scoreEl = null;
                linesEl = null;
                levelEl = null;
                bestEl = null;
                bestBtn = null;
                scoreFlashEl = null;
                leaderboardEl = null;
                leaderboardListEl = null;
                scoreEntryEl = null;
                nameInputEl = null;
                saveScoreBtn = null;
                scoreEntryMsgEl = null;
                gameOverEl = null;
                replayBtn = null;
                stageEl.classList.remove(
                    'toss-toy-stage--blocks',
                    'toss-toy-stage--game-over',
                    'toss-toy-stage--leaderboard-open'
                );
                stageEl.innerHTML = '';
            }
        };
    }

    global.TossBlocks = { create };
})(window);
