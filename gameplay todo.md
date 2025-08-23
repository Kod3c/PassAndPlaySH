## Project TODO: From current state to working gameplay

### 1) Foundations and structure
- **Create Play surface**
  - Create `pages/play.html` (single page runtime).
  - Add base containers: `#board`, `#players`, `#status`, `#actions`, `#modal`, `#pass-overlay`.
- **Script organization**
  - Create `scripts/` with modules:
    - `scripts/state/gameState.js` (single source of truth)
    - `scripts/engine/roles.js`, `scripts/engine/deck.js`, `scripts/engine/rules.js`
    - `scripts/engine/stateMachine.js` (phase machine)
    - `scripts/engine/turns.js` (order, term limits, tracker)
    - `scripts/ui/dom.js` (DOM helpers), `scripts/ui/modals.js`, `scripts/ui/pass.js`, `scripts/ui/board.js`, `scripts/ui/players.js`
    - `scripts/persist/storage.js` (save/load to `localStorage`)
  - Add `scripts/init.js` to bootstrap new or resumed game.
- **Routing and data flow**
  - From `pages/create.html` → build `gameConfig` (players, options) → start new game by navigating to `pages/play.html` with persisted state key.

### 2) Core data models
- **Define entities**
  - `Player`: id, name, role, party, alive, orderIndex, termLimitFlags.
  - `RolesConfig`: based on player count → number of Fascists/Liberals, Hitler assignment.
  - `PolicyDeck`: drawPile[], discardPile[], enacted {liberal, fascist}.
  - `Election`: presidentIndex, nominatedChancellorId, votes[], tracker (0–3).
  - `Powers`: by player count → thresholds and actions.
  - `GameState`: phase, subphase, players[], deck, election, specialElection, vetoUnlocked, history[], winner.
- **Serialization**
  - Save/restore `GameState` to `localStorage` with versioning.
  - Add safe-restore guard (if corrupted → fallback to lobby).

### 3) State machine and phases
- **Enumerate phases**
  - `Setup.RolesAssign`, `Setup.CompadreReveal`, `Setup.Tips`
  - `Round.PresidentAnnounce`
  - `Nomination.SelectChancellor`
  - `Voting.Sequence`, `Voting.Result`
  - `Legislative.President`, `Legislative.Chancellor`, `Legislative.Veto`
  - `Enactment.Reveal`
  - `Power.Resolve` (Investigate, SpecialElection, PolicyPeek, Execute, VetoUnlock)
  - `Round.Advance`
  - `FailTrack.Increment` (auto top-deck on 3)
  - `Game.Over`
- **Transitions**
  - Implement pure transition functions with guard rules and a dispatcher to render the right UI scene.

### 4) UI scaffolding and components
- **Players strip**
  - Show order, alive/dead, term-limit badges, current Pres/Chanc highlight.
- **Board**
  - Liberal and Fascist tracks, current policy counts, election tracker, veto indicator.
- **Actions bar**
  - Contextual CTA(s) per phase: nominate, vote, discard, enact, confirm.
- **Modals**
  - Pass-to-player overlay (full screen, player name/photo).
  - Private panels (role reveal, vote, policy choices, loyalty peek).
  - Confirmations (execution, veto).
- **Accessibility**
  - Large tappable controls, color-safe theme, “hold to reveal” for private info.

### 5) Setup flow
- **From `pages/create.html`**
  - Finalize player list and options (tips on/off, timers, colorblind).
- **Assign roles**
  - Based on player count, randomize order and roles; record compadre knowledge rules.
- **Private reveals**
  - Per-player pass overlay → show role; fascist info per official rules.
- **Tips**
  - Role-specific one-screen tips (toggleable).

### 6) Round loop: nomination and voting
- **Nomination**
  - Show eligible Chancellors (disable self, last government term-limits).
  - Select and confirm nominee.
- **Voting**
  - Sequential pass overlay → private vote (Ja!/Nein!) → store hidden.
  - Public result: tally and pass/fail; if fail, increment tracker, break at 3 for top-deck.
- **Election tracker**
  - Visual tracker; reset on successful government or top-deck enact.

