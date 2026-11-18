# Local provenance SDK build

These archives are local builds of lang-core and react-lang, both version 1.1.1, from OpenUI commit `28e245137` plus `provenance-sdk.patch`. The patch ports the tracing APIs from PR #1544 (`538ed946a76d69240f9768bce3d3b2ce0a42f27a`) onto current main and subscribes `useDataSources` to the current parse result. Nothing has been published upstream.

The package overrides ensure the dashboard renderer and inspector share the same React contexts. The patch includes the deferred-data regression test. Verification: 136 parser/query-manager tests and 1 hook regression passed.

To rebuild, apply this patch to that OpenUI commit, install its workspace dependencies, build `@openuidev/lang-core` then `@openuidev/react-lang`, and pack both into this vendor directory. Reinstall OpenDashboards after replacing the archives. Replace these local overrides with official packages when the APIs ship.
