## Phase 8: Correction and Polish - Battle Map

This phase focuses on refining the Battle Map user experience, improving scene management, redesigning the dice system, and adding a quick-access bottom bar for players.

### Technical Details

- **Frameworks**: React, Tailwind CSS, Framer Motion (for drag and animations).
- **Z-Index Strategy**:
  - Canvas: 0
  - UI Overlays: 10-50
  - Log/Bottom Bar: 60
  - Sidebars: 70
  - Dice Panel: 80
  - Modals: 100
- **Responsive Design**: Mobile-first approach, using smaller icons and compact layouts to maximize canvas visibility.

### Implementation Steps

#### 1. Scene Manager Refinement
- Update `BattleMapHeader.tsx` to make the central title clickable for scene management.
- Update `BattleMapScenesPanel.tsx`:
  - New flow: "Add Background" button appears if no background is set.
  - "Save View" button only enabled after background is present.
- Ensure `BattleMap.tsx` handles immediate background updates.

#### 2. Enhanced Combat Log
- Modify `BattleMapLog.tsx`:
  - Add a "compact" mode (showing 2 lines).
  - Implement a drag handle to expand to "medium" mode (~10 lines).
  - Keep the full-screen expansion toggle.

#### 3. Compact Dice System
- Redesign `BattleMapDicePanel.tsx`:
  - Grid-based layout for all dice (no scroll).
  - Compact rows with small icons, +/- buttons, and a checkbox.
- Update `BattleMapDiceButton.tsx` for a cleaner floating circle design.
- Refactor `BattleMapDiceAnimation.tsx`:
  - Improve physics/distribution to avoid overlap.
  - Reduce visual scale of dice for elegance.

#### 4. Combat Sidebar ("Turno de Combate")
- Rename `BattleMapSidebar.tsx` and update its header.
- Add DM action buttons: "Pasar Turno" (Next Turn), "Aplicar Efectos".
- Display quick stats (HP/Shield) if available.
- Fix z-index to ensure it sits above all other map overlays.

#### 5. Player Quick Bottom Bar
- Create `src/components/app/battle-map/BattleMapBottomBar.tsx`.
- Include 6 quick-access buttons: Backpack, Equipment, Achievements, Notes, Skills, and Social.
- Fixed positioning at the bottom, below the log.

#### 6. UI Scaling and Polish
- Global reduction of padding/margins and icon sizes.
- Apply consistent dark-fantasy gradients and glows.
- Ensure no horizontal scroll and perfect mobile fit.
