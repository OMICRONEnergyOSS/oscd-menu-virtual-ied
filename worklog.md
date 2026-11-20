# Virtual Template IED migration worklog

## Goal and scope

- Plugin and requested standalone outcome: Migrate the `virtual-template-ied` menu plugin from the `openenergytools/virtual-template-ied` monorepo package to a standalone OpenSCD plugin based on `oscd-plugin-scafold`.
- Behavior and user flows to preserve: Open the plugin dialog; list unreferenced non-LLN0 LNodes grouped by their non-leaf Function/SubFunction; choose an LLN0 type for each applicable group; collect manufacturer, optional description and AccessPoint name; enable saving only with required inputs and at least one selected LNode; insert a `SPECIFICATION` IED with corresponding LDevices and selected LNs.
- In scope: Standalone package structure and tooling; menu-only scaffold adaptation; plugin host properties; migration of the legacy edit event and document helpers; scoped UI replacement; behavior tests, demo and package metadata.
- Out of scope and intentionally deferred changes: Redesigning the IED-generation rules, normalizing Function names for `LDevice.inst`, broad migration of sibling monorepo packages, changing the legacy plugin's business rules, and unrelated changes to the source repository.
- Agreed migration workspace: Current empty directory `/home/steren00/code/OmicronEnergyOSS/oscd-menu-virtual-ied`.
- Planning-document location: `/home/steren00/code/OmicronEnergyOSS/oscd-menu-virtual-ied/worklog.md`.
- Approved implementation destination: Not yet approved; proposed destination is the agreed workspace root.
- Read-only source and reference boundaries: Source and scaffold checkouts are analysis-only; do not modify their files or Git state.

## Resources

| Resource | Location / revision | Role / relevant files or symbols |
|---|---|---|
| Source repository and working-tree state | `/home/steren00/code/openenergytools/virtual-template-ied`, `d4a3a1f3edb49c86a0bfcf459e7e57b86cd4046e`, clean `main...origin/main` | Legacy monorepo; no source changes observed |
| Plugin implementation | `packages/virtual-template-ied/src/virtual-template-ied.ts`; `packages/virtual-template-ied/src/foundation.ts` | `VirtualTemplateIED`, grouping and selection UI, `getSpecificationIED`, legacy `newEditEvent` insertion |
| Plugin package and behavior tests | `packages/virtual-template-ied/package.json`; `test/virtual-template-ied.test.ts`; `test/testfile/specificfromfunctions.ssd` | Old package dependencies/tooling, event and generated-node expectations, representative SCL fixture |
| Source host/demo configuration | `packages/virtual-template-ied/index.html`; `rollup.config.js`; `tsconfig.json`; `tsconfig.test.json`; `web-test-runner.config.mjs` | Legacy host setup and build/test assumptions; replace with scaffold configuration |
| Legacy shared helper package | `packages/oscd-scl/src/index.ts`; `foundation/foundation.ts`; `foundation/identities/identity.ts`; `foundation/identities/selector.ts`; `foundation/utils/scldata.ts` | Local monorepo helpers currently imported by the plugin; do not migrate this package wholesale |
| Required scaffold | `/home/steren00/code/OmicronEnergyOSS/oscd-plugin-scafold`, `bf88432be7fdf3ad950d5af2f7205e7ef5d2b4e0`, clean `main...origin/main` | Canonical two-entry scaffold; retain `oscd-menu-scafold` basis, remove editor sample; shared `@omicronenergy/oscd-tooling`; scaffold read-only |
| Scaffold files | `src/oscd-menu-scafold.ts`, `src/oscd-menu-scafold.spec.ts`, `package.json`, `rollup.config.js`, `tsconfig.json`, `demo/plugins.js`, `demo/index.html`, `README.md` | Target behavior, identifiers, demo, package metadata and build entry to adapt after approval |
| Applicable guidance | `plugin-migration`, `openscd-plugin-dev`, `adapt-menu-template`, `editv1-to-editv2`, `oscd-api`, `scl-lib`, `mwc-to-oscd-ui`, `oscd-ui`, `filtered-list-to-oscd-ui`, `scoped-elements`, `worklog-completion-summary` | Migration sequence, target API, UI and worklog requirements |
| Existing migration output | None found in the agreed workspace or source package | No partial standalone output to reconcile |
| Target API/library references | Local skills for `@openscd/oscd-api`, `@openscd/scl-lib`, `@omicronenergy/oscd-ui`; scaffold manifest | Use `newEditEventV2`, EditV2 types, current SCL helpers and scoped `Oscd*` components |

