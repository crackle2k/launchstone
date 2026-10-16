# Launchstone shared worlds

The desktop app is Electron, TypeScript, and React. The companion is Java. A desktop release is independent of a Minecraft release; compatible mod artifacts are built separately.

## Implemented in this foundation

- Electron main process owns files and Java child processes. The sandboxed renderer uses an explicit, typed preload API. IPC validates the sender and parses external inputs.
- Each local profile has a schema-versioned manifest locking Minecraft, loader, Java major, companion protocol, and imported mod JAR hashes. Imports accept a previously installed Forge server directory; arbitrary installer execution is not implemented.
- Forge 1.20.1 is the first target. A profile defaults to Forge 47.4.0; an explicitly entered 47.x version must match the imported installation. The companion builds against 47.4.0. Other Forge versions require testing before claiming support.
- Only one managed local server runs at a time. Start uses Java directly with Forge's OS-specific arguments file. Shell scripts and user JVM arguments are not executed. The user selects a Java executable if Java 17 is not on PATH.
- The app checks EULA acceptance but never accepts it automatically. It blocks app closure while a child server is running, requiring a graceful `stop` first.
- A persisted child PID prevents a restarted desktop from launching or checkpointing a world while an orphaned server process is still alive. This first milestone requires stopping such a process manually; it does not reattach to orphaned consoles. A reused PID is treated conservatively as active.
- The server mod writes a localhost endpoint descriptor with a random bearer token. Its HTTP workers return an immutable status snapshot updated on Minecraft's server thread. The desktop checks the protocol and environment. No remote binding or arbitrary command endpoint exists.
- Local checkpoints require the managed server to be stopped. They copy server data into a staging directory, compute a SHA-256 inventory, then publish the checkpoint by directory rename. Logs, transient bridge credentials, and session locks are omitted. Symbolic links are rejected. Checkpoint restore and remote upload are not implemented.
- The host lease registry is an isolated, tested domain prototype. It is not connected to the desktop and is not a persistent or distributed coordination service.

The server folder belongs exclusively to Launchstone while managed. Do not run another process against it. Import an installation only after stopping its original server. Local backups contain server configuration and player data; do not publish them publicly.

## On-disk layout

```text
<Electron userData>/data/
  settings.json                  # selected Java executable
  worlds/<uuid>/
    manifest.json                # pinned environment + local runtime budget
    server/                      # imported dedicated server installation
      .launchstone/bridge.json   # ephemeral endpoint + bearer token; never uploaded
    checkpoints/<uuid>/
      checkpoint.json            # exact environment + SHA-256 file inventory
      server/                    # complete non-transient server copy
```

The OS-specific userData location is shown in Settings. `LAUNCHSTONE_DATA_DIR` overrides the data directory for isolated testing.

## Next: durable coordination and object storage

A shared world needs an identity independent of any computer. A future service will authenticate members, authorize host eligibility, issue expiring exclusive leases, store a monotonic fencing counter per world, and publish the current checkpoint pointer using compare-and-swap.

The storage upload flow must be: acquire lease → download and verify the current checkpoint → run server → stop/quiesce → upload immutable objects → verify inventory → atomically publish checkpoint using the current fencing token → release lease. A failed or stale uploader must never overwrite the current checkpoint pointer. Lease state and fencing counters must survive service restarts; the in-memory registry is not suitable for that service.

Expiry permits another host to take over, but does not magically stop the old Minecraft process. A production host must stop serving when it cannot renew, before lease expiry with an explicit safety margin. Fencing the checkpoint publication protects shared storage even if that old process continues running. It does not merge divergent gameplay.

Implement authorization, storage integrity, resumable transfers, and recovery behavior before enabling shared hosting in the UI. Remote connectivity also needs NAT traversal with a relay fallback; it is a separate service from world storage.

## Next: planned handoff

Once coordination exists, add a versioned server-mod checkpoint protocol. The mod must prevent further simulation writes while a consistent save is transferred; a `save-all` request alone is insufficient. Planned handoff should notify players, create and commit the final checkpoint, release the old host, start the next host, and reconnect clients. Crash takeover uses the last committed checkpoint and can lose more recent progress.

The first companion is server-only. Client screens and automatic reconnect need a client implementation. Seamless migration of live connections or arbitrary mod memory is out of scope.

## Versioning

- Desktop version: application releases, currently 0.2.0.
- Manifest schema version: local and shared world metadata, currently 1.
- Bridge protocol version: app/mod compatibility, currently 1. Unsupported protocols are rejected.
- Companion version: mod feature release, currently 0.1.0.
- Environment: exact Minecraft, loader, required Java major, and mod hashes.

Keep the desktop on one mainline. Introduce mod maintenance branches only when Minecraft API differences make a shared source tree impractical. Loader adapters should depend on the same transport contract. Support additional targets through a tested build matrix and compatibility catalog, not arbitrary version strings or an assumption that a JAR works across versions.
