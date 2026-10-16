# Companion protocol v1

Transport: HTTP on `127.0.0.1`, ephemeral port. Discovery file: `<server directory>/.launchstone/bridge.json`. Treat this descriptor as a credential. It is created at dedicated server startup and removed on shutdown. The desktop ignores it unless it owns a running Java process for that profile.

```json
{
  "protocolVersion": 1,
  "port": 41825,
  "token": "<64 lowercase hex characters>"
}
```

Every request requires `Authorization: Bearer <token>`. Browser-origin requests are rejected. The bridge binds only to IPv4 loopback. This is a boundary between local applications, not protection from another process running as the same OS user.

## GET /v1/status

```json
{
  "protocolVersion": 1,
  "companionVersion": "0.1.0",
  "minecraft": "1.20.1",
  "loader": "forge",
  "loaderVersion": "47.4.0",
  "players": 0,
  "maxPlayers": 20
}
```

The server thread refreshes the immutable response every 20 ticks. Player data is never read directly from an HTTP worker. Unauthenticated requests receive 401; unknown paths 404; unsupported methods 405. The desktop validates the response schema and locked environment and uses a two-second timeout.

There are deliberately no save, handoff, lease, remote command, or client reconnect messages in v1. Add those with explicit failure/recovery semantics and compatibility tests once their backing services exist.
