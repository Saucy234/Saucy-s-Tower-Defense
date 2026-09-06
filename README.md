# Castle Defense

A minimal 2D tower defense prototype with a pixelated medieval theme, built with plain HTML5 Canvas and vanilla JavaScript — no frameworks, no build step, no dependencies. The whole scene is rendered at a fraction of its resolution and scaled back up unsmoothed for a chunky pixel-art look, and each tower is a distinct castle turret.

## Setup

There's nothing to install. Just open `index.html` in a browser:

- **Windows**: double-click `index.html`, or right-click → Open with → your browser.
- **Or from a terminal**:

  ```bash
  start index.html      # Windows
  open index.html        # macOS
  xdg-open index.html    # Linux
  ```

That's it — the game runs entirely client-side.

## How to play

1. Select a tower from the sidebar (**Archer Tower**, **Cannon Bastion**, or **Mage Tower**).
2. Click an open grid cell to garrison it (can't build on the enemy path or on top of another tower).
3. Click **Start Wave** to send raiders down the road toward your gate.
4. Earn gold for each raider defeated, spend it on more towers.
5. Lose a life for every raider that reaches your castle gate. Survive all 10 waves to win; run out of lives and it's game over.
6. Click a tower you've already placed to select it and upgrade its **Damage**, **Fire Speed**, or **Range** — each stat has 3 levels, with rising gold costs.

| Tower | Cost | Style |
|---|---|---|
| Archer Tower | 50g | Fast fire rate, low damage, short range |
| Cannon Bastion | 100g | Slow, high damage, small splash radius |
| Mage Tower | 150g | Long range, high damage, slow fire rate |

## Files

- [`index.html`](index.html) — page structure and sidebar UI
- [`style.css`](style.css) — layout and styling
- [`game.js`](game.js) — game loop, map, towers, enemies, waves, and rendering
