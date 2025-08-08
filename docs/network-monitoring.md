# Network Monitoring - TP-Link ER605 Integration

## Overview

HomeOS includes comprehensive network monitoring capabilities specifically designed for the TP-Link ER605 router. This feature provides real-time visibility into your home network, connected devices, security events, and performance metrics.

## Features

### 🌐 Network Overview
- **WAN Connection Status**: Monitor internet connectivity and IP configuration
- **Device Count**: Track total and online devices
- **Bandwidth Usage**: Real-time upload/download speeds
- **Router Performance**: CPU usage, memory usage, and temperature monitoring

### 📱 Device Management
- **Connected Devices**: View all devices connected to your network
- **Device Details**: IP addresses, MAC addresses, connection time
- **Device Control**: Block/unblock devices, set bandwidth limits
- **Device Types**: Automatic detection of device types (mobile, desktop, TV, etc.)

### 🔒 Security Monitoring
- **Security Events**: Real-time security alerts and intrusion attempts
- **Blocked Connections**: Monitor blocked suspicious activities
- **Event Severity**: Categorized security events (low, medium, high)
- **Source Tracking**: Track source IPs of security events

### ⚡ Performance Analytics
- **Router Health**: CPU, memory, and temperature monitoring with visual indicators
- **Quick Actions**: Restart WiFi, reboot router, view logs, manage port forwarding
- **System Logs**: Access router system logs and events
- **Bandwidth History**: Historical bandwidth usage data

## Setup Instructions

### 1. Router Configuration

#### Enable Web Management
1. Access your TP-Link ER605 router admin panel (usually `http://192.168.1.1`)
2. Log in with your admin credentials
3. Navigate to **System Tools** → **Administration**
4. Ensure **Web Management** is enabled
5. Note down the management port (usually 80 or 8080)

#### Create Dedicated User (Recommended)
1. Go to **System Tools** → **Administration** → **User Management**
2. Create a new user for HomeOS with appropriate permissions
3. Grant the following permissions:
   - Network monitoring
   - Device management
   - System information access
   - Log viewing

#### Enable API Access
1. Navigate to **Advanced** → **System** → **Management**
2. Enable **Remote Management** if needed
3. Configure **Access Control** to allow HomeOS server IP

### 2. HomeOS Configuration

#### Environment Variables
Add the following to your `.env` file:

```bash
# TP-Link ER605 Router Configuration
ROUTER_ENABLED=true
ROUTER_HOST=192.168.1.1
ROUTER_USERNAME=admin
ROUTER_PASSWORD=your-router-admin-password
ROUTER_TIMEOUT=10000
ROUTER_POLL_INTERVAL=30000
NETWORK_SCAN_INTERVAL=60000
NETWORK_DEVICE_TIMEOUT=5000
NETWORK_BANDWIDTH_HISTORY_DAYS=7
SECURITY_LOG_RETENTION_DAYS=30
SECURITY_ALERT_THRESHOLD=5
```

#### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ROUTER_HOST` | Router IP address | `192.168.1.1` |
| `ROUTER_USERNAME` | Admin username | `admin` |
| `ROUTER_PASSWORD` | Admin password | Required |
| `ROUTER_TIMEOUT` | API timeout (ms) | `10000` |
| `ROUTER_POLL_INTERVAL` | Data refresh interval (ms) | `30000` |
| `NETWORK_SCAN_INTERVAL` | Device scan interval (ms) | `60000` |
| `NETWORK_DEVICE_TIMEOUT` | Device timeout (ms) | `5000` |
| `NETWORK_BANDWIDTH_HISTORY_DAYS` | History retention | `7` |
| `SECURITY_LOG_RETENTION_DAYS` | Security log retention | `30` |
| `SECURITY_ALERT_THRESHOLD` | Alert threshold | `5` |

### 3. Testing the Connection

1. Start HomeOS server: `npm run dev`
2. Navigate to the Network page in the HomeOS interface
3. Check the connection status in the Overview tab
4. Verify device detection in the Devices tab

## API Endpoints

### Router Statistics
```
GET /api/network/stats
```
Returns router status, WAN/LAN information, and performance metrics.

### Connected Devices
```
GET /api/network/devices
```
Returns list of all connected devices with details.

### Security Events
```
GET /api/network/security
```
Returns recent security events and alerts.

### Bandwidth Statistics
```
GET /api/network/bandwidth?timeframe=24h
```
Returns bandwidth usage data for specified timeframe.

### Device Management
```
POST /api/network/device/:deviceId/block
POST /api/network/device/:deviceId/unblock
POST /api/network/device/:deviceId/limit
```
Block, unblock, or set bandwidth limits for specific devices.

### Router Control
```
POST /api/network/wifi/restart
POST /api/network/reboot
```
Restart WiFi or reboot the entire router.

## Troubleshooting

### Common Issues

#### Connection Failed
- **Check router IP**: Ensure `ROUTER_HOST` matches your router's IP
- **Verify credentials**: Confirm username and password are correct
- **Network connectivity**: Ensure HomeOS server can reach the router
- **Firewall settings**: Check if router firewall blocks the connection

#### No Devices Detected
- **Router permissions**: Ensure the user has device monitoring permissions
- **API access**: Verify API access is enabled in router settings
- **Network scan**: Check if network scanning is enabled

#### Security Events Not Showing
- **Security features**: Ensure router security features are enabled
- **Log level**: Check router log level settings
- **Event retention**: Verify security log retention settings

### Debug Mode

Enable debug mode by setting:
```bash
DEBUG_NETWORK=true
```

This will provide detailed logging for network operations.

## Security Considerations

### Best Practices
1. **Dedicated User**: Create a dedicated router user for HomeOS
2. **Strong Password**: Use a strong, unique password for the router account
3. **Network Isolation**: Consider network segmentation for IoT devices
4. **Regular Updates**: Keep router firmware updated
5. **Access Control**: Limit management access to trusted devices

### Data Privacy
- Network data is stored locally in HomeOS
- No external services are used for network monitoring
- Device information remains within your local network
- Security events are logged locally only

## Advanced Configuration

### Custom Device Types
You can customize device type detection by modifying the device classification logic in the NetworkService.

### Bandwidth Alerts
Set up custom bandwidth usage alerts by configuring thresholds in the environment variables.

### Integration with Other Services
The network monitoring data can be integrated with other HomeOS features:
- Energy monitoring correlation
- Security system integration
- Automated device management

## Support

For issues specific to TP-Link ER605 integration:
1. Check router firmware version (latest recommended)
2. Verify API compatibility
3. Review HomeOS logs for detailed error messages
4. Consult TP-Link documentation for API changes

## Future Enhancements

Planned features for network monitoring:
- WiFi signal strength mapping
- Bandwidth usage predictions
- Automated device categorization
- Network topology visualization
- Integration with other router brands
- Mobile device notifications
- Parental controls integration
