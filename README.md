# Tower Defense

A minimal 2D tower defense prototype built with plain HTML5 Canvas and vanilla JavaScript — no frameworks, no build step, no dependencies.

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

1. Select a tower from the sidebar (**Gatling**, **Cannon**, or **Sniper**).
2. Click an open grid cell to place it (can't place on the enemy path or on top of another tower).
3. Click **Start Wave** to send enemies down the path.
4. Earn gold for each enemy killed, spend it on more towers.
5. Lose a life for every enemy that reaches the end of the path. Survive all 10 waves to win; run out of lives and it's game over.

| Tower | Cost | Style |
|---|---|---|
| Gatling | 50g | Fast fire rate, low damage, short range |
| Cannon | 100g | Slow, high damage, small splash radius |
| Sniper | 150g | Long range, high damage, slow fire rate |

## Files

- [`index.html`](index.html) — page structure and sidebar UI
- [`style.css`](style.css) — layout and styling
- [`game.js`](game.js) — game loop, map, towers, enemies, waves, and rendering
