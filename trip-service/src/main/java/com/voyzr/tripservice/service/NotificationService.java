package com.voyzr.tripservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final KafkaTemplate<String, String> kafkaTemplate;

    @Async
    public void sendTripCreatedEvent(String tripName, String organizerName) {
        try {
            log.info("Sending Kafka event for trip '{}' created by {}", tripName, organizerName);
            kafkaTemplate.send("trip-events", "New trip created: " + tripName + " by " + organizerName);
        } catch (Exception e) {
            log.error("Failed to send Kafka event for trip '{}'", tripName, e);
        }
    }
}
