package com.voyzr.chatservice.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Document(collection = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    private String id;

    private Long tripId;
    private String senderName;
    private String senderEmail;
    private String content;
    private LocalDateTime timestamp;
    
    // TEXT, IMAGE, SYSTEM, POLL, LINK
    private String type; 
    private String imageUrl;
    
    // Store extra structured data like votes, link previews, sandbox data, auto-calculations
    private Map<String, Object> metadata = new HashMap<>();

    private Map<String, List<String>> reactions = new HashMap<>(); // emoji -> list of user emails

    /**
     * NOTE: Lombok @Data generates isAi() getter for boolean fields, causing:
     * - Spring Data MongoDB to store this as field "ai" (not "isAi")
     * - Jackson HTTP serializer to emit "isAi" key via @JsonProperty
     *
     * @Field("isAi") ensures MongoDB stores/reads using key "isAi".
     * @JsonProperty("isAi") ensures HTTP JSON uses key "isAi".
     * @JsonAlias("ai") accepts old HTTP responses that used the "ai" key.
     */
    @Field("isAi")
    @JsonProperty("isAi")
    @JsonAlias("ai")
    private boolean isAi;
}
