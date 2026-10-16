package dev.launchstone.bridge;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/** Loader-independent transport. No remote binding and no arbitrary command endpoint. */
public final class LoopbackBridge implements AutoCloseable {
    private final HttpServer server;
    private final ExecutorService executor;
    private final Path descriptor;
    private final String token;

    public LoopbackBridge(Path serverDirectory, Supplier<String> snapshot) throws IOException {
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        token = HexFormat.of().formatHex(random);
        Path directory = serverDirectory.resolve(".launchstone");
        Files.createDirectories(directory);
        descriptor = directory.resolve("bridge.json");
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 8);
        executor = Executors.newFixedThreadPool(2, runnable -> {
            Thread thread = new Thread(runnable, "Launchstone bridge");
            thread.setDaemon(true);
            return thread;
        });
        server.setExecutor(executor);
        server.createContext("/", exchange -> {
            try {
                String supplied = exchange.getRequestHeaders().getFirst("Authorization");
                if (exchange.getRequestHeaders().containsKey("Origin") || supplied == null || !MessageDigest.isEqual(
                        ("Bearer " + token).getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8))) {
                    respond(exchange, 401, "{\"error\":\"unauthorized\"}");
                } else if (!exchange.getRequestURI().getPath().equals("/v1/status")) {
                    respond(exchange, 404, "{\"error\":\"not_found\"}");
                } else if (!exchange.getRequestMethod().equals("GET")) {
                    respond(exchange, 405, "{\"error\":\"method_not_allowed\"}");
                } else {
                    respond(exchange, 200, snapshot.get());
                }
            } finally {
                exchange.close();
            }
        });
        Path temporary = null;
        try {
            // POSIX permissions are applied when creating the token file, before its contents are written.
            if (Files.getFileStore(directory).supportsFileAttributeView("posix")) {
                Files.setPosixFilePermissions(directory, PosixFilePermissions.fromString("rwx------"));
                temporary = Files.createTempFile(directory, "bridge-", ".tmp", PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
            } else {
                temporary = Files.createTempFile(directory, "bridge-", ".tmp");
            }
            Files.writeString(temporary, "{\"protocolVersion\":1,\"port\":" + server.getAddress().getPort() + ",\"token\":\"" + token + "\"}");
            Files.move(temporary, descriptor, StandardCopyOption.REPLACE_EXISTING);
            server.start();
        } catch (IOException | RuntimeException error) {
            server.stop(0);
            executor.shutdownNow();
            if (temporary != null) Files.deleteIfExists(temporary);
            Files.deleteIfExists(descriptor);
            throw error;
        }
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] data = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, data.length);
        exchange.getResponseBody().write(data);
    }

    @Override
    public void close() throws IOException {
        server.stop(0);
        executor.shutdownNow();
        Files.deleteIfExists(descriptor);
    }
}
