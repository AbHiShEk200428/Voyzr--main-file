package com.voyzr.locationservice.controller;

import com.voyzr.locationservice.dto.LocationUpdate;
import com.voyzr.locationservice.entity.MemberLocation;
import com.voyzr.locationservice.repository.MemberLocationRepository;
import com.voyzr.locationservice.service.DistanceMatrixService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

@RestController
@RequiredArgsConstructor
@Slf4j
public class LocationController {

    private final SimpMessagingTemplate messagingTemplate;
    private final DistanceMatrixService distanceMatrixService;
    private final MemberLocationRepository repository;
    private final com.voyzr.locationservice.service.SynchronizationService syncService;

    @ExceptionHandler(Exception.class)
    public ResponseEntity<com.voyzr.locationservice.dto.SyncReport> handleException(Exception e) {
        log.error("Unhandled error in LocationController: ", e);
        // Return an empty report with an error message instead of null
        com.voyzr.locationservice.dto.SyncReport errorReport = com.voyzr.locationservice.dto.SyncReport.builder()
                .destinationName("Error: " + e.getMessage())
                .memberStatus(new java.util.ArrayList<>())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorReport);
    }

    @MessageMapping("/location.update")
    public void updateLocation(@Payload LocationUpdate update) {
        String type = update.getType() != null ? update.getType() : "LOCATION";

        log.debug("Location update [{}] for trip {}: User {} at {},{}",
                type, update.getTripId(), update.getUserId(), update.getLat(), update.getLng());

        // 1. Persist only if it's a real location update
        if ("LOCATION".equals(type)) {
            MemberLocation loc = repository.findFirstByTripIdAndUserIdOrderByUpdatedAtDesc(update.getTripId(), update.getUserId())
                    .orElse(MemberLocation.builder()
                            .tripId(update.getTripId())
                            .userId(update.getUserId())
                            .build());

            loc.setLat(update.getLat());
            loc.setLng(update.getLng());
            loc.setStatus(update.getStatus());
            repository.save(loc);
        }

        // 2. Broadcast to all members of this trip (including CURSOR movements)
        messagingTemplate.convertAndSend("/topic/location/" + update.getTripId(), update);
    }
    @GetMapping("/api/location/eta")
    public DistanceMatrixService.DurationResult getEta(
            @RequestParam Double originLat, @RequestParam Double originLng,
            @RequestParam Double destLat, @RequestParam Double destLng) {
        return distanceMatrixService.getDuration(originLat, originLng, destLat, destLng);
    }

    @GetMapping("/api/location/sync/{tripId}")
    public com.voyzr.locationservice.dto.SyncReport getTripSync(@PathVariable Long tripId) {
        return syncService.calculateSync(tripId);
    }
}
