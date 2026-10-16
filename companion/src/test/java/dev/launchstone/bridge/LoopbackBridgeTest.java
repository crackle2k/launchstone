package dev.launchstone.bridge;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;

class LoopbackBridgeTest {
    @TempDir Path directory;
    @Test void authenticatesRequestsAndCleansUpDescriptor() throws Exception {
        Path descriptor = directory.resolve(".launchstone/bridge.json");
        try (LoopbackBridge bridge = new LoopbackBridge(directory, () -> "{\"protocolVersion\":1}")) {
            String json = Files.readString(descriptor);
            var portMatch = Pattern.compile("\"port\":(\\d+)").matcher(json);
            var tokenMatch = Pattern.compile("\"token\":\"([a-f0-9]+)\"").matcher(json);
            assertTrue(portMatch.find()); assertTrue(tokenMatch.find());
            URI uri = URI.create("http://127.0.0.1:" + portMatch.group(1) + "/v1/status");
            HttpClient client = HttpClient.newHttpClient();
            assertEquals(401, client.send(HttpRequest.newBuilder(uri).GET().build(), HttpResponse.BodyHandlers.ofString()).statusCode());
            var request = HttpRequest.newBuilder(uri).header("Authorization", "Bearer " + tokenMatch.group(1)).GET().build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            assertEquals(200, response.statusCode());
            assertEquals("{\"protocolVersion\":1}", response.body());
            assertEquals(401, client.send(HttpRequest.newBuilder(uri).header("Origin", "https://example.com").header("Authorization", "Bearer " + tokenMatch.group(1)).GET().build(), HttpResponse.BodyHandlers.ofString()).statusCode());
        }
        assertFalse(Files.exists(descriptor));
    }
}
