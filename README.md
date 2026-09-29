# SportIQ — Sports Tournament Operating System

**SportIQ** is a full-featured sports tournament operating system inspired by Sportik, built with **React**, **TypeScript**, and **Tailwind CSS**. It covers the complete lifecycle: tournament creation → teams & players → format → live draw → fixtures scheduling → live scoring desk → auto-advancing brackets & standings → public fan sharing → match-day utilities.

---

## 🏗️ 3 Core Products

### 1. Organizer Application
The command hub for sports directors, tournament organizers, and match officials:
- **Tournament Lifecycle State Machine**:
  `DRAFT` ➔ `REGISTRATION` ➔ `TEAMS_ADDED` ➔ `FORMAT_SELECTED` ➔ `DRAW_PENDING` ➔ `DRAW_COMPLETED` ➔ `FIXTURES_GENERATED` ➔ `TOURNAMENT_LIVE` ➔ `FINAL` ➔ `COMPLETED` ➔ `ARCHIVED`
- **Teams & Roster Registry**: Seed numbers, brand jersey colors, squad rosters, player numbers, roles, and captains.
- **Interactive Live Draw Room**: Animated lottery bowl with step-by-step and auto-draw slot allocation into bracket/groups with confetti celebration.
- **Automated Fixtures Scheduler**: Conflict-free fixture generator supporting knockout, round robin, and group+knockout stages.
- **Official Live Scoring Studio**:
  - Sport-specific telemetry event logger (Football, Cricket, Volleyball, Basketball, Badminton, Kabaddi).
  - Web Audio synthesized referee whistle and period buzzers.
  - Real-time score adjusters and match clock.
  - **Auto-Advancement Engine**: Completing a match automatically flows the winner to `next_match_id` in the playoff bracket tree.
- **Interactive Bracket Tree**: Visual binary tree highlighting live matches, completed matchups, and champion crowning.
- **Dynamic Standings Engine**: Multi-sport points calculations (Football: 3/1/0 + GD; Cricket: NRR; Volleyball/Badminton: Sets; Basketball & Kabaddi).
- **Tournament Budget Planner & Accounting**: Revenue, expenses, break-even fee per team calculation, and cost recovery telemetry.
- **Audit Trails**: Security logs recording immutable timestamps for all match changes and score updates.

### 2. Public Tournament Portal (`/t/:slug`)
Spectator and player experience requiring **NO login**:
- Pinned **Live Match Ticker** broadcast with real-time score updates.
- Overview with venue maps, dates, and tournament specifications.
- Filterable Fixtures & Results with expandable match event logs.
- Group Standings & Leaderboards with qualification markers (`Q`).
- Visual Playoff Bracket.
- Team squad profiles and rosters.
- Scannable Stadium QR Code modal and 1-click WhatsApp broadcast.

### 3. Match-Day Utilities Suite (`/tools`)
Independent referee and field marshal utilities:
- 🪙 **Coin Toss (3D)**: True 3D simulated coin flip with metallic ding audio, Heads/Tails selection, and toss decision recorder (Bat/Bowl, Kick/Defend).
- 🎡 **Picker Wheel**: Canvas-based spinning wheel with realistic deceleration physics, slice passing tick audio, and celebratory confetti.
- 👥 **Random Team Generator**: Instant fair-play squad distribution by number of teams or players per team with 1-click roster export.
- ⏱️ **Match Stopwatch & Whistle**: Digital athletic clock with sport presets (Football 45m, Kabaddi 20m, Basketball 10m/12m) and Web Audio referee whistle.
- 🔢 **Multi-Sport Scoreboard Clicker**: Giant tactile numbers for touch devices with set tracking and undo.

---

## ⚙️ Architectural Engines

1. **Sport Abstraction Layer (`src/engines/sportEngine.ts`)**:
   Independent sport rules, event definitions, score units, and points computation for Football, Cricket, Volleyball, Basketball, Badminton, and Kabaddi.
2. **Tournament Format Engine (`src/engines/tournamentEngine.ts`)**:
   Knockout bracket binary tree generation, Round Robin rotation, Group+Playoff generation, and `advanceWinnerInBracket` logic.
3. **Web Audio Synthesizer Engine (`src/engines/audioEngine.ts`)**:
   Zero-dependency audio generator using browser Web Audio API for dual-oscillator modulated referee whistle, metallic coin ding, and end-of-period buzzer.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production
npm run build
```

Built with ❤️ for sports organizers, teams, and fans.
