# AI Handoff & Development Summary (sports-video-analysis)

This document is compiled to help another AI agent (such as Claude Code) instantly catch up on the context, system architecture, recent updates, and constraints of the baseball video analysis application.

## ⚾ Project Overview
A web-based and Electron-packaged **Baseball Video Analysis & Tagging System** built using:
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **State/Communication**: Multiple windows synchronization via `BroadcastChannel` (`sportscode_multiwindow_sync`), localStorage, and optional Supabase backend.
- **Packaging**: Electron Packager for Darwin (ARM64).

---

## 🏗️ Architecture & Component Layout

1. **`App.tsx` (Main Window Control)**:
   - Controls the video player, coordinates events list (`events`), active inning (`inningNum`, `inningHalf`), count states (`balls`, `strikes`, `outs`), active runner configurations (`runner1BId`, `runner2BId`, `runner3BId`), and local roster (`players`).
   - Serves as the central receiver for multi-window sync broadcasts.

2. **`CodeWindowDesigner.tsx` (Popout Controller Panel)**:
   - Houses the custom tagging button canvas, quick buttons, defender lineups, and runner/inning controls.
   - **Standalone Window Broadcast**: Broadcasts inputs to the main window via `BroadcastChannel` rather than updating state directly if popped out as a separate window.

3. **`MatrixView.tsx` (Aggregate Grid)**:
   - Displays event clips grouped by Pitcher/Batter/Inning on the Y-axis and Pitch Type/Result/Course on the X-axis.

4. **`AnalyticsDashboard.tsx` (Analytics Tab)**:
   - Computes Sabermetrics (wOBA, WAR, IP, FIP, etc.) and visualizes pitch distribution charts.

---

## 🚀 Recent Critical Implementations (Check & Verify)

1. **Fully Dynamic Canvas Keys**:
   - Fixed static hardcoded keys like `'Result'` or `'Pitch Type'`. The system now dynamically parses **all unique user-defined `groupName` values** from the canvas buttons, automatically generating corresponding columns in both the Timeline Table and exported CSVs.

2. **Dynamic Dashboard & Matrix Mapping**:
   - `AnalyticsDashboard.tsx` and `MatrixView.tsx` use a fuzzy lookup utility `getLabelValueByKeywords` to find keys matching `['pitch type', '球種']` or `['result', '結果', '判定']` dynamically. This prevents layout breakages when canvas settings change.

3. **Auto-Increment & Auto-Reset Baseball Logic**:
   - Labels containing keywords like "Strike", "Swing", "Foul" automatically increment strikes. A third strike increments outs.
   - Labels matching **Walks/HBP** (`四球`, `死球`, `デッドボール`, `walk`, `hbp`) automatically clear ball and strike counts back to `0-0`.
   - **Auto-increment Guard**: `groupName` belonging to Pitch Course (`B11`~`B55` etc.) or hit coordinates plot (`Hit_Plot`) are bypassed to prevent false-positive ball/strike increments.

4. **CSV Export Layout**:
   - Output columns are ordered starting with **Pitcher Name** on the left.
   - The original `Inning` field is split into two clean CSV columns: **`回` (Inning_Num)** and **`表・裏` (Inning_Half)**.
   - **`Hit_Plot` Coordinates Split**: Coordinates are cleanly split into two separate columns: **`打球X`** and **`打球Y`**.
   - Col name **`チーム`** is renamed to **`攻撃チーム`**.

5. **Split Inning Parsing (Backward Compatibility)**:
   - To prevent errors with older tagged logs where `Inning_Num`/`Inning_Half` fields were undefined, table rendering and CSV creation fall back to regex-parsing the legacy combined `Inning` text (e.g. "3回表" -> `3` & `表`).

6. **Hotkeys Restrictions Removed**:
   - Selecting Pitcher, Catcher, Outfielders, runners, shifting notes, and shifting innings/batters are always active, regardless of whether keyboard hotkeys are enabled (`hotkeysEnabled={false}`).
   - **Visual Pressed Flash**: Triggers a visual flash ring animations on buttons during hotkey keydowns to match mouse-click feedback.

---

## 🛠️ Run & Package Commands

- **Local Development (Vite Dev Server)**:
  ```bash
  npm run dev
  ```
- **Electron Build & Package for MacOS (arm64)**:
  ```bash
  npm run package
  ```
  *(Packages to `/Applications/SportsVideoAnalysis.app` directly).*

---

## ⚠️ Notes for Next Agent
- Keep component parameters decoupled from rigid key structures. Do not re-introduce static string dependencies.
- Pay attention to `BroadcastChannel` synchronization. If any new parameters or states are introduced, make sure they are synced across the popped-out window and the main player window.
