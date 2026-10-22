package com.voyzr.locationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationUpdate {
    private Long tripId;
    private Long userId;
    private String userName;
    private Double lat;
    private Double lng;
    private String status;
    private String type; // LOCATION, CURSOR, RALLY_POINT
}
