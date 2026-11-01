// Weak keys keep catalogs scoped to the authenticated shell client.
const clients = new WeakMap();

function siteClientEntry(base, root) {
    let roots = clients.get(base);
    if (!roots) { roots = new Map(); clients.set(base, roots); }
    if (roots.has(root)) return roots.get(root);
    const client = base.derive(root);
    let snapshot = { ready: false, error: undefined };
    let pending;
    const listeners = new Set();
    const publish = (next) => {
        snapshot = next;
        for (const listener of listeners) listener();
    };
    const discover = () => {
        if (pending) return pending;
        if (snapshot.ready) return Promise.resolve();
        publish({ ready: false, error: undefined });
        pending = Promise.resolve().then(() => client.discover()).then(
            () => { publish({ ready: true, error: undefined }); },
            (error) => { publish({ ready: false, error: error instanceof Error ? error : new Error(String(error)) }); },
        ).finally(() => { pending = undefined; });
        return pending;
    };
    const entry = {
        client,
        getSnapshot: () => snapshot,
        subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
        discover,
    };
    roots.set(root, entry);
    return entry;
}

module.exports = { siteClientEntry };
