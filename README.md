# NoFace Bootstrap Server v2.0.0

🚀 **Advanced bootstrap server for NoFace P2P network** - helps nodes discover each other with enhanced monitoring, security, and reliability features.

## ✨ Features

### 🔧 Core Functionality
- **Peer Registration** - Register and manage P2P network peers
- **Peer Discovery** - Discover active peers with filtering and pagination
- **Heartbeat System** - Keep track of peer activity and health
- **Auto-cleanup** - Automatically remove inactive peers

### 🛡️ Security & Performance
- **Rate Limiting** - Prevent abuse with configurable rate limits
- **CORS Protection** - Configurable cross-origin resource sharing
- **Helmet Security** - Security headers and protection
- **Input Validation** - Comprehensive data validation
- **IP Filtering** - Basic IP address validation

### 📊 Monitoring & Logging
- **Winston Logging** - Structured logging with multiple transports
- **Request Tracking** - Monitor all API requests and responses
- **Statistics** - Real-time server and network statistics
- **Health Checks** - Built-in health monitoring endpoints

### 🔄 Advanced Features
- **Pagination** - Efficient handling of large peer lists
- **Filtering** - Filter peers by capability, version, activity
- **Metadata** - Rich peer information and capabilities
- **Graceful Shutdown** - Clean server shutdown handling
- **Error Handling** - Comprehensive error management

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm 8+

### Installation

```bash
# Clone the repository
git clone https://github.com/noface-team/bootstrap-server.git
cd bootstrap-server

# Install dependencies
npm install

# Copy configuration
cp config.example.env .env

# Start the server
npm start
```

### Development

```bash
# Install development dependencies
npm install

# Start with auto-reload
npm run dev

# Run tests
npm test

# Check code quality
npm run lint
```

## 📡 API Endpoints

### Core Endpoints

#### `POST /register`
Register a new peer in the network.

**Request Body:**
```json
{
  "id": "QmPeerId123...",
  "ip": "192.168.1.100",
  "port": 4001,
  "name": "My Peer Node",
  "capabilities": ["websocket", "webrtc"],
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Peer registered successfully",
  "peer": {
    "id": "QmPeerId123...",
    "name": "My Peer Node",
    "version": "1.0.0",
    "capabilities": ["websocket", "webrtc"],
    "registeredAt": 1640995200000,
    "updatedAt": 1640995200000
  },
  "network": {
    "totalPeers": 15,
    "activePeers": 12
  }
}
```

#### `GET /peers`
Get list of active peers with filtering and pagination.

**Query Parameters:**
- `limit` (number, optional): Maximum peers to return (default: 50, max: 100)
- `active` (boolean, optional): Filter only active peers
- `capability` (string, optional): Filter by capability
- `version` (string, optional): Filter by version
- `offset` (number, optional): Pagination offset

**Example:**
```
GET /peers?limit=20&active=true&capability=websocket
```

**Response:**
```json
{
  "success": true,
  "data": {
    "peers": [
      {
        "id": "QmPeerId123...",
        "ip": "192.168.1.100",
        "port": 4001,
        "name": "My Peer Node",
        "version": "1.0.0",
        "capabilities": ["websocket", "webrtc"],
        "lastSeen": 1640995200000,
        "registeredAt": 1640995200000,
        "connectionCount": 5
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    },
    "filters": {
      "activeOnly": true,
      "capability": "websocket",
      "version": null
    }
  }
}
```

#### `GET /peers/:id`
Get specific peer information.

#### `GET /status`
Get comprehensive server status and statistics.

**Response:**
```json
{
  "success": true,
  "server": {
    "status": "running",
    "version": "2.0.0",
    "environment": "production",
    "uptime": {
      "days": 5,
      "hours": 12,
      "minutes": 30,
      "seconds": 45
    },
    "memory": {
      "rss": "45 MB",
      "heapTotal": "20 MB",
      "heapUsed": "15 MB",
      "external": "5 MB"
    }
  },
  "network": {
    "totalPeers": 150,
    "activePeers": 120,
    "inactivePeers": 30,
    "lastCleanup": "2024-01-15T10:30:00.000Z"
  },
  "statistics": {
    "totalRegistrations": 5000,
    "totalRequests": 25000,
    "errors": 15,
    "requestsPerMinute": 120
  }
}
```

#### `DELETE /peers/:id`
Unregister a specific peer.

#### `POST /peers/:id/heartbeat`
Update peer's last seen timestamp.

#### `GET /health`
Health check endpoint.

#### `GET /api-docs`
API documentation endpoint.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `config.example.env`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Logging Configuration
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Peer Management
PEER_INACTIVE_THRESHOLD=300000
PEER_CLEANUP_INTERVAL=60000
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `ALLOWED_ORIGINS` | * | CORS allowed origins |
| `LOG_LEVEL` | info | Logging level |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `PEER_INACTIVE_THRESHOLD` | 300000 | Inactive peer threshold (5 min) |
| `PEER_CLEANUP_INTERVAL` | 60000 | Cleanup interval (1 min) |

## 📊 Monitoring

### Logs

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

### View Logs

```bash
# View all logs
npm run logs

# View error logs only
tail -f logs/error.log

# Clean logs
npm run clean-logs
```

### Health Monitoring

The server provides several monitoring endpoints:

- `GET /health` - Basic health check
- `GET /status` - Detailed server statistics
- `GET /api-docs` - API documentation

## 🔧 Development

### Project Structure

```
bootstrap-server/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── config.example.env    # Configuration template
├── README.md            # This file
├── logs/                # Log files (created at runtime)
└── node_modules/        # Dependencies
```

### Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with auto-reload
npm test           # Run tests
npm run lint       # Check code quality
npm run logs       # View live logs
npm run clean-logs # Clean log files
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### PM2

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start index.js --name "noface-bootstrap"

# Monitor
pm2 monit

# View logs
pm2 logs noface-bootstrap
```

### Systemd Service

```ini
[Unit]
Description=NoFace Bootstrap Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/noface-bootstrap
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 🔒 Security Considerations

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Applied to all endpoints

### CORS
- Configurable allowed origins
- Supports credentials
- Prevents unauthorized cross-origin requests

### Input Validation
- Comprehensive peer data validation
- IP address format validation
- Port number range validation
- Capability array validation

### Logging
- All requests are logged
- Sensitive data is excluded from logs
- Error tracking and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/noface-team/bootstrap-server/issues)
- **Documentation**: [API Docs](http://localhost:3000/api-docs)
- **Email**: support@noface.network

## 🔄 Changelog

### v2.0.0
- ✨ Enhanced peer management with metadata
- 🛡️ Added security features (Helmet, rate limiting)
- 📊 Comprehensive monitoring and logging
- 🔄 Improved API with pagination and filtering
- 🧪 Added testing framework
- 📚 Complete documentation

### v1.0.0
- 🚀 Initial release
- 🔧 Basic peer registration and discovery
- 📡 RESTful API endpoints
- 🧹 Auto-cleanup of inactive peers

---

**Made with ❤️ by the NoFace Team**