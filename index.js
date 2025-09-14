const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const WebSocket = require('ws');
const http = require('http');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'noface-bootstrap' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// In-memory storage for registered peers with enhanced metadata
let peers = new Map();
let websocketClients = new Map(); // WebSocket connections by peer ID
let serverStats = {
  startTime: Date.now(),
  totalRegistrations: 0,
  totalRequests: 0,
  errors: 0
};

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Rate limiting
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  serverStats.totalRequests++;
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Helper function to validate peer data
function validatePeerData(data) {
  const errors = [];
  
  if (!data.id || typeof data.id !== 'string' || data.id.length < 10) {
    errors.push('Invalid peer ID');
  }
  
  if (!data.ip || typeof data.ip !== 'string') {
    errors.push('Invalid IP address');
  }
  
  if (!data.port || isNaN(data.port) || data.port < 1 || data.port > 65535) {
    errors.push('Invalid port number');
  }
  
  // Validate IP format (basic check)
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (data.ip && !ipRegex.test(data.ip) && !data.ip.includes(':')) {
    errors.push('Invalid IP address format');
  }
  
  return errors;
}

// Helper function to clean up inactive peers
function cleanupInactivePeers() {
  const now = Date.now();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
  let removedCount = 0;
  
  for (const [id, peer] of peers.entries()) {
    if (now - peer.lastSeen > inactiveThreshold) {
      peers.delete(id);
      removedCount++;
      logger.info(`Removed inactive peer: ${id}`, {
        peerId: id,
        lastSeen: new Date(peer.lastSeen).toISOString(),
        inactiveFor: now - peer.lastSeen
      });
    }
  }
  
  if (removedCount > 0) {
    logger.info(`Cleanup completed: removed ${removedCount} inactive peers`);
  }
}

// Clean up inactive peers every minute
setInterval(cleanupInactivePeers, 60 * 1000);

// Routes

/**
 * POST /register
 * Register a new peer in the network
 * Body: { id, ip, port, name?, capabilities?, version? }
 */
