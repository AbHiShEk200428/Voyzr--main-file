package com.voyzr.tripservice.controller;

import com.voyzr.tripservice.dto.TripDto;
import com.voyzr.tripservice.service.TripService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@Slf4j
public class TripController {

    private final TripService tripService;

    @ExceptionHandler(Exception.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleException(Exception e) {
        log.error("Unhandled exception in TripController: ", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(TripDto.ApiResponse.error(e.getMessage() != null ? e.getMessage() : "Internal Server Error"));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Trip Service is running ✓");
    }

    @GetMapping("/my-trips")
    public ResponseEntity<TripDto.ApiResponse<List<TripDto.TripSummaryResponse>>> getMyTrips() {
        log.info("GET /api/trips/my-trips");
        return ResponseEntity
                .ok(TripDto.ApiResponse.success("Trips fetched", tripService.getMyTrips(getCurrentUserId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripDto.ApiResponse<TripDto.TripResponse>> getTripById(@PathVariable("id") Long id) {
        log.info("GET /api/trips/{}", id);
        return ResponseEntity.ok(TripDto.ApiResponse.success("Trip fetched", tripService.getTripById(id)));
    }

    @PostMapping
    public ResponseEntity<TripDto.ApiResponse<TripDto.TripResponse>> createTrip(
            @Valid @RequestBody TripDto.CreateTripRequest request) {
        log.info("POST /api/trips - creating trip: {}", request.getName());
        TripDto.TripResponse trip = tripService.createTrip(request, getCurrentUserId(), getCurrentUserName());
        return ResponseEntity.status(HttpStatus.CREATED).body(TripDto.ApiResponse.success("Trip created", trip));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TripDto.ApiResponse<TripDto.TripResponse>> updateTrip(@PathVariable("id") Long id,
            @RequestBody TripDto.UpdateTripRequest request) {
        log.info("PUT /api/trips/{}", id);
        return ResponseEntity.ok(
                TripDto.ApiResponse.success("Trip updated", tripService.updateTrip(id, request, getCurrentUserId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<TripDto.ApiResponse<Void>> deleteTrip(@PathVariable("id") Long id) {
        log.info("DELETE /api/trips/{}", id);
        tripService.deleteTrip(id, getCurrentUserId());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Trip deleted", null));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<TripDto.ApiResponse<TripDto.TripResponse>> joinTrip(@PathVariable("id") Long id) {
        log.info("POST /api/trips/{}/join", id);
        TripDto.TripResponse trip = tripService.joinTrip(id, getCurrentUserId(), getCurrentUserName(),
                getCurrentUserEmail());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Joined trip", trip));
    }

    // INVITATIONS
    @PostMapping("/{id}/invite/{userId}")
    public ResponseEntity<TripDto.ApiResponse<Void>> invite(
            @PathVariable("id") Long id,
            @PathVariable("userId") Long userId,
            @RequestBody(required = false) TripDto.InviteRequest inviteRequest) {
        log.info("POST /api/trips/{}/invite/{}", id, userId);
        String userName = (inviteRequest != null && inviteRequest.getUserName() != null)
                ? inviteRequest.getUserName()
                : "Invited User";
        String userEmail = (inviteRequest != null && inviteRequest.getUserEmail() != null)
                ? inviteRequest.getUserEmail()
                : "invited@voyzr.com";
        tripService.inviteUser(id, userId, userName, userEmail);
        return ResponseEntity.ok(TripDto.ApiResponse.success("Invitation sent", null));
    }

    @PostMapping("/{id}/invitation/respond")
    public ResponseEntity<TripDto.ApiResponse<Void>> respond(@PathVariable("id") Long id,
            @RequestParam("accept") boolean accept) {
        log.info("POST /api/trips/{}/invitation/respond?accept={}", id, accept);
        tripService.respondToInvitation(id, getCurrentUserId(), accept);
        return ResponseEntity.ok(TripDto.ApiResponse.success("Response recorded", null));
    }

    @GetMapping("/invitations/pending")
    public ResponseEntity<TripDto.ApiResponse<List<TripDto.TripSummaryResponse>>> getPending() {
        log.info("GET /api/trips/invitations/pending");
        List<TripDto.TripSummaryResponse> response = tripService.getPendingInvitations(getCurrentUserId());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Pending invitations fetched", response));
    }

    @DeleteMapping("/{tripId}/members/{memberUserId}")
    public ResponseEntity<TripDto.ApiResponse<Void>> removeMember(@PathVariable("tripId") Long tripId,
            @PathVariable("memberUserId") Long memberUserId) {
        log.info("DELETE /api/trips/{}/members/{}", tripId, memberUserId);
        tripService.removeMember(tripId, memberUserId, getCurrentUserId());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Member removed", null));
    }

    @PutMapping("/{id}/members/{memberId}/role")
    public ResponseEntity<TripDto.ApiResponse<Void>> updateMemberRole(
            @PathVariable("id") Long id,
            @PathVariable("memberId") Long memberId,
            @RequestBody java.util.Map<String, String> request) {
        String role = request.get("role");
        log.info("PUT /api/trips/{}/members/{}/role -> {}", id, memberId, role);
        tripService.updateMemberRole(id, memberId, role, getCurrentUserId());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Role updated", null));
    }

    @PutMapping("/{id}/image")
    public ResponseEntity<TripDto.ApiResponse<Void>> updateTripImage(
            @PathVariable("id") Long id,
            @RequestBody java.util.Map<String, String> request) {
        String imageUrl = request.get("imageUrl");
        log.info("PUT /api/trips/{}/image", id);
        tripService.updateTripImage(id, imageUrl, getCurrentUserId());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Image updated", null));
    }

    @PostMapping("/join-by-code")
    public ResponseEntity<TripDto.ApiResponse<TripDto.TripResponse>> joinByCode(@RequestParam("code") String code) {
        log.info("POST /api/trips/join-by-code?code={}", code);
        TripDto.TripResponse trip = tripService.joinTripByCode(code, getCurrentUserId(), getCurrentUserName(),
                getCurrentUserEmail());
        return ResponseEntity.ok(TripDto.ApiResponse.success("Join request submitted", trip));
    }

    @PostMapping("/{id}/join-request/{userId}/respond")
    public ResponseEntity<TripDto.ApiResponse<Void>> respondToJoinRequest(
            @PathVariable("id") Long id,
            @PathVariable("userId") Long userId,
            @RequestParam("accept") boolean accept) {
        log.info("POST /api/trips/{}/join-request/{}/respond?accept={}", id, userId, accept);
        tripService.respondToJoinRequest(id, userId, getCurrentUserId(), accept);
        return ResponseEntity.ok(TripDto.ApiResponse.success("Request processed", null));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return 1L; // Fallback for dev
        Object principal = auth.getPrincipal();
        if (principal instanceof Long)
            return (Long) principal;
        if (principal instanceof String) {
            try {
                return Long.parseLong((String) principal);
            } catch (NumberFormatException e) {
                return 1L;
            }
        }
        return 1L;
    }

    private String getCurrentUserName() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null || !(auth.getDetails() instanceof String))
            return "Test Admin";
        return (String) auth.getDetails();
    }

    private String getCurrentUserEmail() {
        return "admin@voyzr.com";
    }
}