## Technical analysis

### Current behavior and architecture

`VirtualTemplateIED` in `packages/virtual-template-ied/src/virtual-template-ied.ts` is a Lit 2 menu component using host-provided `doc` and legacy `editCount`. `run()` shows its internal modal. Rendering scans for `LNode[iedName="None"]`, groups eligible nodes by non-leaf Function/SubFunction identity, shows LLN0 selection controls, and requires manufacturer, AccessPoint name and at least one selected LNode before enabling save. On save, `getLDeviceDescriptions` and `getSpecificationIED` in `src/foundation.ts` build a new `IED` with an `AccessPoint`, `Server`, `Authentication`, LDevices, LN0 and selected LN nodes; the plugin dispatches an insertion with `newEditEvent`.

The UI depends on MWC dialog, list, selection and select components, plus `@openscd/oscd-textfield` and `@openscd/oscd-filtered-list`. These imports rely on global/side-effect registration and are incompatible with the scaffold's scoped component model. The selected-list behavior is multi-select with built-in filtering; preserve both filtering and selection semantics when adapting to `OscdSelectionList`/other `oscd-ui` components. Dialog is an internal plugin form; no SCL wizard or external `oscd-scl-dialogs-edit` flow was found.

The `foundation.ts` helper includes business rules that should remain local. Its old `@openscd/oscd-scl` calls include `identity`, `selector`, `getReference`, `getChildElementsByTagName` and `createElement`; the target has `identity`, `find`, `getReference` and `createElement` (deep import) in `@openscd/scl-lib`, but no documented equivalent for the direct-child helper. Replace selector-based identity lookup with the supported helper where semantics match and keep any remaining minimal direct-child traversal local. Do not copy the full legacy shared package.

The current test suite verifies list population, required-input gating, dispatch and generated-node output using a fixture. It imports the legacy event package and globally defines a test tag `virtual-template-i-e-d`, which differs from the plugin's documented `virtual-template-ied` tag; align runtime/test naming during scaffold adaptation. No translation package is used; visible text is English and TODO comments mention future localization only.

### Migration inventory

