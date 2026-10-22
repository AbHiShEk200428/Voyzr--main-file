package com.voyzr.placesservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class GeocodeService {

    @Value("${google.maps.api-key:NOT_SET}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeocodeResult geocode(String address) {
        String url = String.format("https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s", address,
                apiKey);
        try {
            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);
            if ("OK".equals(root.path("status").asText())) {
                JsonNode loc = root.path("results").get(0).path("geometry").path("location");
                return new GeocodeResult(loc.path("lat").asDouble(), loc.path("lng").asDouble());
            }
        } catch (Exception e) {
            log.error("Geocoding failed: {}", e.getMessage());
        }
        return null;
    }

    @Data
    @AllArgsConstructor
    public static class GeocodeResult {
        private Double latitude;
        private Double longitude;
    }
}
