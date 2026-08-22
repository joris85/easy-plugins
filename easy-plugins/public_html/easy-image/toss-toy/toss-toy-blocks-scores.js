/**
 * Toss Blocks — shared scoreboard API (server-backed with local fallback).
 */
(function (global) {
    'use strict';

    const API_URL = 'toss-toy/blocks-scores.php';
    const LOCAL_BEST_KEY = 'easyImageBlocksBest';
    const LOCAL_ENTRIES_KEY = 'easyImageBlocksScores';

    let cachedEntries = null;
    let cachedBest = 0;

    function readLocalEntries() {
        try {
            const raw = localStorage.getItem(LOCAL_ENTRIES_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeLocalEntries(entries) {
        try {
            localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries.slice(0, 25)));
        } catch (error) {
            /* ignore */
        }
    }

    function sortEntries(entries) {
        return entries.slice().sort((a, b) => {
            const scoreDiff = (b.score || 0) - (a.score || 0);
            if (scoreDiff !== 0) {
                return scoreDiff;
            }
            return (a.at || 0) - (b.at || 0);
        });
    }

    function highestFromEntries(entries) {
        if (!entries.length) {
            return 0;
        }
        return entries[0].score || 0;
    }

    function applyCache(entries, best) {
        cachedEntries = sortEntries(entries).slice(0, 25);
        cachedBest = typeof best === 'number' ? best : highestFromEntries(cachedEntries);
        writeLocalEntries(cachedEntries);
        try {
            localStorage.setItem(LOCAL_BEST_KEY, String(cachedBest));
        } catch (error) {
            /* ignore */
        }
        return {
            entries: cachedEntries.slice(),
            best: cachedBest,
        };
    }

    function getLocalBest() {
        try {
            return parseInt(localStorage.getItem(LOCAL_BEST_KEY) || '0', 10) || 0;
        } catch (error) {
            return 0;
        }
    }

    async function fetchLeaderboard() {
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('fetch failed');
            }
            const data = await response.json();
            if (!data || !Array.isArray(data.entries)) {
                throw new Error('invalid payload');
            }
            return applyCache(data.entries, data.best);
        } catch (error) {
            const entries = sortEntries(readLocalEntries());
            return applyCache(entries, highestFromEntries(entries) || getLocalBest());
        }
    }

    async function submitScore(name, score) {
        const trimmedName = String(name || '').trim();
        const numericScore = parseInt(score, 10) || 0;
        if (!trimmedName || numericScore <= 0) {
            return { success: false, error: 'Name and score are required' };
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: trimmedName,
                    score: numericScore,
                }),
            });
            const data = await response.json();
            if (!response.ok || !data || !data.success) {
                throw new Error((data && data.error) || 'save failed');
            }
            return applyCache(data.entries, data.best);
        } catch (error) {
            const entries = sortEntries(readLocalEntries());
            entries.push({
                name: trimmedName.slice(0, 20),
                score: numericScore,
                at: Math.floor(Date.now() / 1000),
            });
            const sorted = sortEntries(entries).slice(0, 25);
            return applyCache(sorted, highestFromEntries(sorted));
        }
    }

    function getCachedLeaderboard() {
        if (cachedEntries) {
            return {
                entries: cachedEntries.slice(),
                best: cachedBest,
            };
        }
        const entries = sortEntries(readLocalEntries());
        return {
            entries,
            best: highestFromEntries(entries) || getLocalBest(),
        };
    }

    global.TossBlocksScores = {
        fetchLeaderboard,
        submitScore,
        getCachedLeaderboard,
        getLocalBest,
    };
})(window);