| Area | Current evidence | Target / remaining changes | Dependencies / risks |
|---|---|---|---|
| Package, scaffold and tooling | Legacy package manifest has local Open-WC/Rollup tooling and local workspace dependencies | Start from the approved scaffold revision; retain the menu entry only; rename package, entry, export, bundle, README and demo; keep shared `oscd` tooling and multi-entry Rollup override as needed | Rename all active references; remove editor sample source/spec, export, Rollup input and demo registration; preserve destination worklog |
| Host contract and reactive properties | `doc!` and numeric `editCount = -1`; render returns empty with no doc | Match standalone plugin properties (`doc`, `docName`, `docVersion`, `locale` as appropriate); remove `editCount`; use Lit 3, scoped mixin and explicit `.js` imports | Check compatibility with shell host contract and reactive update behavior |
| Edit actions/events and document mutation | `newEditEvent` from `@openscd/open-scd-core` emits old `oscd-edit` insertion | Use `Insert`/`EditV2` and `newEditEventV2` from `@openscd/oscd-api`; preserve parent (`SCL` root), reference and generated node; assert `oscd-edit-v2` and document outcome | No V1 bridge should remain in this plugin/demo. Insertion placement and generated SCL must preserve existing behavior |
| Foundation/XML helpers and shared code | Local `@openscd/oscd-scl` package exports old identity/selector/reference/element helpers | Use supported `@openscd/scl-lib` helpers; retain only small plugin-specific helpers; use documented `createElement` deep import where appropriate | Verify v2 signatures; `getChildElementsByTagName` may need a small local equivalent |
| Wizards, dialogs and event routing | One internal MWC dialog; no SCL wizard or dialog-edit event | Replace internal dialog with scoped `OscdDialog`; keep plugin's `run()` interaction local | No `scl-dialogs-embedding` phase is indicated by current code; verify dialog close/save behavior |
| UI, icons and custom-element registration | MWC tags and side-effect imports; old textfield and filtered-list packages | Use `@omicronenergy/oscd-ui` `Oscd*` classes and exact `scopedElements` tag keys; replace filtered-list with a selection/filter design that preserves behavior | No 1:1 MWC checklist equivalent; keyboard/pointer selection, filter retention and validation must be tested |
| Translation and source-locale text | English string literals; no `lit-translate` import | Keep existing English labels unless the approved scope changes; no translation migration currently needed | Localization is a future TODO, not part of this migration |
| SCL/domain-sensitive behavior | `getSpecificationIED` builds IED/AccessPoint/Server/Authentication/LDevice/LN0/LN structures; `getReference` orders insertion | Preserve attribute mapping, child order and `SCL` insertion point; validate generated output against existing behavior | Load IEC 61850 guidance before changing or validating SCL semantics/schema |
| Tests, fixtures and demo | Behavior tests cover node selection, gating, event and snapshot; demo is the legacy OpenSCD host | Port focused behavior tests to scaffold test conventions; preserve fixture; demo uses shell registry `tagName`, retains Open/Save and remote Source Editor; remove unused editor example and EditV1 background listener | The remote Source Editor/fonts need network; tests should assert meaningful output rather than snapshot-only structure |

### Risks, alternatives and preserved defects

- The filtered-list replacement is not a tag-only change; the legacy UI combines filtering, MWC checklist semantics and multi-selection. Selection event details and filter behavior must be verified before considering the UI phase complete.
- The new event model is EditV2, and the scaffold demo includes an EditV1 listener only as an example. Remove that listener from the target demo rather than retaining a deprecated compatibility bridge.
- The legacy rule that Function/SubFunction names become `LDevice.inst` is documented as not normalizing names to valid `inst` syntax. Preserve it as a legacy behavior/limitation; do not silently change the rules in a migration.
- The legacy test tag `virtual-template-i-e-d` differs from the documented plugin tag; use one consistent valid custom-element tag in the standalone package and tests.
- No baseline test/build was run during planning; the old tooling/environment may be unavailable or noisy. Establish validation only after approval and scaffold materialization.
- Alternative: adapt the old package directly versus using the canonical scaffold. The migration instructions require the canonical scaffold; use it rather than transplanting the old package's local tooling.
- No other intentional behavior changes are proposed.

## Questions and decisions

No unresolved consequential questions were found in the inspected source. The user identified the empty current directory as the migration workspace. Proposed choices: preserve the package/product name `virtual-template-ied`, migrate the selected menu only, and use the exact local clean scaffold revision above. These remain subject to the plan approval gate.

| ID | Question / options | Answer / rationale / affected phases | Status |
|---|---|---|---|
| DP-1 | Confirm plan and implementation scope before copying scaffold or changing code | User approved the plan on 2026-11-19, authorizing the standalone menu migration in this workspace using the recorded scaffold revision and the phases below | Approved |

## Migration plan

