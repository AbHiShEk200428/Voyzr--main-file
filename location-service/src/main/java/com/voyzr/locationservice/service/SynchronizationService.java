package com.voyzr.locationservice.service;

import com.voyzr.locationservice.dto.SyncReport;
import com.voyzr.locationservice.entity.MemberLocation;
import com.voyzr.locationservice.repository.MemberLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class SynchronizationService {

    private final MemberLocationRepository locationRepository;
    private final DistanceMatrixService distanceMatrixService;
    private final RestTemplate restTemplate = new RestTemplate();

    // Cache to prevent slamming Trip Service during frequent location updates
    private final Map<Long, CachedTrip> tripCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_SECONDS = 120; // 2 minutes

    private static class CachedTrip {
        Map<String, Object> data;
        LocalDateTime expiry;

        CachedTrip(Map<String, Object> data) {
            this.data = data;
            this.expiry = LocalDateTime.now().plusSeconds(CACHE_TTL_SECONDS);
        }

        boolean isExpired() {
            return LocalDateTime.now().isAfter(expiry);
        }
    }

    // Partial DTO to map Trip Service response
    public static class InternalTripResponse {
        public Long id;
        public String destination;
        public Double destinationLat;
        public Double destinationLng;
        public LocalDateTime targetArrivalTime;
        public List<InternalMember> members;
    }

    public static class InternalMember {
        public Long userId;
        public String userName;
    }

    public SyncReport calculateSync(Long tripId) {
        log.info("Calculating arrival synchronization for trip {}", tripId);

        // 1. Fetch Trip details from Trip Service (with simple caching)
        Map<String, Object> data = null;
        CachedTrip cached = tripCache.get(tripId);
        
        if (cached != null && !cached.isExpired()) {
            data = cached.data;
            log.debug("Using cached trip details for trip {}", tripId);
        } else {
            String tripUrl = "http://localhost:8081/api/trips/" + tripId;
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.getForObject(tripUrl, Map.class);
                if (response != null && response.containsKey("data")) {
                    data = (Map<String, Object>) response.get("data");
                    tripCache.put(tripId, new CachedTrip(data));
                }
            } catch (Exception e) {
                log.error("Failed to fetch trip details from {}: {}", tripUrl, e.getMessage());
                // If service is down but we have expired cache, use it as fallback
                if (cached != null) {
                    log.warn("Trip Service unreachable, falling back to EXPIRED cache for trip {}", tripId);
                    data = cached.data;
                } else {
                    throw new RuntimeException("Trip Service Unreachable: " + e.getMessage());
                }
            }
        }

        if (data == null) {
            log.error("Trip service returned null or invalid data for trip {}", tripId);
            throw new RuntimeException("Invalid response from Trip Service");
        }
        
        String destinationName = (String) data.get("destination");
        
        // Safer numeric casting
        Double destLat = data.get("destinationLat") != null ? ((Number) data.get("destinationLat")).doubleValue() : null;
        Double destLng = data.get("destinationLng") != null ? ((Number) data.get("destinationLng")).doubleValue() : null;
        
        // Handle coordinate fallback
        if (destLat == null) destLat = 20.5937; // Fallback to India center
        if (destLng == null) destLng = 78.9629;

        // More robust date parsing for targetArrivalTime
        LocalDateTime targetTime = null;
        Object targetTimeObj = data.get("targetArrivalTime");
        if (targetTimeObj instanceof List) {
            try {
                // Jackson often sends LocalDateTime as [year, month, day, hour, minute]
                List<Integer> parts = (List<Integer>) targetTimeObj;
                if (parts.size() >= 5) {
                    targetTime = LocalDateTime.of(parts.get(0), parts.get(1), parts.get(2), parts.get(3), parts.get(4));
                }
            } catch (Exception e) {
                log.warn("Failed to parse target time list {}, defaulting", targetTimeObj);
            }
        } else if (targetTimeObj != null) {
            try {
                String timeStr = targetTimeObj.toString().replace(" ", "T");
                targetTime = LocalDateTime.parse(timeStr);
            } catch (Exception e) {
                log.warn("Failed to parse target time string '{}', defaulting", targetTimeObj);
            }
        }

        if (targetTime == null) {
            targetTime = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        }

        List<Map<String, Object>> members = (List<Map<String, Object>>) data.get("members");
        if (members == null) members = new ArrayList<>();

        SyncReport report = SyncReport.builder()
                .tripId(tripId)
                .destinationName(destinationName)
                .targetArrivalTime(targetTime)
                .memberStatus(new ArrayList<>())
                .build();

        // 2. For each member, calculate sync
        final Double finalDestLat = destLat;
        final Double finalDestLng = destLng;
        final LocalDateTime finalTargetTime = targetTime;

        for (Map<String, Object> m : members) {
            Long userId = ((Number) m.get("userId")).longValue();
            String userName = (String) m.get("userName");

            MemberLocation loc = locationRepository.findFirstByTripIdAndUserIdOrderByUpdatedAtDesc(tripId, userId).orElse(null);
            
            if (loc == null || loc.getLat() == null) {
                report.getMemberStatus().add(SyncReport.MemberSyncStatus.builder()
                        .userId(userId)
                        .userName(userName)
                        .syncMessage("Wait for GPS...")
                        .build());
                continue;
            }

            // Call Geoapify Routing/Distance Service
            DistanceMatrixService.DurationResult duration = distanceMatrixService.getDuration(
                    loc.getLat(), loc.getLng(), finalDestLat, finalDestLng);

            if (duration != null) {
                // Buffer of 15 mins (900 seconds)
                LocalDateTime recommendedStart = finalTargetTime.minusSeconds(duration.getSeconds() + 900);
                
                String msg;
                if (LocalDateTime.now().isAfter(recommendedStart)) {
                    msg = "🔴 Behind schedule";
                } else if (LocalDateTime.now().plusMinutes(30).isAfter(recommendedStart)) {
                    msg = "🟠 Time to start soon";
                } else {
                    msg = "🟢 On track";
                }

                report.getMemberStatus().add(SyncReport.MemberSyncStatus.builder()
                        .userId(userId)
                        .userName(userName)
                        .currentEtaText(duration.getText())
                        .recommendedStartTime(recommendedStart)
                        .syncMessage(msg)
                        .build());
            } else {
                report.getMemberStatus().add(SyncReport.MemberSyncStatus.builder()
                        .userId(userId)
                        .userName(userName)
                        .syncMessage("Routing unavailable")
                        .build());
            }
        }

        return report;
    }
}
