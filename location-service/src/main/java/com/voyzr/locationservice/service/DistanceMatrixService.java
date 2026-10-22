package com.voyzr.locationservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class DistanceMatrixService {

    @Value("${geoapify.routing-key}")
    private String geoapifyKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache to prevent redundant Geoapify calls for the same route within a short period
    private final Map<String, CachedDuration> cache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MINUTES = 10;

    @Data
    @AllArgsConstructor
    private static class CachedDuration {
        private DurationResult result;
        private LocalDateTime expiry;

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    public DurationResult getDuration(double originLat, double originLng, double destLat, double destLng) {
        // Create a cache key using rounded coordinates to increase cache hit rate (approx 10km grid)
        String cacheKey = String.format("%.1f,%.1f|%.1f,%.1f", originLat, originLng, destLat, destLng);
        
        CachedDuration cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            log.debug("Using cached duration for {}", cacheKey);
            return cached.getResult();
        }

        // Geoapify Routing API
        String url = String.format(
                "https://api.geoapify.com/v1/routing?waypoints=%f,%f|%f,%f&mode=drive&apiKey=%s",
                originLat, originLng, destLat, destLng, geoapifyKey);

        try {
            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);
            
            JsonNode feature = root.path("features").get(0);
            if (feature != null && !feature.isMissingNode()) {
                long seconds = feature.path("properties").path("time").asLong();
                
                // Format duration text manually
                long hours = seconds / 3600;
                long minutes = (seconds % 3600) / 60;
                String text = hours > 0 ? hours + "h " + minutes + "m" : minutes + "m";
                
                DurationResult result = new DurationResult(seconds, text);
                cache.put(cacheKey, new CachedDuration(result, LocalDateTime.now().plusMinutes(CACHE_TTL_MINUTES)));
                return result;
            }
        } catch (Exception e) {
            log.error("Error fetching Geoapify routing: {}", e.getMessage());
        }
        return null;
    }

    @Data
    @AllArgsConstructor
    public static class DurationResult {
        private long seconds;
        private String text;
    }
}
