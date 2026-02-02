# my-app

A React App with Yellow integration

## Getting Started

### Prerequisites

- Node.js 16 or later
- A Yellow channel (create one at [apps.yellow.com](https://apps.yellow.com))

### Installation

```bash
npm install
```

### Configuration

1. Copy `yellow.config.example.json` to `yellow.config.json`
2. Update the configuration with your Yellow channel details
3. Add your private key or session key for authentication

### Development

```bash
npm run dev
```

### Building

```bash
npm run build
```

## Yellow Integration

This project uses the Yellow platform for off-chain state channel functionality:

- **ClearNode Connection**: WebSocket connection to Yellow's ClearNode
- **Channel Management**: Automatic channel identification and management
- **Session Management**: Create and manage application sessions
- **Multi-Chain Support**: Works with polygon, celo, base networks

## Features

- websocket
- authentication
- session-management

## Documentation

For more information about Yellow platform development, visit the [official documentation](https://docs.yellow.com).
