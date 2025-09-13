const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for registered peers
let peers = new Map();

// Helper function to clean up inactive peers
function cleanupInactivePeers() {
  const now = Date.now();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (const [id, peer] of peers.entries()) {
    if (now - peer.lastSeen > inactiveThreshold) {
      peers.delete(id);
      console.log(`Removed inactive peer: ${id}`);
    }
  }
}

// Clean up inactive peers every minute
setInterval(cleanupInactivePeers, 60 * 1000);

// Routes

/**
 * POST /register
 * Register a new peer in the network
 * Body: { id, ip, port, name? }
 */
app.post('/register', (req, res) => {
  try {
    const { id, ip, port, name } = req.body;
    
    // Validate required fields
    if (!id || !ip || !port) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, ip, port'
      });
    }
    
    // Validate port number
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        error: 'Invalid port number'
      });
    }
    
    // Register or update peer
    const peer = {
      id,
      ip,
      port: portNum,
      name: name || `Peer-${id.substring(0, 8)}`,
      lastSeen: Date.now(),
      registeredAt: peers.has(id) ? peers.get(id).registeredAt : Date.now()
    };
    
    peers.set(id, peer);
    
    console.log(`Registered peer: ${id} (${ip}:${port})`);
    
    res.json({
      success: true,
      message: 'Peer registered successfully',
      peer: {
        id: peer.id,
        name: peer.name,
        registeredAt: peer.registeredAt
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /peers
 * Get list of all active peers
 * Query params: ?limit=50&active=true
 */
app.get('/peers', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activeOnly = req.query.active === 'true';
    
    let peerList = Array.from(peers.values());
    
    // Filter active peers if requested
    if (activeOnly) {
      const now = Date.now();
      const activeThreshold = 2 * 60 * 1000; // 2 minutes
      peerList = peerList.filter(peer => now - peer.lastSeen < activeThreshold);
    }
    
    // Sort by registration time (newest first)
    peerList.sort((a, b) => b.registeredAt - a.registeredAt);
    
    // Apply limit
    peerList = peerList.slice(0, limit);
    
    // Remove sensitive information
    const publicPeers = peerList.map(peer => ({
      id: peer.id,
      ip: peer.ip,
      port: peer.port,
      name: peer.name,
      lastSeen: peer.lastSeen,
      registeredAt: peer.registeredAt
    }));
    
    res.json({
      success: true,
      count: publicPeers.length,
      total: peers.size,
      peers: publicPeers
    });
    
  } catch (error) {
    console.error('Peers list error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /status
 * Get server status and statistics
 */
app.get('/status', (req, res) => {
  try {
    const now = Date.now();
    const activeThreshold = 2 * 60 * 1000; // 2 minutes
    const activePeers = Array.from(peers.values()).filter(
      peer => now - peer.lastSeen < activeThreshold
    );
    
    res.json({
      success: true,
      server: {
        status: 'running',
        uptime: process.uptime(),
        version: '1.0.0'
      },
      network: {
        totalPeers: peers.size,
        activePeers: activePeers.length,
        lastCleanup: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /peers/:id
 * Unregister a specific peer
 */
app.delete('/peers/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!peers.has(id)) {
      return res.status(404).json({
        success: false,
        error: 'Peer not found'
      });
    }
    
    peers.delete(id);
    console.log(`Unregistered peer: ${id}`);
    
    res.json({
      success: true,
      message: 'Peer unregistered successfully'
    });
    
  } catch (error) {
    console.error('Unregistration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NoFace Bootstrap Server running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /register - Register a new peer`);
  console.log(`   GET  /peers    - Get list of active peers`);
  console.log(`   GET  /status   - Get server status`);
  console.log(`   GET  /health   - Health check`);
  console.log(`   DELETE /peers/:id - Unregister peer`);
  console.log(`\n🌐 Server URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
