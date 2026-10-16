package dev.launchstone.forge;

import com.google.gson.JsonObject;
import com.mojang.logging.LogUtils;
import dev.launchstone.bridge.LoopbackBridge;
import net.minecraft.server.MinecraftServer;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.server.ServerStartedEvent;
import net.minecraftforge.event.server.ServerStoppingEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.versions.forge.ForgeVersion;
import org.slf4j.Logger;
import java.io.IOException;

@Mod("launchstone")
public final class LaunchstoneMod {
    private static final Logger LOGGER = LogUtils.getLogger();
    private LoopbackBridge bridge;
    private MinecraftServer server;
    private volatile String snapshot = "{}";
    private int ticks;

    public LaunchstoneMod() {
        MinecraftForge.EVENT_BUS.addListener(this::onStarted);
        MinecraftForge.EVENT_BUS.addListener(this::onStopping);
        MinecraftForge.EVENT_BUS.addListener(this::onTick);
    }

    private void onStarted(ServerStartedEvent event) {
        if (!event.getServer().isDedicatedServer()) return;
        server = event.getServer();
        updateSnapshot();
        try {
            bridge = new LoopbackBridge(server.getServerDirectory().toPath(), () -> snapshot);
            LOGGER.info("Launchstone companion connected to localhost; protocol v1.");
        } catch (IOException error) {
            LOGGER.error("Launchstone bridge could not start. Minecraft will continue running.", error);
        }
    }

    private void onTick(TickEvent.ServerTickEvent event) {
        if (server != null && event.phase == TickEvent.Phase.END && ++ticks % 20 == 0) updateSnapshot();
    }

    private void updateSnapshot() {
        // Read Minecraft state only on its server thread. HTTP workers read this immutable snapshot.
        JsonObject status = new JsonObject();
        status.addProperty("protocolVersion", 1);
        status.addProperty("companionVersion", "0.1.0");
        status.addProperty("minecraft", server.getServerVersion());
        status.addProperty("loader", "forge");
        status.addProperty("loaderVersion", ForgeVersion.getVersion());
        status.addProperty("players", server.getPlayerCount());
        status.addProperty("maxPlayers", server.getMaxPlayers());
        snapshot = status.toString();
    }

    private void onStopping(ServerStoppingEvent event) {
        if (bridge != null) {
            try { bridge.close(); }
            catch (IOException error) { LOGGER.warn("Unable to remove Launchstone bridge descriptor.", error); }
            bridge = null;
        }
        server = null;
    }
}
