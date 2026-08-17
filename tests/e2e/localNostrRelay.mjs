#!/usr/bin/env node
/**
 * Minimal shared Nostr-compatible WebSocket relay for Playwright multi-context E2E.
 * Browser contexts cannot share BroadcastChannel, so huddle/P2P tests need a real
 * local relay that fans EVENT frames out to every connected peer.
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const port = Number(process.env.E2E_NOSTR_RELAY_PORT || 7777);
const host = process.env.E2E_NOSTR_RELAY_HOST || '127.0.0.1';

/** @type {Map<import('ws').WebSocket, Map<string, any[]>>} */
const subscriptions = new Map();
/** @type {Map<string, any>} */
const eventStore = new Map();
let connCount = 0;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('openslack-e2e-nostr-relay-ok');
});

const wss = new WebSocketServer({ server });

function send(ws, frame) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(frame));
  }
}

function eventMatchesFilters(event, filters) {
  if (!filters || filters.length === 0) return true;
  return filters.some((filter) => {
    if (!filter || typeof filter !== 'object') return true;
    if (Array.isArray(filter.ids) && !filter.ids.includes(event.id)) return false;
    if (Array.isArray(filter.authors) && !filter.authors.includes(event.pubkey)) return false;
    if (Array.isArray(filter.kinds) && !filter.kinds.includes(event.kind)) return false;
    // Be lenient on since/until for e2e clock skew between contexts
    if (typeof filter.since === 'number' && event.created_at + 5 < filter.since) return false;
    if (typeof filter.until === 'number' && event.created_at - 5 > filter.until) return false;
    for (const [key, values] of Object.entries(filter)) {
      if (!key.startsWith('#') || !Array.isArray(values) || values.length === 0) continue;
      const tagName = key.slice(1);
      const tagValues = (event.tags || [])
        .filter((tag) => Array.isArray(tag) && tag[0] === tagName)
        .map((tag) => tag[1]);
      if (!values.some((value) => tagValues.includes(value))) return false;
    }
    return true;
  });
}

function broadcastEvent(event, exceptWs) {
  let delivered = 0;
  for (const [client, subs] of subscriptions.entries()) {
    if (client === exceptWs || client.readyState !== 1) continue;
    for (const [subId, filters] of subs.entries()) {
      if (eventMatchesFilters(event, filters)) {
        send(client, ['EVENT', subId, event]);
        delivered += 1;
      }
    }
  }
  if (process.env.E2E_RELAY_DEBUG === '1') {
    console.log(`[e2e-nostr-relay] broadcast kind=${event.kind} delivered=${delivered}`);
  }
}

wss.on('connection', (ws, req) => {
  connCount += 1;
  const id = connCount;
  subscriptions.set(ws, new Map());
  if (process.env.E2E_RELAY_DEBUG === '1') {
    console.log(`[e2e-nostr-relay] connect #${id} ${req.url || ''}`);
  }

  ws.on('message', (raw) => {
    let payload;
    try {
      payload = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!Array.isArray(payload) || payload.length === 0) return;

    const verb = payload[0];
    if (verb === 'REQ') {
      const subId = String(payload[1] || '');
      const filters = payload.slice(2);
      const subs = subscriptions.get(ws);
      if (!subs || !subId) return;
      subs.set(subId, filters);

      for (const event of eventStore.values()) {
        if (eventMatchesFilters(event, filters)) {
          send(ws, ['EVENT', subId, event]);
        }
      }
      send(ws, ['EOSE', subId]);
      return;
    }

    if (verb === 'CLOSE') {
      const subId = String(payload[1] || '');
      subscriptions.get(ws)?.delete(subId);
      return;
    }

    if (verb === 'EVENT') {
      const event = payload[1];
      if (!event || typeof event !== 'object') return;
      if (!event.id) {
        event.id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      if (typeof event.created_at !== 'number') {
        event.created_at = Math.floor(Date.now() / 1000);
      }
      eventStore.set(event.id, event);
      if (eventStore.size > 5000) {
        const oldest = eventStore.keys().next().value;
        if (oldest) eventStore.delete(oldest);
      }
      send(ws, ['OK', event.id, true, '']);
      broadcastEvent(event, ws);
    }
  });

  ws.on('close', () => {
    subscriptions.delete(ws);
  });
});

server.listen(port, host, () => {
  console.log(`[e2e-nostr-relay] listening on ws://${host}:${port}`);
});

function shutdown() {
  wss.close();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
