import http from 'http';
import { WebSocketServer } from 'ws';

import { getSession } from './session-registry';
import type { TerminalResizeMessage } from './types';

/**
 * Attach WebSocket terminal streaming to the HTTP server (127.0.0.1 only).
 */
export const attachTerminalWebSocket = (server: http.Server): void => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '';
    const match = url.match(/^\/api\/terminals\/ws\/([^/?]+)/);
    if (!match) {
      socket.destroy();
      return;
    }

    const sessionId = decodeURIComponent(match[1]);
    const session = getSession(sessionId);
    if (!session) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const { pty, getReplay } = session;

      const replay = getReplay();
      if (replay.length > 0) {
        ws.send(replay);
      }

      const dataDisposable = pty.onData((data: string) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      });

      ws.on('message', (raw) => {
        const text = raw.toString();
        try {
          const parsed = JSON.parse(text) as TerminalResizeMessage;
          if (parsed.type === 'resize' && parsed.cols > 0 && parsed.rows > 0) {
            pty.resize(parsed.cols, parsed.rows);
            return;
          }
        } catch {
          // stdin text
        }
        pty.write(text);
      });

      ws.on('close', () => {
        dataDisposable.dispose();
      });
    });
  });
};
