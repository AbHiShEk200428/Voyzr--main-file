package com.voyzr.tripservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class MediaDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateMediaRequest {
        @NotNull(message = "Trip ID is required")
        private Long tripId;

        @NotBlank(message = "Description is required")
        private String description;

        @NotBlank(message = "Image URL is required")
        private String url;
        
        private String uploadedBy; // Derived from auth or mocked
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MediaResponse {
        private Long id;
        private Long tripId;
        private String description;
        private String url;
        private String uploadedBy;
        private LocalDateTime timestamp;
    }
}
