package com.voyzr.tripservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "media")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tripId;

    @Column(nullable = false)
    private String description; // Added

    @Column(nullable = false, length = 1024) // Longer length for URLs
    private String url;        // Added

    @Column(nullable = false)
    private String uploadedBy;

    @Column(nullable = false)
    private LocalDateTime timestamp; // Renamed from uploadedAt

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
