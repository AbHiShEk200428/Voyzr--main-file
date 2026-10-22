package com.voyzr.chatservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.voyzr.chatservice.entity.ChatMessage;
import com.voyzr.chatservice.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${groq.api.key:REPLACE_WITH_YOUR_GROQ_KEY}")
    private String groqApiKey;

    // Internal URLs for microservices
    private final String TRIP_SERVICE_URL = "http://localhost:8081/api/trips/";
    private final String PLACES_SERVICE_URL = "http://localhost:8087/api/places/attractions";

    public void processAiResponse(ChatMessage userMessage) {
        log.info("Processing AI response for message: '{}', tripId: {}", userMessage.getContent(), userMessage.getTripId());
        String content = userMessage.getContent().trim();
        
        // Persona detection: @bot:historian, @bot:budget, @bot:adventurer
        String persona = "default";
        String cleanContent = content;
        String lowContent = content.toLowerCase();

        if (lowContent.startsWith("@bot:")) {
            int firstSpace = content.indexOf(" ");
            if (firstSpace != -1) {
                persona = content.substring(5, firstSpace).toLowerCase();
                cleanContent = content.substring(firstSpace).trim();
            } else {
                persona = content.substring(5).toLowerCase();
                cleanContent = "";
            }
            log.info("Detected persona: {}, clean content: '{}'", persona, cleanContent);
        } else if (content.startsWith("@")) {
            // General @ mention or file path mention
            persona = "default";
            cleanContent = content;
            log.info("Detected general @ mention, content: '{}'", cleanContent);
        }

        // If tripId is null, it's a general travel question
        if (userMessage.getTripId() == null) {
            log.info("TripId is null, generating general Groq response");
            generateGroqResponse(userMessage, persona, cleanContent);
            return;
        }

        // Check if user is asking for attractions for a specific trip
        String lowClean = cleanContent.toLowerCase();
        if (lowClean.contains("attraction") || lowClean.contains("place") || lowClean.contains("visit") || lowClean.contains("see")) {
            log.info("Attraction keywords detected for trip {}, fetching attractions...", userMessage.getTripId());
            fetchAndSendAttractions(userMessage.getTripId(), persona);
        } else {
            log.info("No attraction keywords, generating conversational Groq response for trip {}", userMessage.getTripId());
            generateGroqResponse(userMessage, persona, cleanContent);
        }
    }

    private String getPersonaPrompt(String persona) {
        switch (persona) {
            case "historian":
                return "You are the Historian Guide. Focus on deep historical facts, architecture, and cultural significance. Use a sophisticated, knowledgeable tone.";
            case "budget":
                return "You are the Budget Buddy. Focus on free attractions, affordable street food, and saving money. Use a friendly, practical, and savvy tone.";
            case "adventurer":
                return "You are the Adventurer. Focus on hidden gems, off-beat paths, hiking, and thrill-seeking activities. Use an energetic and daring tone.";
            default:
                return "You are Voyzr AI, a helpful travel assistant for a group trip. Keep responses concise and friendly.";
        }
    }

    private void generateGroqResponse(ChatMessage userMessage, String persona, String cleanContent) {
        log.info("Requesting Groq response for persona: {}, content: '{}'", persona, cleanContent);
        if ("REPLACE_WITH_YOUR_GROQ_KEY".equals(groqApiKey) || groqApiKey == null || groqApiKey.isEmpty()) {
            log.warn("Groq API key is missing or default");
            sendAiMessage(userMessage.getTripId(), "I'm your Voyzr AI assistant! Please add a Groq API key to my configuration to unlock full conversational powers. You can still ask me about 'attractions'!");
            return;
        }

        try {
            String url = "https://api.groq.com/openai/v1/chat/completions";
            String systemPrompt = getPersonaPrompt(persona);
            
            // Basic JSON escaping
            String escapedContent = cleanContent.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
            
            String requestJson = String.format(
                "{\"model\": \"llama-3.1-8b-instant\", \"messages\": [" +
                "{\"role\": \"system\", \"content\": \"%s\"}," +
                "{\"role\": \"user\", \"content\": \"%s\"}" +
                "], \"max_tokens\": 512, \"temperature\": 0.7}",
                systemPrompt.replace("\"", "\\\""),
                escapedContent
            );

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(requestJson, headers);
            String response = restTemplate.postForObject(url, entity, String.class);
            
            JsonNode root = objectMapper.readTree(response);
            String aiText = root.path("choices").get(0).path("message").path("content").asText();

            log.info("Received Groq response successfully");
            sendAiMessage(userMessage.getTripId(), aiText);
        } catch (Exception e) {
            log.error("Groq API call failed: {}", e.getMessage(), e);
            sendAiMessage(userMessage.getTripId(), "I'm a bit overwhelmed right now. Can you try asking that again?");
        }
    }

    private void sendAiMessage(Long tripId, String content) {
        sendAiMessage(tripId, content, "TEXT", null);
    }

    private void sendAiMessage(Long tripId, String content, String type, Map<String, Object> metadata) {
        log.info("Sending AI message. tripId={}, type={}, contentLen={}", tripId, type, content.length());
        ChatMessage aiMessage = ChatMessage.builder()
                .tripId(tripId)
                .senderName("Voyzr AI")
                .senderEmail("ai@voyzr.com")
                .content(content)
                .timestamp(LocalDateTime.now())
                .isAi(true)
                .type(type)
                .metadata(metadata != null ? metadata : new HashMap<>())
                .build();

        try {
            chatMessageRepository.save(aiMessage);
        } catch (Exception e) {
            log.warn("Failed to save AI message to DB: {}", e.getMessage());
        }
        
        String topic = (tripId == null) ? "/topic/chat/global" : "/topic/chat/" + tripId;
        log.info("Broadcasting to topic: {}", topic);
        messagingTemplate.convertAndSend(topic, aiMessage);
    }

    private void fetchAndSendAttractions(Long tripId, String persona) {
        try {
            JsonNode tripNode = restTemplate.getForObject(TRIP_SERVICE_URL + tripId, JsonNode.class);
            if (tripNode == null || !tripNode.has("destinationLat") || tripNode.get("destinationLat").isNull()) {
                sendAiMessage(tripId, "I couldn't find the exact location for this trip's destination.");
                return;
            }

            double lat = tripNode.get("destinationLat").asDouble();
            double lng = tripNode.get("destinationLng").asDouble();
            String destination = tripNode.has("destination") ? tripNode.get("destination").asText() : "your destination";

            String intro = "Searching for attractions...";
            if (persona.equals("historian")) intro = "Let me unearth some historical treasures in " + destination + " for you...";
            else if (persona.equals("budget")) intro = "Finding some great free spots in " + destination + " to save you money!";
            else if (persona.equals("adventurer")) intro = "Scouting for epic adventures in " + destination + "!";
            
            sendAiMessage(tripId, intro);

            String placesUrl = PLACES_SERVICE_URL + "?lat=" + lat + "&lng=" + lng;
            JsonNode placesResponse = restTemplate.getForObject(placesUrl, JsonNode.class);

            if (placesResponse != null && placesResponse.isArray() && !placesResponse.isEmpty()) {
                int count = 0;
                for (JsonNode place : placesResponse) {
                    if (count >= 3) break;
                    
                    String name = place.has("name") ? place.get("name").asText() : "Unknown Place";
                    String address = place.has("address") ? place.get("address").asText() : "";
                    double pLat = place.has("lat") ? place.get("lat").asDouble() : lat;
                    double pLng = place.has("lng") ? place.get("lng").asDouble() : lng;
                    
                    // Use real database image if available
                    String photo = (place.has("imageUrl") && !place.get("imageUrl").asText().isEmpty()) 
                        ? place.get("imageUrl").asText() 
                        : "https://loremflickr.com/400/300/travel," + name.replace(" ", "");

                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("name", name);
                    metadata.put("address", address);
                    metadata.put("latitude", pLat);
                    metadata.put("longitude", pLng);
                    metadata.put("photoUrl", photo);
                    metadata.put("rating", place.has("rating") ? place.get("rating").asDouble() : 4.5);

                    sendAiMessage(tripId, "I recommend visiting **" + name + "**. " + address, "PLACE_CARD", metadata);
                    count++;
                }
            } else {
                sendAiMessage(tripId, "I couldn't find any specific attractions right now, but I hope you have a great time in " + destination + "!");
            }
        } catch (Exception e) {
            log.error("Failed to fetch attractions for trip {}: {}", tripId, e.getMessage());
            sendAiMessage(tripId, "I'm having trouble fetching attractions right now.");
        }
    }
}
