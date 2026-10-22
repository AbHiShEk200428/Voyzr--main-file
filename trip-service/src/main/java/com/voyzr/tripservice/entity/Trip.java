package com.voyzr.tripservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Trip entity — maps directly to the "trips" table in PostgreSQL.
 *
 * Each field annotated with @Column maps to a database column.
 * @Entity tells JPA/Hibernate to manage this class as a DB table.
 */
@Entity
@Table(name = "trips")
@Data                   // Lombok: generates getters, setters, toString, equals, hashCode
@Builder                // Lombok: enables Trip.builder().name("...").build() pattern
@NoArgsConstructor      // Lombok: generates empty constructor (required by JPA)
@AllArgsConstructor     // Lombok: generates constructor with all fields
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto-increment ID
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String destination;

    @Column(name = "destination_lat")
    private Double destinationLat;  // Latitude of destination (for Google Maps)

    @Column(name = "destination_lng")
    private Double destinationLng;  // Longitude of destination

    @Column(name = "trip_date", nullable = false)
    private LocalDate tripDate;

    @Column(name = "target_arrival_time")
    private LocalDateTime targetArrivalTime;

    @Column(name = "organizer_id", nullable = false)
    private Long organizerId;       // User ID of whoever created this trip

    @Column(name = "organizer_name")
    private String organizerName;

    // Enum stored as a String in DB (e.g., "UPCOMING", "LIVE", "COMPLETED")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TripStatus status = TripStatus.UPCOMING;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    // One Trip has many TripMembers
    // cascade = ALL: if we delete a trip, its members are also deleted
    // orphanRemoval = true: if we remove a member from the list, delete from DB
    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TripMember> members = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "invite_code", unique = true)
    private String inviteCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "side_quests", columnDefinition = "jsonb")
    private JsonNode sideQuests;

    // @PrePersist runs BEFORE the entity is first saved to DB
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (inviteCode == null) {
            inviteCode = "TRIP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }

    // @PreUpdate runs BEFORE every subsequent save
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Enum for trip status — stored as string in DB
    public enum TripStatus {
        UPCOMING,   // Trip is scheduled but hasn't started
        LIVE,       // Trip is currently happening (members en route)
        COMPLETED,  // Trip is finished
        CANCELLED   // Trip was cancelled
    }
}
