package com.voyzr.tripservice;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.voyzr.tripservice.dto.TripDto;
import com.voyzr.tripservice.entity.Trip;
import com.voyzr.tripservice.repository.TripMemberRepository;
import com.voyzr.tripservice.repository.TripRepository;
import com.voyzr.tripservice.service.TripService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for TripService.
 * @SpringBootTest loads the full application context.
 * @ActiveProfiles("test") uses application-test.yml (H2 in-memory DB).
 * @Transactional rolls back DB changes after each test so tests are isolated.
 */
@SpringBootTest
@Transactional
@ActiveProfiles("test")
class TripServiceTest {

    @Autowired private TripService tripService;
    @Autowired private TripRepository tripRepository;
    @Autowired private TripMemberRepository tripMemberRepository;

    private TripDto.CreateTripRequest validRequest;
    private final Long USER_ID = 1L;
    private final String USER_NAME = "Abhishek VS";

    @BeforeEach
    void setUp() {
        // Build a valid create request used by most tests
        validRequest = TripDto.CreateTripRequest.builder()
                .name("Munnar Weekend")
                .destination("Munnar, Kerala")
                .destinationLat(10.0889)
                .destinationLng(77.0595)
                .tripDate(LocalDate.now().plusDays(7))
                .description("Tea estate visit!")
                .build();
    }

    @Test
    void createTrip_shouldSaveTripAndAddOrganizerAsMember() {
        TripDto.TripResponse response = tripService.createTrip(validRequest, USER_ID, USER_NAME);

        assertNotNull(response.getId(), "Trip should get an ID after saving");
        assertEquals("Munnar Weekend", response.getName());
        assertEquals("Munnar, Kerala", response.getDestination());
        assertEquals(Trip.TripStatus.UPCOMING, response.getStatus());
        assertEquals(1, response.getMemberCount(), "Creator should be auto-added as member");
        assertEquals(USER_NAME, response.getOrganizerName());
    }

    @Test
    void getMyTrips_shouldReturnTripsWhereUserIsMember() {
        // Create two trips for the same user
        tripService.createTrip(validRequest, USER_ID, USER_NAME);

        TripDto.CreateTripRequest anotherTrip = TripDto.CreateTripRequest.builder()
                .name("Varkala Beach")
                .destination("Varkala")
                .tripDate(LocalDate.now().plusDays(14))
                .build();
        tripService.createTrip(anotherTrip, USER_ID, USER_NAME);

        List<TripDto.TripSummaryResponse> myTrips = tripService.getMyTrips(USER_ID);
        assertEquals(2, myTrips.size(), "Should return both trips for this user");
    }

    @Test
    void joinTrip_shouldAddNewMember() {
        TripDto.TripResponse created = tripService.createTrip(validRequest, USER_ID, USER_NAME);

        Long newUserId = 2L;
        TripDto.TripResponse afterJoin = tripService.joinTrip(
                created.getId(), newUserId, "Adil Navas", "adil@example.com");

        assertEquals(2, afterJoin.getMemberCount(), "Should now have 2 members");
    }

    @Test
    void joinTrip_shouldThrowIfAlreadyMember() {
        TripDto.TripResponse created = tripService.createTrip(validRequest, USER_ID, USER_NAME);

        // Try to join again as the same user (already organizer/member)
        assertThrows(Exception.class, () ->
                tripService.joinTrip(created.getId(), USER_ID, USER_NAME, "ab@email.com"),
                "Should throw when user is already a member"
        );
    }

    @Test
    void deleteTrip_shouldFailIfNotOrganizer() {
        TripDto.TripResponse created = tripService.createTrip(validRequest, USER_ID, USER_NAME);

        Long differentUser = 99L;
        assertThrows(Exception.class, () ->
                tripService.deleteTrip(created.getId(), differentUser),
                "Non-organizer should not be able to delete trip"
        );
    }
}
