"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseHandler = sseHandler;
exports.broadcast = broadcast;
const clients = [];
function sseHandler(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    clients.push(res);
    req.on('close', () => {
        const idx = clients.indexOf(res);
        if (idx >= 0)
            clients.splice(idx, 1);
    });
}
function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of clients) {
        c.write(payload);
    }
}
//# sourceMappingURL=leaderboard.js.map