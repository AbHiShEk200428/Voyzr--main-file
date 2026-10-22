package com.voyzr.tripservice.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.voyzr.tripservice.entity.Trip;
import com.voyzr.tripservice.entity.TripMember;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTOs (Data Transfer Objects) are simple classes used to carry data
 * between the client and server.
 */
public class TripDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateTripRequest {
        @NotBlank(message = "Trip name is required")
        private String name;

        @NotBlank(message = "Destination is required")
        private String destination;

        private Double destinationLat;
        private Double destinationLng;

        @NotNull(message = "Trip date is required")
        private LocalDate tripDate;

        private LocalDateTime targetArrivalTime;

        private String description;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateTripRequest {
        private String name;
        private String destination;
        private Double destinationLat;
        private Double destinationLng;
        private LocalDate tripDate;
        private LocalDateTime targetArrivalTime;
        private String description;
        private Trip.TripStatus status;
        private com.fasterxml.jackson.databind.JsonNode sideQuests;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TripResponse {
        private Long id;
        private String name;
        private String destination;
        private Double destinationLat;
        private Double destinationLng;
        private LocalDate tripDate;
        private LocalDateTime targetArrivalTime;
        private String organizerName;
        private Trip.TripStatus status;
        private String description;
        private String imageUrl;
        private String inviteCode;
        private int memberCount;
        private List<MemberResponse> members;
        private LocalDateTime createdAt;
        private com.fasterxml.jackson.databind.JsonNode sideQuests;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TripSummaryResponse {
        private Long id;
        private String name;
        private String destination;
        private Double destinationLat;
        private Double destinationLng;
        private LocalDate tripDate;
        private LocalDateTime targetArrivalTime;
        private Trip.TripStatus status;
        private String imageUrl;
        private String inviteCode;
        private int memberCount;
        private String organizerName;
        private TripMember.MemberRole myRole;
        private com.fasterxml.jackson.databind.JsonNode sideQuests;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberResponse {
        private Long userId;
        private String userName;
        private String userEmail;
        private TripMember.MemberRole role;
        private LocalDateTime joinedAt;
        private Double lat;
        private Double lng;
        private LocalDateTime recommendedStartTime;
        private String eta;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InviteRequest {
        private String userName;
        private String userEmail;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> success(String message, T data) {
            return ApiResponse.<T>builder().success(true).message(message).data(data).build();
        }

        public static <T> ApiResponse<T> error(String message) {
            return ApiResponse.<T>builder().success(false).message(message).data(null).build();
        }
    }
    
    // DTOs for Expense Splitting
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpenseSplitRequest {
        @NotNull(message = "Payer user ID is required")
        private Long paidByUserId;
        
        @NotNull(message = "Split type is required")
        private String splitType; // e.g., "EQUAL", "CUSTOM"

        // Participants and their amounts owed. For EQUAL split, amounts will be calculated.
        // For CUSTOM, these are directly provided.
        private Map<Long, Double> participantAmounts; 
        
        // Additional fields can be added here as needed, e.g., for notes specific to the split
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SplitDetailsResponse {
        private String splitId; // Unique ID for this split
        private Long expenseId;
        private Long tripId;
        private Long paidByUserId;
        private String splitType; // e.g., "EQUAL", "CUSTOM"
        private Map<Long, Double> amountsOwed; // userId -> amount owed
        private LocalDateTime splitTimestamp;
        private boolean settled; // Overall settlement status for this split
    }
}
