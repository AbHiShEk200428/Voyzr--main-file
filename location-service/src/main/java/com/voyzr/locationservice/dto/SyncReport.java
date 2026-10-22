package com.voyzr.locationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncReport {
    private Long tripId;
    private String destinationName;
    private LocalDateTime targetArrivalTime;
    private List<MemberSyncStatus> memberStatus;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberSyncStatus {
        private Long userId;
        private String userName;
        private String currentEtaText;
        private LocalDateTime recommendedStartTime;
        private String syncMessage; // e.g., "Leave now to arrive on time"
    }
}