| Step | Goal / changes | Prerequisites / decisions | Verification / exit criteria |
|---|---|---|---|
| 1 | Analysis and populated worklog only | Workspace and source package established | This worklog records resources, evidence, scope, risks, plan and pending approval; no code copied and no dependencies installed |
| 2 | Standalone scaffold and menu adaptation | Explicit approval of this plan; local scaffold remains at recorded revision; preserve package name `virtual-template-ied` unless approval says otherwise | Materialize without copying `.git`, generated output, dependencies or scaffold development worklog; remove editor source/spec/export/Rollup entry/demo/docs completely; rename menu implementation and metadata; confirm active scaffold identifiers removed |
| 3 | Convert legacy edit and SCL helper APIs | Step 2 complete; use `oscd-api` and `scl-lib`; load `iec-61850` before changes to SCL structures/order or schema validation | No old core/event imports or `editCount`; dispatch `oscd-edit-v2` `Insert` with equivalent parent/reference and generated node; focused test verifies output |
| 4 | Migrate scoped UI and preserve form/list behavior | Step 2 complete; API conversion may proceed independently of UI; use `mwc-to-oscd-ui`, `oscd-ui`, `filtered-list-to-oscd-ui`, `scoped-elements` | All rendered custom tags registered in the component's own `scopedElements`; no MWC/legacy filtered-list imports; tests cover filtering, multiselect, validation, dialog close/save and keyboard/pointer interaction |
| 5 | Integrate tests, demo and verify package | Steps 2–4 complete | Retain test fixture; demo registers local plugin with `tagName`, keeps Source Editor alongside it, removes editor example and EditV1 background plugin; `npm install`, `npx tsc --noEmit`, `npm run build`, `npm run bundle`, `npm test`, `npm run lint` pass; rendered demo and `dist/` contain only intended menu artifacts |

### Verification strategy

- Baseline checks actually run: None. Only read-only source/scaffold inspection and Git revision/status queries were performed.
- Build/type-check/install order for implementation: After approval and scaffold setup, run `npm install`, `npx tsc --noEmit`, `npm run build`; after structural changes, repeat the prescribed sequence. Use scaffold-provided scripts only.
- Focused tests and fixtures for behavior preservation: Port tests for eligible-node listing, required field/selection gating, selected LN/LLN0 mapping, emitted EditV2 insertion, generated IED structure and dialog interaction using the existing SCD fixture.
- Runtime flows and supported host/demo checks: Start the standalone demo, load the plugin from the local registry, open the dialog, select nodes, save, and verify the host handles the EditV2 event. Source Editor remains available as a separate editor plugin.
- Artifact/package-content checks: Build/bundle after cleaning; verify exports, output and demo include only the renamed menu plugin and no editor-scaffold files; confirm package metadata and lockfile identify the target.
- Known verification gaps and how they block completion: The rebuilt demo was exercised in headless Chromium, including pointer selection, filtering and Save, but keyboard navigation was not tested. No independent SCL schema validation was performed. The generated `dist/**/*.spec.d.ts` declarations are excluded from the package by `package.json`; dependency audit findings remain uninvestigated.

## Plan approval

- Plan revision / date: Initial plan, 2026-11-19.
- Status: Approved.
- Unresolved blockers: None known.
- User approval evidence and scope: User explicitly approved on 2026-11-19. Approval covers implementation in the agreed workspace, limited to the scope and phases in this worklog.
- Next action: Migration and runtime verification are complete. The target repository URL remains unset, so publishing setup is deferred.

## Step Status

| Step | Status | Evidence / next action |
|---|---|---|
| 1 - Planning | done | Recorded the source/scaffold evidence, scope, risks and plan; approval was subsequently granted |
| 2 - Standalone scaffold | done | Adapted the approved scaffold to the menu-only `virtual-template-ied` package, demo and export |
| 3 - Edit actions | done | Replaced the legacy event with EditV2 insertion and migrated the required SCL helpers |
| 4 - Wizards | not applicable | No SCL wizard or external dialog-edit event found; internal form is covered by UI migration |
| 5 - UI | done | Replaced legacy controls with scoped oscd-ui; refined dialog sizing, form grids, list scrolling and action layout |
| 6 - Dialog integration | not applicable | No host-independent SCL dialog flow found |

