/**
 * Real-Time Notification Stream Manager (Server-Sent Events - SSE)
 * Manages active connections for Customers, Store Admins, and Delivery Executives.
 * Enables zero-delay push notifications without polling or third-party dependency.
 */

// Active SSE client connections: Array of { id, role, userId, res }
let clients = [];

/**
 * Register a new SSE connection
 */
function addClient({ id, role, userId, res }) {
  clients.push({ id, role, userId, res });

  // Send initial connected handshake event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE stream connected successfully.' })}\n\n`);

  // Remove client when connection drops
  res.on('close', () => {
    removeClient(id);
  });
}

/**
 * Remove an SSE connection
 */
function removeClient(id) {
  clients = clients.filter(c => c.id !== id);
}

/**
 * Broadcast a real-time notification to relevant clients
 * @param {Object} filter - { role: 'admin' | 'delivery' | 'customer' | 'all', userId?: string }
 * @param {Object} notification - Notification payload to dispatch
 */
function broadcastNotification(filter, notification) {
  const payload = JSON.stringify({
    type: 'NOTIFICATION',
    data: notification,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    let match = false;

    if (!filter || filter.role === 'all') {
      match = true;
    } else if (filter.role === 'admin' && (client.role === 'admin' || client.role === 'super_admin')) {
      match = true;
    } else if (filter.role === 'delivery' && (client.role === 'delivery' || client.role === 'admin')) {
      // If target is a specific delivery boy
      if (filter.userId) {
        match = client.userId === filter.userId || client.role === 'admin';
      } else {
        match = true;
      }
    } else if (filter.role === 'customer') {
      if (filter.userId) {
        match = client.userId === filter.userId;
      } else {
        match = client.role === 'customer';
      }
    }

    if (match) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        console.error(`[SSE Broadcast] Failed sending to client ${client.id}:`, err.message);
        removeClient(client.id);
      }
    }
  });
}

// Keep-alive heartbeat ping every 25 seconds to prevent network timeout
setInterval(() => {
  const ping = `event: ping\ndata: ${Date.now()}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(ping);
    } catch {
      removeClient(client.id);
    }
  });
}, 25000);

module.exports = {
  addClient,
  removeClient,
  broadcastNotification
};
