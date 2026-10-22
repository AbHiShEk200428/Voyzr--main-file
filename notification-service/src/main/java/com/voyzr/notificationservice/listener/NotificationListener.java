package com.voyzr.notificationservice.listener;

import com.voyzr.notificationservice.entity.Notification;
import com.voyzr.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationRepository notificationRepository;

    @KafkaListener(topics = "trip-events", groupId = "notification-group")
    public void handleTripEvent(String message) {
        log.info("Received Trip Event: {}", message);
        
        // Simple parsing or just save the whole message
        Notification notification = Notification.builder()
                .userId(1L) // Default for demo
                .title("Trip Update")
                .message(message)
                .type("trip")
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @KafkaListener(topics = "chat-events", groupId = "notification-group")
    public void handleChatEvent(String message) {
        log.info("Received Chat Event: {}", message);
        
        Notification notification = Notification.builder()
                .userId(1L) // Default for demo
                .title("New Message")
                .message(message)
                .type("chat")
                .read(false)
                .build();
        notificationRepository.save(notification);
    }
}
