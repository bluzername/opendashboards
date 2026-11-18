# Local dashboard studio

Open http://127.0.0.1:3156/apps/15440000-0000-4000-8000-000000000001. With `LOCAL_RETAIL_DEMO=1`, the previous `/shell-preview` entry redirects here.

This is the real OpenDashboards app on `codex/shell-comparison`, based on main `2a3f26f` (merged PR #27), with Cloud agent chat, persisted dashboards, and a live data inspector. The original checkout is separate. The earlier fixture comparison component and `public/shell-design` remain as design references; they do not drive this live screen.

## Run

The ignored `.env.local` contains the local OpenDashboards `DATABASE_URL`, the existing work `THESYS_API_KEY`, and `LOCAL_RETAIL_DEMO=1`. Never commit or print its values.

```sh
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
node scripts/local-retail-demo.mjs
pnpm dev --hostname 127.0.0.1 --port 3156
```

The seed script adds 1,800 generated sample retail orders and a separate read-only database role to the local PostgreSQL instance on port 54329. It preserves existing orders and app records, and writes the generated reader credential to `.env.local` on first setup. It refuses non-local targets. The local tools are disabled in production. Existing general connection restrictions remain in place.

## Try it

Use the chat to the left of the canvas and ask: “Make a retail dashboard with revenue, orders and a daily trend.” The local sample schema/query tools are available to the real Cloud agent. Generation uses the Thesys API; rendering and sample data queries run locally.

Click a metric, then the data icon. Formula / script shows the stored OpenUI expressions; click an input to see the actual SQL and query result. Result on the component shows its resolved values. The persistent Sources button lists inspectable components. Chat and Sources stay open together; Sources overlays part of the canvas when it is narrow.

The inspector is in `components/apps/source-inspector.tsx`, connected through `LiveDashboard`. `vendor/README.md` documents the local SDK patch for PR #1544. No API keys reach the inspector browser code; `/api/dashboard-source` checks dashboard ownership. Source program fetching refreshes after agent edits.

Verified with real generation, a persisted follow-up edit, revenue $278,360 / 1,800 orders, click-to-inspect SQL and live result, and concurrent Build/Sources panels. SDK regression tests, app typecheck and targeted lint passed. This is a working local design integration; shared SDK ownership and upstream packaging still need engineering agreement.

## Shell design (November 18)

The structure follows Figma node `272:6266`: collapsible navigation, chat to the left, dashboard canvas, and Sources at the right. The user rejected the previous Build label, edit icon and separate X treatment. The chat header now puts the conversation-title dropdown on the left, with new-chat plus and a custom collapse control on the right. When collapsed, an icon-only chat control occupies the left of the workspace header without inserting a text button. Sources uses a custom three-tier database icon whose tiers separate in the open state; the same icon collapses its panel. The sidebar uses folder/open-folder controls. Body and navigation labels are 14px, navigation rows 36px, control glyphs 20px, and aligned panel headers 56px.

The sidebar groups dashboards under their **app**. Dashboard Studio is one app, with shared connections and chat history. App and dashboard rename/delete actions, plus **New dashboard**, live in sidebar menus. There is no permanent New dashboard row: a draft row appears only on `/new`. Starting a draft opens a fresh conversation with explicit create intent; sending creates the dashboard. The empty state and suggestions lead into that working composer. Mobile navigation uses the sidebar, without a duplicate dashboard-tab strip. Existing semantic tokens provide typography, color, spacing, borders and radii; navigation and chat retain the 3% and 2% foreground-mixed surfaces.

Chat and Sources remain mounted while closed, preserving the draft and interaction state. Per-frame width animation was removed because it repeatedly resized the live charts through ResizeObserver. Layout now settles once, followed by 180ms translation-based FLIP motion for neighboring content and sliding/fading panel interiors. Closed content remains inert and hidden from assistive technology; reduced-motion preferences are respected. Chat open/close preserves focus behavior. Sources focuses search or its detail heading and returns focus when collapsed. A selected source stays attached to its unambiguous statement/component/label if a responsive column change replaces its generated React ID.

The polish draws on [Better UI](https://www.ui-skills.com/skills/jakubkrehel/better-ui) and [StageShow](https://www.ui-skills.com/skills/benjitaylor/stageshow). StageShow's craft and motion guidance was adapted to the live application without installing a simulated demo runtime. Direct inspection of the native Codex window was previously blocked by the computer-use tool, so this is not a verified pixel match.

Browser QA covered repeated desktop chat collapse/reopen with composer draft and focus preserved, plus the real $154.64 average-order-value selection through its original SQL across a responsive column change. Earlier checks also covered sidebar actions, new-dashboard drafts, source search/empty state, copy feedback, and the full 90-row query-result table. The existing agent conversation and saved dashboard remain intact. This remains a local design integration; nothing has been published upstream. Undo/version history for agent edits and shared SDK packaging remain open design/engineering decisions.
