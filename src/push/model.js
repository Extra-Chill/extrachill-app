import { notificationRoute } from '../inbox/model.js';

// Serialize rotation and logout so a late registration cannot re-bind a signed-out device.
export function createPushLifecycle(client) {
    let stopped = false;
    let queue = Promise.resolve();
    let lastToken;
    return {
        register(token) {
            if (stopped || !token) return Promise.resolve();
            queue = queue.catch(() => {}).then(async () => {
                if (lastToken === token) return;
                await client.execute('wp-native-auth/register-push-token', { token, provider: 'expo' });
                lastToken = token;
            });
            return queue;
        },
        stop() { stopped = true; },
        unregister() {
            stopped = true;
            queue = queue.catch(() => {}).then(() => client.execute('wp-native-auth/unregister-push-token', {}));
            return queue;
        },
    };
}

export async function openPush(data, { client, push, handoff }) {
    if (!data || typeof data.url !== 'string') return;
    let url;
    try { url = new URL(data.url); } catch { return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    const route = notificationRoute(data.url);
    if (route?.startsWith('/calendar/event/')) {
        push({ pathname: '/calendar/event/[eventId]', params: { eventId: route.split('/').pop(), url: data.url } });
    } else if (route) push(route);
    else await handoff(data.url);
    const id = Number(data.notification_id);
    if (Number.isSafeInteger(id) && id > 0 && client.describe('extrachill/mark-notifications-read')) {
        await client.execute('extrachill/mark-notifications-read', { notification_id: id });
    }
}