### 7) Legislative session
- **President**
  - Draw 3 (reshuffle if needed), show privately, discard 1 → pass 2.
- **Chancellor**
  - If veto unlocked: may propose veto → President approves/rejects.
  - Otherwise: enact 1 policy from 2.
- **Enactment**
  - Publicly reveal policy; update tracks; check instant Hitler-as-Chancellor win.

### 8) Executive powers
- **Powers by count**
  - Implement thresholds: Investigate, Special Election, Policy Peek, Execute, Veto Unlock.
- **UI**
  - Target selection modals, private reveals where required, logging to history.
- **Edge cases**
  - Executions remove player from order and future votes; handle 2–3 player voting logic gracefully.

### 9) Endgame and history
- **Win conditions**
  - Liberal: 5 Liberal policies or Hitler executed.
-  Fascist: 6 Fascist policies or Hitler elected Chancellor (≥3 fascist enacted).
- **Victory screen**
  - Winner banner, cause, reveal all roles, event timeline.
- **Play again**
  - “Same players” quickstart vs new setup.

### 10) Persistence and resume
- **Auto-save**
  - Save after every major action; allow resume from `index.html`.
- **Manual controls**
  - “Restart round” (dev toggle) and “Abort game” with confirmation.

### 11) Rules engine hardening
- **Guards**
  - Enforce term limits, eligibility changes after executions, reshuffle rules.
  - Handle corner cases where only ineligible nominees remain (relax term limits per rules with UI guidance).
- **Validation**
  - Preflight checks before transitions; assert deck counts.

### 12) Visual polish
- **Styles**
  - Extend `styles/app.css` to theme `play.html` components.
- **Animations**
  - Simple transitions for pass overlay, card choices, tracker bumps.
- **Sound/Haptics** (optional)
  - Subtle cues for pass, vote complete, enactment, power gained.

### 13) QA and testing
- **Manual test scripts**
  - 5/7/9 player scenarios: full game paths.
  - Election fail x3 → top-deck; verify reshuffle.
  - Veto unlock and use; approval vs rejection paths.
  - Special election then return to normal order.
  - Hitler Chancellor instant-win check.
  - Executions, including executing Hitler.
- **Dev utilities**
  - Debug panel (hidden): force deck/roles, skip to phase, view state snapshot.

### 14) Documentation
- **Developer README**
  - Module map, phase machine, how to add scenes.
- **Player Help**
  - In `pages/rules.html`, add compact “in-game help” section linkable from `play.html`.

## Milestones (execution order)
- **M1: Play skeleton + state machine**: `play.html`, base modules, phase cycle with stub UIs.
- **M2: Setup & reveals**: roles assign, compadre/tips private flow.
- **M3: Nomination + Voting + Tracker**: full eligibility and fail track logic.
- **M4: Legislative session**: deck ops, discard/enact, reshuffle, public reveal.
- **M5: Executive powers + Veto**: all powers implemented; special election path.
- **M6: Endgame + Resume**: win checks, victory screen, auto-save/resume.
- **M7: Polish + QA**: styling, animations, accessibility, manual test passes.

### 15) Setup validation and UX details
- **Player inputs**
  - Enforce 5–10 players; show validation messages in `pages/create.html` and `pages/lobby.html`.
  - Require unique, non-empty names; trim whitespace; cap length; emoji-safe handling.
  - Optional avatars/colors with auto-assignment and conflict resolution.
- **Orientation & fullscreen**
  - Prompt for landscape and fullscreen on `play.html` for pass-and-play privacy.
- **Privacy controls**
  - Quick-dim toggle; auto-dim during private views; brightness reminder banner.
- **Navigation guards**
  - Prevent accidental back/refresh from soft-locking the game (confirm modals, state-safe re-entry).

### 16) Eligibility, term limits, and special cases
- **Term limits**
  - Ineligible: last elected President and last elected Chancellor cannot be nominated as Chancellor in the immediately following government; self-nomination disallowed.
  - After Special Election, term limits still apply based on last elected government.
- **Eligibility collapse**
  - If only ineligible candidates remain, relax term limits per official rules and surface guidance UI.
- **Tie votes**
  - Ties count as failed elections; increment tracker.
