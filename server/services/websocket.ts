import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { generatorService } from './generator.js';

// ============================================================================
// WEBSOCKET SERVICE - REAL-TIME UPDATES
// ============================================================================

export interface WebSocketMessage {
  type: 'generator_status' | 'generator_control' | 'system_status' | 'error' | 'ping' | 'pong';
  data?: any;
  timestamp: string;
  id?: string;
}

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketService {
    if (!this.instance) {
      this.instance = new WebSocketService();
    }
    return this.instance;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: false,
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔌 WebSocket client connected from:', request.socket.remoteAddress);
      
      this.clients.add(ws);
      
      // Send initial generator status
      this.sendGeneratorStatus(ws);
      
      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      // Handle client disconnect
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Setup generator service listeners
    this.setupGeneratorListeners();
    
    // Start ping/pong to keep connections alive
    this.startPingPong();
    
    console.log('✅ WebSocket service initialized on /ws');
  }

  /**
   * Setup listeners for generator service events
   */
  private setupGeneratorListeners(): void {
    generatorService.on('statusUpdate', (status) => {
      this.broadcastGeneratorStatus(status);
    });
    
    generatorService.on('connected', () => {
      this.broadcast({
        type: 'system_status',
        data: { generator: { connected: true } },
        timestamp: new Date().toISOString(),
      });
    });
    
    generatorService.on('disconnected', () => {
      this.broadcast({
        type: 'system_status',
        data: { generator: { connected: false } },
        timestamp: new Date().toISOString(),
      });
    });
    
    generatorService.on('error', (error) => {
      this.broadcast({
        type: 'error',
        data: { 
          source: 'generator',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
          id: message.id,
        });
        break;
        
      case 'generator_control':
        this.handleGeneratorControl(ws, message);
        break;
        
      default:
        console.warn('⚠️  Unknown WebSocket message type:', message.type);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle generator control commands
   */
  private async handleGeneratorControl(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    try {
      const { action } = message.data;
      
      switch (action) {
        case 'start':
          await generatorService.startGenerator();
          this.sendMessage(ws, {
            type: 'generator_control',
            data: { action: 'start', success: true },
            timestamp: new Date().toISOString(),
            id: message.id,
          });
          break;
          
        case 'stop':
          await generatorService.stopGenerator();
          this.sendMessage(ws, {
            type: 'generator_control',
            data: { action: 'stop', success: true },
            timestamp: new Date().toISOString(),
            id: message.id,
          });
          break;
          
        case 'test':
          const result = await generatorService.testConnection();
          this.sendMessage(ws, {
            type: 'generator_control',
            data: { action: 'test', success: result },
            timestamp: new Date().toISOString(),
            id: message.id,
          });
          break;
          
        default:
          this.sendError(ws, `Unknown generator action: ${action}`, message.id);
      }
    } catch (error: any) {
      this.sendError(ws, `Generator control failed: ${error.message}`, message.id);
    }
  }

  /**
   * Send initial generator status to a client
   */
  private async sendGeneratorStatus(ws: WebSocket): Promise<void> {
    try {
      const status = await generatorService.getStatus();
      const connectionStatus = generatorService.getConnectionStatus();
      
      this.sendMessage(ws, {
        type: 'generator_status',
        data: {
          status,
          connection: connectionStatus,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Failed to send generator status:', error);
    }
  }

  /**
   * Broadcast generator status to all clients
   */
  private broadcastGeneratorStatus(status: any): void {
    this.broadcast({
      type: 'generator_status',
      data: { status },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message to specific client
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        this.clients.delete(ws);
      }
    }
  }

  /**
   * Send error message to specific client
   */
  private sendError(ws: WebSocket, error: string, id?: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: error },
      timestamp: new Date().toISOString(),
      id,
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('❌ Failed to broadcast message:', error);
          this.clients.delete(ws);
        }
      } else {
        this.clients.delete(ws);
      }
    });
  }

  /**
   * Start ping/pong to keep connections alive
   */
  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      this.broadcast({
        type: 'ping',
        timestamp: new Date().toISOString(),
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop WebSocket service
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.clients.clear();
    console.log('🛑 WebSocket service stopped');
  }

  /**
   * Get connection statistics
   */
  getStats(): { connectedClients: number; totalConnections: number } {
    return {
      connectedClients: this.clients.size,
      totalConnections: this.clients.size, // Could track total over time
    };
  }
}

// Export singleton instance
export const webSocketService = WebSocketService.getInstance();
