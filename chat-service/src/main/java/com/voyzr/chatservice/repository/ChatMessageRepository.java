package com.voyzr.chatservice.repository;

import com.voyzr.chatservice.entity.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByTripIdOrderByTimestampAsc(Long tripId);
}