- **Chaos top-deck**
  - On tracker reaching 3, enact top-card; do not grant executive powers; reset tracker.
- **Executions**
  - Remove executed players from order and voting; update eligibility; end game immediately if Hitler executed.

### 17) Deck operations and integrity
- **Draw semantics**
  - Always draw 3 for President; reshuffle discards into draw pile first if fewer than 3 remain.
- **Discard semantics**
  - Track which card discarded at President and Chancellor steps (for timeline only, not revealed during game).
- **Peek semantics**
  - Policy Peek shows top 3 privately to President; do not modify deck.
- **Audit & assertions**
  - In dev mode, assert total counts = 17, and enacted + draw + discard = 17 at all times.

### 18) Veto flow nuances
- **Unlock condition**
  - Veto becomes available only after the board indicates Veto Power (player-count-dependent, typically at the 5th fascist policy space).
- **Procedure**
  - Chancellor proposes veto when holding 2 policies; President must explicitly approve or reject.
  - Approved veto counts as failed government; increment election tracker by 1.
  - Rejected veto returns to Chancellor to enact one of the two.

### 19) Special Election specifics
- **Selection**
  - President chooses any eligible player to be next Presidential candidate.
- **Order**
  - After the Special Election term completes (pass or fail), presidency returns to the player after the original President.
- **Limits**
  - Term limits apply normally; ineligibles are disabled in UI.

### 20) Voting flow details
- **Sequential privacy**
  - Pass overlay per player → private vote → confirm → hide; do not reveal individual votes.
- **Result presentation**
  - Public tally as counts only; optional percentage bar; store per-player choices privately for timeline.
- **Dead players**
  - Skipped automatically in the sequence; visually indicated as eliminated.

### 21) History, timeline, and undo safeguards
- **Timeline**
  - Append key events: nominations, vote result, enacted policy, powers used (target anonymized where required), executions.
- **Undo safety**
  - Provide limited “Redo last screen” in case of accidental dismiss, but disallow undoing committed random draws or public outcomes.
- **Recovery**
  - On reload/resume, rehydrate the last subphase precisely (e.g., mid-vote, mid-policy selection) with correct privacy overlay.

### 22) Assets and visual design
- **Card art**
  - Role and policy card visuals; Ja!/Nein! buttons; tracks; election tracker; icons.
- **Responsive layout**
  - Mobile-first; ensure readability on small screens; test tablet/desktop scaling.
- **Animations & feedback**
  - Card draw/discard animations; tracker bump; power gained pulse; subtle haptics/sounds (optional).

### 23) Performance and stability
- **Render strategy**
  - Minimize layout thrash; reuse DOM; throttle animations on low-end devices.
- **Error handling**
  - Global error boundary; show non-blocking toast with “report issue” (dev only).
- **State versioning**
  - Add schema version to saved state; implement migrations or safe reset.

### 24) Accessibility and internationalization (optional)
- **A11y**
  - Focus traps in modals; keyboard support; ARIA labels; colorblind-safe palette.
- **i18n-ready**
  - Externalize strings; simple string map to enable future translations.

### 25) Integration with existing pages
- **Lobby hand-off**
  - Wire `pages/lobby.html`/`pages/create.html` to persist config and navigate to `pages/play.html`.
- **Resume entry points**
  - From `index.html`, detect saved game and offer Resume vs New Game.
- **Rules linkage**
  - In-game help link to `pages/rules.html` with anchors to executive powers by player count.

### 26) QA expansion
- **Scenario matrix**
  - Test 5–10 players; early fascist wins (Hitler elected ≥3 fascist policies); liberal wins (5 liberal policies, Hitler executed).
- **Edge paths**
  - Triple election fail → top-deck no-power; veto approve vs reject; special election into ineligible candidates; execution of sitting President/Chancellor.
- **Persistence**
  - Resume at every subphase, including mid-private flow.

## Additional Milestones
- **M0: Wiring & validation**: Create `play.html`, route from lobby/create, basic input validation and persistence scaffold.
- **M8: A11y & orientation**: Focus traps, keyboard navigation, landscape/fullscreen prompts.
- **M9: Assets & polish**: Final art pass, sounds, animation tuning, performance audit.


