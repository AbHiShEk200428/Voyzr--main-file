package com.voyzr.tripservice.repository;

import com.voyzr.tripservice.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * TripRepository — Spring Data JPA automatically implements this interface.
 * We just define method signatures; Spring generates the SQL queries.
 *
 * JpaRepository<Trip, Long> gives us built-in methods like:
 *   save(), findById(), findAll(), deleteById(), existsById(), count()
 */
@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    /**
     * Find all trips where a specific user is a member.
     * Spring translates the method name into a JOIN query automatically.
     *
     * Equivalent SQL:
     *   SELECT DISTINCT t.* FROM trips t
     *   JOIN trip_members m ON t.id = m.trip_id
     *   WHERE m.user_id = :userId
     *   ORDER BY t.trip_date DESC
     */
    @Query("SELECT DISTINCT t FROM Trip t JOIN t.members m WHERE m.userId = :userId AND (m.status = 'JOINED' OR m.role = 'ORGANIZER') ORDER BY t.tripDate DESC")
    List<Trip> findTripsByMemberUserId(@Param("userId") Long userId);

    /**
     * Find all trips created by a specific organizer.
     */
    List<Trip> findByOrganizerIdOrderByTripDateDesc(Long organizerId);

    /**
     * Find trips by their status (e.g., all LIVE trips).
     */
    List<Trip> findByStatus(Trip.TripStatus status);

    /**
     * Find a trip by its unique invite code.
     */
    java.util.Optional<Trip> findByInviteCode(String inviteCode);
}
