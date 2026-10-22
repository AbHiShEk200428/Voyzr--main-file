package com.voyzr.chatservice.controller;

import com.voyzr.chatservice.entity.ChatMessage;
import com.voyzr.chatservice.repository.ChatMessageRepository;
import com.voyzr.chatservice.service.AiChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final AiChatService aiChatService;

    // In-memory fallback if MongoDB is down
    private static final List<ChatMessage> inMemoryHistory = new CopyOnWriteArrayList<>();

    // ── Global exception handler for this controller ─────────────────────────
    // Catches any uncaught exception (e.g., MongoDB MappingException for old
    // documents that have "ai" field instead of "isAi") and returns 200 + [].
    @ExceptionHandler(Exception.class)
    public ResponseEntity<List<ChatMessage>> handleAnyException(Exception e) {
        log.error("[ChatController] Unhandled exception — returning safe empty list: {}", e.getMessage());
        // Return in-memory if available, otherwise empty list — never 500
        List<ChatMessage> safe = inMemoryHistory.isEmpty() ? Collections.emptyList() : inMemoryHistory;
        return ResponseEntity.ok(safe);
    }

    @GetMapping("/ping")
    public String ping() {
        return "Chat Service is Online";
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        log.info("Received chat message from {} for trip {}", chatMessage.getSenderName(), chatMessage.getTripId());
        chatMessage.setTimestamp(LocalDateTime.now());
        chatMessage.setAi(false);

        try {
            ChatMessage savedMessage = chatMessageRepository.save(chatMessage);
            chatMessage = savedMessage;
        } catch (Exception e) {
            log.warn("Failed to save to MongoDB, using in-memory: {}", e.getMessage());
            if (chatMessage.getId() == null) {
                chatMessage.setId(java.util.UUID.randomUUID().toString());
            }
            inMemoryHistory.add(chatMessage);
        }

        messagingTemplate.convertAndSend("/topic/chat/" + chatMessage.getTripId(), chatMessage);

        final ChatMessage lambdaMsg = chatMessage;
        String content = chatMessage.getContent().toLowerCase();
        if (content.contains("ai") || content.contains("attraction") || content.contains("place")
                || content.contains("visit") || content.contains("@")) {
            CompletableFuture.runAsync(() -> {
                try {
                    Thread.sleep(1000);
                    aiChatService.processAiResponse(lambdaMsg);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.error("AI processing error: {}", e.getMessage());
                }
            });
        }
    }

    @MessageMapping("/chat.typing")
    public void sendTypingStatus(@Payload Map<String, Object> typingData) {
        String tripId = String.valueOf(typingData.get("tripId"));
        messagingTemplate.convertAndSend("/topic/chat/" + tripId + "/typing", typingData);
    }

    @PostMapping("/messages/{id}/react")
    public ResponseEntity<ChatMessage> updateReaction(@PathVariable String id, @RequestBody Map<String, Object> reactionData) {
        log.info("Updating reaction for message {}. Data: {}", id, reactionData);
        try {
            Optional<ChatMessage> messageOpt = chatMessageRepository.findById(id);
            if (messageOpt.isEmpty()) {
                messageOpt = inMemoryHistory.stream().filter(m -> id.equals(m.getId())).findFirst();
            }
            
            ChatMessage message = messageOpt.orElseThrow(() -> new RuntimeException("Message not found with id: " + id));
            
            String emoji = (String) reactionData.get("emoji");
            String voterEmail = (String) reactionData.get("voterEmail");
            
            if (emoji == null || voterEmail == null) {
                log.warn("Invalid reaction request: emoji or voterEmail is null");
                return ResponseEntity.badRequest().build();
            }

            Map<String, List<String>> reactions = message.getReactions();
            if (reactions == null) {
                reactions = new HashMap<>();
            }
            
            List<String> voters = reactions.get(emoji);
            if (voters == null) {
                voters = new ArrayList<>();
                reactions.put(emoji, voters);
            } else {
                voters = new ArrayList<>(voters);
                reactions.put(emoji, voters);
            }
            
            if (voters.contains(voterEmail)) {
                voters.remove(voterEmail);
                log.info("Removed reaction {} from user {} on message {}", emoji, voterEmail, id);
                if (voters.isEmpty()) {
                    reactions.remove(emoji);
                }
            } else {
                voters.add(voterEmail);
                log.info("Added reaction {} from user {} on message {}", emoji, voterEmail, id);
            }
            
            message.setReactions(reactions);
            
            // Try to save to MongoDB, but don't fail if it's an in-memory message
            try {
                chatMessageRepository.save(message);
            } catch (Exception e) {
                log.warn("Failed to save reaction to MongoDB, it stays in-memory: {}", e.getMessage());
            }
            
            // Broadcast via WebSocket
            messagingTemplate.convertAndSend("/topic/chat/" + message.getTripId(), message);
            
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Failed to update reaction for message {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Returns chat history for a given tripId.
     * Falls back to in-memory (then empty list) if MongoDB fails — never throws.
     */
    @GetMapping("/history/{tripId}")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String tripId) {
        log.info("Fetching chat history for trip: {}", tripId);
        try {
            Long id = Long.parseLong(tripId);
            List<ChatMessage> history = chatMessageRepository.findByTripIdOrderByTimestampAsc(id);
            log.info("Found {} messages for trip {}", history.size(), id);
            return ResponseEntity.ok(history);
        } catch (NumberFormatException e) {
            log.warn("Non-numeric tripId '{}' — returning empty list", tripId);
            return ResponseEntity.ok(Collections.emptyList());
        } catch (Exception e) {
            log.error("Failed to fetch history from MongoDB for trip {}: {}", tripId, e.getMessage());
            // If MongoDB is down or has bad docs, fall through to in-memory / empty
            List<ChatMessage> fallback = inMemoryHistory.stream()
                    .filter(m -> tripId.equals(String.valueOf(m.getTripId())))
                    .toList();
            return ResponseEntity.ok(fallback);
        }
    }

    @PostMapping("/messages/{id}/vote")
    public ResponseEntity<ChatMessage> updateVote(@PathVariable String id, @RequestBody Map<String, Object> voteData) {
        log.info("Updating vote for message {}", id);
        try {
            Optional<ChatMessage> messageOpt = chatMessageRepository.findById(id);
            if (messageOpt.isEmpty()) {
                messageOpt = inMemoryHistory.stream().filter(m -> id.equals(m.getId())).findFirst();
            }
            
            ChatMessage message = messageOpt.orElseThrow(() -> new RuntimeException("Message not found"));
            
            Integer optionIndex = (Integer) voteData.get("optionIndex");
            String voterEmail = (String) voteData.get("voterEmail");
            
            Map<String, Object> metadata = message.getMetadata();
            if (metadata == null) metadata = new HashMap<>();
            
            List<Map<String, Object>> options = (List<Map<String, Object>>) metadata.get("options");
            if (options != null && optionIndex != null && optionIndex < options.size()) {
                for (Map<String, Object> opt : options) {
                    List<String> voters = (List<String>) opt.get("voters");
                    if (voters != null) {
                        voters.remove(voterEmail);
                    }
                }
                
                Map<String, Object> selectedOption = options.get(optionIndex);
                List<String> voters = (List<String>) selectedOption.get("voters");
                if (voters == null) {
                    voters = new ArrayList<>();
                    selectedOption.put("voters", voters);
                }
                voters.add(voterEmail);
            }
            
            message.setMetadata(metadata);
            
            try {
                chatMessageRepository.save(message);
            } catch (Exception e) {
                log.warn("Failed to save vote to MongoDB, stays in-memory: {}", e.getMessage());
            }
            
            messagingTemplate.convertAndSend("/topic/chat/" + message.getTripId(), message);
            
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            log.error("Failed to update vote: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/ai")
    public ResponseEntity<Void> chatWithAi(@RequestBody ChatMessage chatMessage) {
        log.info("Direct AI Assistant message: {}", chatMessage.getContent());
        chatMessage.setTimestamp(LocalDateTime.now());
        chatMessage.setAi(false);
        chatMessage.setTripId(null);

        try {
            ChatMessage savedMessage = chatMessageRepository.save(chatMessage);
            chatMessage = savedMessage;
        } catch (Exception e) {
            log.warn("Database error, continuing in-memory: {}", e.getMessage());
            if (chatMessage.getId() == null) {
                chatMessage.setId(java.util.UUID.randomUUID().toString());
            }
            inMemoryHistory.add(chatMessage);
        }

        messagingTemplate.convertAndSend("/topic/chat/global", chatMessage);

        final ChatMessage lambdaMsg = chatMessage;
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(1000);
                aiChatService.processAiResponse(lambdaMsg);
            } catch (Exception e) {
                log.error("AI processing error: {}", e.getMessage());
            }
        });

        return ResponseEntity.ok().build();
    }

    public void addToInMemory(ChatMessage msg) {
        inMemoryHistory.add(msg);
    }
}
