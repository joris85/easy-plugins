'use strict';

/* Boot, global keys and the frame loop. */

(function () {
  const canvas = document.getElementById('stage');
  const ui = new UI();
  const game = new Game(canvas, ui);
  ui.attach(game);
  Input.init();

  // A generated level makes a decent backdrop behind the menu.
  game.arena.generate(SPAWNS);
  ui.showMenu(game);

  const btnMute = document.getElementById('btnMute');
  const btnPause = document.getElementById('btnPause');
  const btnMenu = document.getElementById('btnMenu');

  function setMute(m) {
    Sfx.init();
    Sfx.setMuted(m);
    btnMute.textContent = m ? 'Sound off' : 'Sound on';
    btnMute.classList.toggle('off', m);
  }

  btnMute.addEventListener('click', () => setMute(!Sfx.muted));
  btnPause.addEventListener('click', () => game.togglePause());
  btnMenu.addEventListener('click', () => game.toMenu());

  function boundToAnyPlayer(code) {
    for (let p = 0; p < 4; p++) {
      for (const a in Input.bindings[p]) if (Input.bindings[p][a] === code) return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    Sfx.init();
    Sfx.resume();
    if (Input.capture) return;
    if (e.code === 'Escape') {
      if (game.state === STATE.PLAYING || game.state === STATE.PAUSED) game.togglePause();
      return;
    }
    if (e.code === 'KeyM' && !boundToAnyPlayer('KeyM')) setMute(!Sfx.muted);
  });

  window.addEventListener('pointerdown', () => { Sfx.init(); Sfx.resume(); }, { once: true });

  // Debug hook: lets you poke at the running match from the console.
  window.EasyBomber = { game, ui, CFG };

  let last = performance.now();
  let faults = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;          // a long stall must not teleport anyone through a wall
    try {
      game.update(dt);
      game.draw();
    } catch (err) {
      // One bad frame must never take the whole game down with it.
      if (faults++ < 5) console.error('Easy Bomber frame error:', err);
    }
    Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
