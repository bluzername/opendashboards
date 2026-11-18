import "server-only";

/**
 * What each generated script reads. A script's code lives in OpenUI Cloud and
 * isn't readable, but every data call it makes comes back through this server
 * (the interpreter runs the tools), so we note them as they happen. The Sources
 * panel shows them as the script's inputs.
 *
 * Kept in memory: it fills again each time a dashboard renders, which runs its
 * scripts. Shared across route bundles through globalThis.
 */
export type ScriptCall = { name: string; args: unknown };

const MAX_SCRIPTS = 500;
const store: Map<string, ScriptCall[]> = ((globalThis as { __opendashboardsScriptInputs?: Map<string, ScriptCall[]> })
  .__opendashboardsScriptInputs ??= new Map());

const keyOf = (artifactId: string, script: string) => `${artifactId}\u0000${script}`;

export function recordScriptInputs(artifactId: string, script: string, calls: ScriptCall[]) {
  const seen = new Set<string>();
  const unique = calls.filter((call) => {
    const id = JSON.stringify([call.name, call.args]);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const key = keyOf(artifactId, script);
  store.delete(key);
  store.set(key, unique);
  if (store.size > MAX_SCRIPTS) store.delete(store.keys().next().value as string);
}

/** Every recorded script of one dashboard, by script name. */
export function scriptInputs(artifactId: string): Record<string, ScriptCall[]> {
  const prefix = keyOf(artifactId, "");
  return Object.fromEntries([...store].filter(([key]) => key.startsWith(prefix)).map(([key, calls]) => [key.slice(prefix.length), calls]));
}