## Step 2 Completion Summary

### Files created / copied / transformed

- `package.json`, `package-lock.json`, `rollup.config.js`, `README.md` — adapted package identity, dependencies, export and single-plugin bundle.
- `demo/plugins.js`, `demo/index.html`, `demo/sample.scd` — retained Open/Save and Source Editor alongside the local menu plugin; removed the editor-scaffold example and EditV1 listener.
- `src/virtual-template-ied.ts`, `src/foundation/virtual-template-ied.ts`, their specs and `test/testfile/specificfromfunctions.ssd` — materialized the standalone plugin, SCL helper and focused fixtures from the approved migration scope.

## Step 3 Completion Summary

### `@openscd/oscd-api` and `@openscd/scl-lib` replacements applied

- `newEditEventV2` / `EditV2` — replace the legacy `newEditEvent`; save dispatches an `Insert` under the SCL root with the generated IED.
- `getReference` and `createElement` — use the standalone SCL library for reference ordering and element creation; retain plugin-specific grouping and generation helpers locally.

## Step 5 Completion Summary

### UI and layout changes

- `src/virtual-template-ied.ts` — uses scoped oscd-ui form, select, dialog and selection-list components; groups metadata fields and LLN0 choices into responsive grids, bounds the searchable list to its own scroll area, widens the dialog, and groups Close/Save into one action row.
- `src/virtual-template-ied.spec.ts` — covers available nodes, required inputs, EditV2 insertion and dialog closure; the selected node is supplied through the component's selection event.
- `dist/**/*.spec.d.ts` are generated by the tooling but excluded from the published package by `package.json`.

### Verification

- `npm install --ignore-scripts` — completed; skipped Git hooks because the workspace is not a Git checkout.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm test` — passed; 2 test files, 4 tests. One earlier parallel run raced a `dist` cleanup and found no compiled specs; the subsequent serial run passed.
- `npm run build` — passed.
- `npm run bundle` — passed; `dist/` contains the target plugin and demo artifacts, with no editor-scaffold entry.
- Playwright in headless Chromium at 727×1226 — no console/page errors; dialog controls render with no outer-body scrolling, the node list scrolls internally, and both action buttons share a row. Searching `PTOC` returned 2 nodes; selecting one and saving enabled the action, closed the dialog, advanced `docVersion` to 1, and inserted one `SPECIFICATION` IED.

### Known verification gaps

- Keyboard navigation was not exercised in the browser.
- No independent SCL schema validation was performed; generated namespace and structure are covered by unit tests only.
- `npm install` reported 28 dependency audit findings; none were investigated.
- The target repository URL was not provided, so publishing metadata remains unset.

## Step 1 Completion Summary

### Files created

- `worklog.md` — records the selected source package, clean source/scaffold revisions, behavior and helper inventory, migration risks, verification approach and staged implementation plan.

### Verification

- Read-only inspection only; no tests/builds run, no source changes, no scaffold copied, and no dependencies installed.

### Decision points applied

- `DP-1` — awaiting explicit approval; no implementation phase is authorized yet.

## Resume and remaining work

- Source/output state last verified: Source is clean at `d4a3a1f3edb49c86a0bfcf459e7e57b86cd4046e`; scaffold is clean at `bf88432be7fdf3ad950d5af2f7205e7ef5d2b4e0`; standalone package, tests and demo are built in this workspace. The demo server was stopped after browser verification.
- Next approved action, or approval needed: No implementation work remains in the approved scope. Publishing setup requires the target repository URL.
- Deferred work and verification gaps: Keyboard interaction and independent schema validation remain unverified; 28 dependency audit findings remain uninvestigated. Legacy Function-name normalization remains intentionally out of scope.
- Reusable lessons proposed for the owning instructions or skill: None.