app.post('/register', (req, res) => {
  try {
    const { id, ip, port, name, capabilities = [], version = '1.0.0' } = req.body;
    
    // Validate required fields
    const validationErrors = validatePeerData({ id, ip, port });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    const portNum = parseInt(port);
    const now = Date.now();
    
    // Check if peer already exists
    const existingPeer = peers.get(id);
    const isUpdate = !!existingPeer;
    
    // Register or update peer with enhanced metadata
    const peer = {
      id,
      ip,
      port: portNum,
      name: name || `Peer-${id.substring(0, 8)}`,
      version,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      lastSeen: now,
      registeredAt: existingPeer ? existingPeer.registeredAt : now,
      updatedAt: now,
      connectionCount: existingPeer ? (existingPeer.connectionCount || 0) + 1 : 1,
      userAgent: req.get('User-Agent') || 'Unknown',
      ipAddress: req.ip
    };
    
    peers.set(id, peer);
    serverStats.totalRegistrations++;
    
    logger.info(`${isUpdate ? 'Updated' : 'Registered'} peer: ${id}`, {
      peerId: id,
      ip: peer.ip,
      port: peer.port,
      name: peer.name,
      version: peer.version,
      capabilities: peer.capabilities,
      isUpdate
    });
    
    res.json({
      success: true,
      message: `Peer ${isUpdate ? 'updated' : 'registered'} successfully`,
      peer: {
        id: peer.id,
        name: peer.name,
        version: peer.version,
        capabilities: peer.capabilities,
        registeredAt: peer.registeredAt,
        updatedAt: peer.updatedAt
      },
      network: {
        totalPeers: peers.size,
        activePeers: Array.from(peers.values()).filter(p => now - p.lastSeen < 2 * 60 * 1000).length
      }
    });
    
  } catch (error) {
    serverStats.errors++;
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /peers
 * Get list of all active peers with filtering and pagination
 * Query params: ?limit=50&active=true&capability=websocket&version=1.0.0
 */
app.get('/peers', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 peers
    const activeOnly = req.query.active === 'true';
    const capability = req.query.capability;
    const version = req.query.version;
    const offset = parseInt(req.query.offset) || 0;
    
    let peerList = Array.from(peers.values());
    
    // Filter active peers if requested
    if (activeOnly) {
      const now = Date.now();
      const activeThreshold = 2 * 60 * 1000; // 2 minutes
      peerList = peerList.filter(peer => now - peer.lastSeen < activeThreshold);
    }
    
    // Filter by capability
    if (capability) {
      peerList = peerList.filter(peer => 
        peer.capabilities && peer.capabilities.includes(capability)
      );
    }
    
    // Filter by version
    if (version) {
      peerList = peerList.filter(peer => peer.version === version);
    }
    
    // Sort by last seen (most recent first)
    peerList.sort((a, b) => b.lastSeen - a.lastSeen);
    
    // Apply pagination
    const total = peerList.length;
    peerList = peerList.slice(offset, offset + limit);
    
    // Remove sensitive information
    const publicPeers = peerList.map(peer => ({
      id: peer.id,
      ip: peer.ip,
      port: peer.port,
      name: peer.name,
      version: peer.version,
      capabilities: peer.capabilities,
      lastSeen: peer.lastSeen,
      registeredAt: peer.registeredAt,
      connectionCount: peer.connectionCount
    }));
    
    res.json({
      success: true,
      data: {
        peers: publicPeers,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        filters: {
          activeOnly,
          capability,
          version
        }
      }
    });
    
  } catch (error) {
    serverStats.errors++;
    logger.error('Peers list error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /peers/:id
 * Get specific peer information
 */
app.get('/peers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const peer = peers.get(id);
    
    if (!peer) {
      return res.status(404).json({
        success: false,
        error: 'Peer not found'
      });
    }
    
    // Return public peer information
    res.json({
      success: true,
      peer: {
        id: peer.id,
        ip: peer.ip,
        port: peer.port,
        name: peer.name,
        version: peer.version,
        capabilities: peer.capabilities,
        lastSeen: peer.lastSeen,
        registeredAt: peer.registeredAt,
        connectionCount: peer.connectionCount
      }
    });
    
  } catch (error) {
    serverStats.errors++;
    logger.error('Peer details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /status
 * Get comprehensive server status and statistics
 */
app.get('/status', (req, res) => {
  try {
    const now = Date.now();
    const activeThreshold = 2 * 60 * 1000; // 2 minutes
    const activePeers = Array.from(peers.values()).filter(
      peer => now - peer.lastSeen < activeThreshold
    );
    
    // Calculate uptime
    const uptime = process.uptime();
    const uptimeFormatted = {
      seconds: Math.floor(uptime % 60),
      minutes: Math.floor((uptime / 60) % 60),
      hours: Math.floor((uptime / 3600) % 24),
      days: Math.floor(uptime / 86400)
    };
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    
    res.json({
      success: true,
      server: {
        status: 'running',
        version: '2.0.0',
        environment: NODE_ENV,
        uptime: uptimeFormatted,
        uptimeSeconds: uptime,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        }
      },
      network: {
        totalPeers: peers.size,
        activePeers: activePeers.length,
        inactivePeers: peers.size - activePeers.length,
        lastCleanup: new Date().toISOString()
      },
      statistics: {
        totalRegistrations: serverStats.totalRegistrations,
        totalRequests: serverStats.totalRequests,
        errors: serverStats.errors,
        requestsPerMinute: Math.round(serverStats.totalRequests / (uptime / 60)),
        averageResponseTime: 'N/A' // Could be implemented with response time tracking
      }
    });
    
  } catch (error) {
    serverStats.errors++;
    logger.error('Status error:', error);
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
    
    const peer = peers.get(id);
    peers.delete(id);
    
    logger.info(`Unregistered peer: ${id}`, {
      peerId: id,
      name: peer.name,
      registeredAt: new Date(peer.registeredAt).toISOString()
    });
    
    res.json({
      success: true,
      message: 'Peer unregistered successfully',
      peer: {
        id: peer.id,
        name: peer.name
      }
    });
    
  } catch (error) {
    serverStats.errors++;
    logger.error('Unregistration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /peers/:id/heartbeat
 * Update peer's last seen timestamp
 */
app.post('/peers/:id/heartbeat', (req, res) => {
  try {
    const { id } = req.params;
    const peer = peers.get(id);
    
    if (!peer) {
      return res.status(404).json({
        success: false,
        error: 'Peer not found'
      });
    }
    
    peer.lastSeen = Date.now();
    peers.set(id, peer);
    
    res.json({
      success: true,
      message: 'Heartbeat received',
      lastSeen: peer.lastSeen
    });
    
  } catch (error) {
    serverStats.errors++;
    logger.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    success: true,
    title: 'NoFace Bootstrap Server API',
    version: '2.0.0',
    description: 'Bootstrap server for NoFace P2P network discovery',
    endpoints: {
      'POST /register': {
        description: 'Register a new peer in the network',
        body: {
          id: 'string (required) - Unique peer identifier',
          ip: 'string (required) - Peer IP address',
          port: 'number (required) - Peer port number',
          name: 'string (optional) - Human-readable peer name',
          capabilities: 'array (optional) - List of peer capabilities',
          version: 'string (optional) - Peer version'
        }
      },
      'GET /peers': {
        description: 'Get list of active peers',
        query: {
          limit: 'number (optional) - Maximum number of peers to return (default: 50, max: 100)',
          active: 'boolean (optional) - Filter only active peers',
          capability: 'string (optional) - Filter by capability',
          version: 'string (optional) - Filter by version',
          offset: 'number (optional) - Pagination offset'
        }
      },
      'GET /peers/:id': {
        description: 'Get specific peer information'
      },
      'GET /status': {
        description: 'Get server status and statistics'
      },
      'DELETE /peers/:id': {
        description: 'Unregister a specific peer'
      },
      'POST /peers/:id/heartbeat': {
        description: 'Update peer heartbeat'
      },
      'GET /health': {
        description: 'Health check endpoint'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'POST /register',
      'GET /peers',
      'GET /peers/:id',
      'GET /status',
      'DELETE /peers/:id',
      'POST /peers/:id/heartbeat',
      'GET /health',
      'GET /api-docs'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  serverStats.errors++;
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws',
  perMessageDeflate: false
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  let peerId = null;
  
  logger.info('New WebSocket connection', {
    ip: req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      switch (data.type) {
        case 'register':
          peerId = data.peerId;
          websocketClients.set(peerId, ws);
          logger.info(`WebSocket peer registered: ${peerId}`);
          
          // Send current peer list
          ws.send(JSON.stringify({
            type: 'peer_list',
            peers: Array.from(peers.values()).map(peer => ({
              id: peer.id,
              name: peer.name,
              capabilities: peer.capabilities,
              lastSeen: peer.lastSeen
            }))
          }));
          break;
          
        case 'peer_offer':
          handlePeerOffer(data, ws);
          break;
          
        case 'peer_answer':
          handlePeerAnswer(data, ws);
          break;
          
        case 'ice_candidate':
          handleIceCandidate(data, ws);
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        default:
          logger.warn('Unknown WebSocket message type', { type: data.type });
      }
    } catch (error) {
      logger.error('WebSocket message error', { error: error.message });
    }
  });
  
  ws.on('close', () => {
    if (peerId) {
      websocketClients.delete(peerId);
      logger.info(`WebSocket peer disconnected: ${peerId}`);
    }
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error', { error: error.message, peerId });
  });
});

// Handle peer offer forwarding
function handlePeerOffer(data, senderWs) {
  const targetPeer = websocketClients.get(data.to);
  if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
    targetPeer.send(JSON.stringify({
      type: 'peer_offer',
      from: data.from,
      offer: data.offer
    }));
    logger.info(`Peer offer forwarded from ${data.from} to ${data.to}`);
  } else {
    logger.warn(`Target peer not found or not connected: ${data.to}`);
  }
}

// Handle peer answer forwarding
function handlePeerAnswer(data, senderWs) {
  const targetPeer = websocketClients.get(data.to);
  if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
    targetPeer.send(JSON.stringify({
      type: 'peer_answer',
      from: data.from,
      answer: data.answer
    }));
    logger.info(`Peer answer forwarded from ${data.from} to ${data.to}`);
  } else {
    logger.warn(`Target peer not found or not connected: ${data.to}`);
  }
}

// Handle ICE candidate forwarding
function handleIceCandidate(data, senderWs) {
  const targetPeer = websocketClients.get(data.to);
  if (targetPeer && targetPeer.readyState === WebSocket.OPEN) {
    targetPeer.send(JSON.stringify({
      type: 'ice_candidate',
      from: data.from,
      candidate: data.candidate
    }));
    logger.info(`ICE candidate forwarded from ${data.from} to ${data.to}`);
  } else {
    logger.warn(`Target peer not found or not connected: ${data.to}`);
  }
}

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 NoFace Bootstrap Server v2.0.0 started`, {
    port: PORT,
    environment: NODE_ENV,
    pid: process.pid
  });
  
  console.log(`\n🌐 NoFace Bootstrap Server v2.0.0`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`📊 Endpoints:`);
  console.log(`   POST /register - Register a new peer`);
  console.log(`   GET  /peers    - Get list of active peers`);
  console.log(`   GET  /peers/:id - Get specific peer info`);
  console.log(`   GET  /status   - Get server status & statistics`);
  console.log(`   GET  /health   - Health check`);
  console.log(`   DELETE /peers/:id - Unregister peer`);
  console.log(`   POST /peers/:id/heartbeat - Update heartbeat`);
  console.log(`   GET  /api-docs - API documentation`);
  console.log(`\n📝 Logs: ./logs/`);
  console.log(`🔄 Auto-cleanup: Every 60 seconds`);
  console.log(`⏱️  Inactive threshold: 5 minutes\n`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('Server closed successfully');
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    console.log('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});

module.exports = app;