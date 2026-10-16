# Launchstone

Shared Minecraft worlds, hosted by the people playing.

Launchstone is being rebuilt with **Electron + React + TypeScript**, alongside a **Java companion mod for Forge 1.20.1**. This first milestone runs local servers and creates local checkpoints. Remote syncing and automatic host handoff are not connected yet.

## Desktop development

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

```sh
npm run build       # type-check and build main, preload, and renderer
npm start           # open the production build
npm test            # storage, import, and lease-domain tests
npm run test:desktop # Electron workflow test (run build first)
npm run package     # create an unpacked app for your current OS
```

On headless Linux, run `xvfb-run --auto-servernum npm run test:desktop`.

## Companion mod

Install a JDK 17 and make it the active `JAVA_HOME`.

```sh
cd companion
./gradlew build
# Windows: gradlew.bat build
```

The distributable mod is `companion/build/libs/launchstone-companion-0.1.0+mc1.20.1-forge.jar`. Build it before setting up a server. The first build downloads Forge and Minecraft development dependencies and requires network access. The Gradle wrapper comes from the official Forge 1.20.1 / 47.4.0 MDK.

## Run a local world

1. Install a Forge **1.20.1 / 47.4.0** dedicated server in a separate folder using the official Forge installer. Install both OS argument files if you intend to move that installation across operating systems.
2. Add the companion JAR to that server's `mods/` directory, along with any other required server mods. Stop the source server before importing it.
3. Review and accept Minecraft's EULA yourself in the server's `eula.txt`. Configure its `server.properties` as desired.
4. Open Launchstone and create a world profile with the same Forge version and server port. The default is 47.4.0 and port 25565.
5. Import the installed server folder. Launchstone copies it and records the mod checksums. Import into an empty profile only.
6. Select a Java 17 executable in Settings if the default Java runtime is a different version.
7. Start hosting. Connect Minecraft using `localhost:<port>` on this computer. Other LAN clients can use its LAN address; internet connectivity is not automated yet.
8. Stop the server, then use the Checkpoints tab to save a consistent local checkpoint.

Keep server files under Launchstone's exclusive control. This build does not launch the Minecraft client, install Forge automatically, upload worlds, restore checkpoints, or provide invitations and host migration. The server-side companion currently reports authenticated status and player counts; client reconnect support comes later.

## Project layout

```text
electron/       Main process, preload API, server lifecycle, world storage
src/            React desktop interface
shared/         Validated manifests, typed app/mod contracts, lease-domain prototype
companion/      Java bridge + Forge 1.20.1 adapter + Gradle build
tests/          TypeScript domain and filesystem tests
scripts/        Electron integration smoke test
docs/           Architecture, version strategy, and companion protocol
```

See [architecture](docs/architecture.md) and [protocol v1](docs/protocol.md) for the implemented boundaries and next milestones.
