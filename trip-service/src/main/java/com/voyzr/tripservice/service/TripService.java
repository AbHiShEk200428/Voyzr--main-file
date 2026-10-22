package com.voyzr.tripservice.service;

import com.voyzr.tripservice.dto.TripDto;
import com.voyzr.tripservice.entity.Trip;
import com.voyzr.tripservice.entity.TripMember;
import com.voyzr.tripservice.repository.TripMemberRepository;
import com.voyzr.tripservice.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final NotificationService notificationService;

    public TripDto.TripResponse createTrip(TripDto.CreateTripRequest request, Long userId, String userName) {
        log.info("Creating trip '{}' for user {}", request.getName(), userId);

        Trip trip = Trip.builder()
                .name(request.getName())
                .destination(request.getDestination())
                .destinationLat(request.getDestinationLat())
                .destinationLng(request.getDestinationLng())
                .tripDate(request.getTripDate())
                .targetArrivalTime(request.getTargetArrivalTime())
                .description(request.getDescription())
                .organizerId(userId)
                .organizerName(userName)
                .status(Trip.TripStatus.UPCOMING)
                .sideQuests(null)
                .build();

        Trip savedTrip = tripRepository.save(trip);

        TripMember organizer = TripMember.builder()
                .trip(savedTrip)
                .userId(userId)
                .userName(userName)
                .role(TripMember.MemberRole.ORGANIZER)
                .build();
        TripMember savedOrganizer = tripMemberRepository.save(organizer);

        // Notify via NotificationService (asynchronously)
        notificationService.sendTripCreatedEvent(savedTrip.getName(), userName);

        return toTripResponse(savedTrip, Collections.singletonList(savedOrganizer));
    }

    @Transactional(readOnly = true)
    public TripDto.TripResponse getTripById(Long tripId) {
        return toTripResponse(findTripOrThrow(tripId));
    }

    @Transactional(readOnly = true)
    public List<TripDto.TripSummaryResponse> getMyTrips(Long userId) {
        return tripRepository.findTripsByMemberUserId(userId)
                .stream()
                .map(trip -> toTripSummary(trip, userId))
                .collect(Collectors.toList());
    }

    public TripDto.TripResponse updateTrip(Long tripId, TripDto.UpdateTripRequest request, Long userId) {
        Trip trip = findTripOrThrow(tripId);
        verifyOrganizer(trip, userId);

        if (request.getName() != null)           trip.setName(request.getName());
        if (request.getDestination() != null)    trip.setDestination(request.getDestination());
        if (request.getDestinationLat() != null) trip.setDestinationLat(request.getDestinationLat());
        if (request.getDestinationLng() != null) trip.setDestinationLng(request.getDestinationLng());
        if (request.getTripDate() != null)       trip.setTripDate(request.getTripDate());
        if (request.getTargetArrivalTime() != null) trip.setTargetArrivalTime(request.getTargetArrivalTime());
        if (request.getDescription() != null)    trip.setDescription(request.getDescription());
        if (request.getStatus() != null)         trip.setStatus(request.getStatus());
        if (request.getSideQuests() != null)     trip.setSideQuests(request.getSideQuests());

        return toTripResponse(tripRepository.save(trip));
    }

    public void deleteTrip(Long tripId, Long userId) {
        Trip trip = findTripOrThrow(tripId);
        verifyOrganizer(trip, userId);
        tripRepository.delete(trip);
    }

    public TripDto.TripResponse joinTrip(Long tripId, Long userId, String userName, String userEmail) {
        Trip trip = findTripOrThrow(tripId);
        TripMember member = TripMember.builder()
                .trip(trip)
                .userId(userId)
                .userName(userName)
                .userEmail(userEmail)
                .role(TripMember.MemberRole.MEMBER)
                .status(TripMember.MemberStatus.JOINED)
                .build();
        tripMemberRepository.save(member);
        return toTripResponse(findTripOrThrow(tripId));
    }

    public void inviteUser(Long tripId, Long userId, String userName, String userEmail) {
        Trip trip = findTripOrThrow(tripId);
        if (tripMemberRepository.findByTripIdAndUserId(tripId, userId).isPresent()) {
            throw new RuntimeException("User already in trip");
        }
        TripMember member = TripMember.builder()
                .trip(trip)
                .userId(userId)
                .userName(userName)
                .userEmail(userEmail)
                .role(TripMember.MemberRole.MEMBER)
                .status(TripMember.MemberStatus.PENDING)
                .build();
        tripMemberRepository.save(member);
    }

    public void respondToInvitation(Long tripId, Long userId, boolean accept) {
        TripMember member = tripMemberRepository.findByTripIdAndUserId(tripId, userId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));
        
        if (member.getStatus() != TripMember.MemberStatus.PENDING) {
            throw new RuntimeException("Invitation already processed");
        }

        if (accept) {
            member.setStatus(TripMember.MemberStatus.JOINED);
            tripMemberRepository.save(member);
        } else {
            tripMemberRepository.delete(member);
        }
    }

    public List<TripDto.TripSummaryResponse> getPendingInvitations(Long userId) {
        // This requires a repository method to find by userId and PENDING status
        return tripMemberRepository.findByUserIdAndStatus(userId, TripMember.MemberStatus.PENDING)
                .stream()
                .map(m -> toTripSummary(m.getTrip(), userId))
                .collect(Collectors.toList());
    }

    public void removeMember(Long tripId, Long memberUserId, Long requestingUserId) {
        Trip trip = findTripOrThrow(tripId);

        boolean isSelf = memberUserId.equals(requestingUserId);
        boolean isOrganizer = trip.getOrganizerId().equals(requestingUserId);

        if (!isSelf && !isOrganizer) {
            throw new RuntimeException("Only the organizer can remove other members");
        }

        TripMember member = tripMemberRepository.findByTripIdAndUserId(tripId, memberUserId)
                .orElseThrow(() -> new RuntimeException("Member not found in this trip"));

        if (member.getRole() == TripMember.MemberRole.ORGANIZER) {
            throw new RuntimeException("The organizer cannot be removed from the trip");
        }

        tripMemberRepository.delete(member);
        log.info("User {} removed from trip {} by user {}", memberUserId, tripId, requestingUserId);
    }

    @Transactional
    public void updateMemberRole(Long tripId, Long memberUserId, String roleStr, Long requesterId) {
        Trip trip = findTripOrThrow(tripId);
        
        TripMember requester = tripMemberRepository.findByTripIdAndUserId(tripId, requesterId)
                .orElseThrow(() -> new RuntimeException("Not a member of this trip"));

        if (requester.getRole() != TripMember.MemberRole.ORGANIZER) {
            throw new RuntimeException("Only organizers can change roles");
        }

        TripMember member = tripMemberRepository.findByTripIdAndUserId(tripId, memberUserId)
                .orElseThrow(() -> new RuntimeException("Member not found in this trip"));

        member.setRole(TripMember.MemberRole.valueOf(roleStr));
        tripMemberRepository.save(member);
    }

    @Transactional
    public void updateTripImage(Long tripId, String imageUrl, Long requesterId) {
        Trip trip = findTripOrThrow(tripId);
        
        TripMember requester = tripMemberRepository.findByTripIdAndUserId(tripId, requesterId)
                .orElseThrow(() -> new RuntimeException("Not a member of this trip"));

        if (requester.getRole() != TripMember.MemberRole.ORGANIZER && requester.getRole() != TripMember.MemberRole.CO_ADMIN) {
            throw new RuntimeException("Only organizers or co-admins can update group photo");
        }

        trip.setImageUrl(imageUrl);
        tripRepository.save(trip);
    }

    public TripDto.TripResponse joinTripByCode(String inviteCode, Long userId, String userName, String userEmail) {
        Trip trip = tripRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new RuntimeException("Trip not found with code: " + inviteCode));
        
        if (tripMemberRepository.findByTripIdAndUserId(trip.getId(), userId).isPresent()) {
            throw new RuntimeException("You are already a member of this trip");
        }

        TripMember member = TripMember.builder()
                .trip(trip)
                .userId(userId)
                .userName(userName)
                .userEmail(userEmail)
                .role(TripMember.MemberRole.MEMBER)
                .status(TripMember.MemberStatus.PENDING)
                .build();
        tripMemberRepository.save(member);
        
        // Notify organizer via Kafka (optional)
        return toTripResponse(trip);
    }

    public void respondToJoinRequest(Long tripId, Long memberUserId, Long organizerId, boolean accept) {
        Trip trip = findTripOrThrow(tripId);
        verifyOrganizer(trip, organizerId);

        TripMember member = tripMemberRepository.findByTripIdAndUserId(tripId, memberUserId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (member.getStatus() != TripMember.MemberStatus.PENDING) {
            throw new RuntimeException("Request already processed");
        }

        if (accept) {
            member.setStatus(TripMember.MemberStatus.JOINED);
            tripMemberRepository.save(member);
        } else {
            tripMemberRepository.delete(member);
        }
    }

    private Trip findTripOrThrow(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found: " + tripId));
    }

    private void verifyOrganizer(Trip trip, Long userId) {
        if (!trip.getOrganizerId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Only organizer can do this");
        }
    }

    private TripDto.TripResponse toTripResponse(Trip trip) {
        List<TripMember> members = tripMemberRepository.findByTripId(trip.getId());
        return toTripResponse(trip, members);
    }

    private TripDto.TripResponse toTripResponse(Trip trip, List<TripMember> members) {
        List<TripDto.MemberResponse> memberResponses = members
                .stream()
                .filter(m -> m.getStatus() == TripMember.MemberStatus.JOINED || m.getRole() == TripMember.MemberRole.ORGANIZER)
                .map(m -> {
                    LocalDateTime recommendedStart = null;
                    String etaText = "Calculating...";

                    if (trip.getTargetArrivalTime() != null) {
                        recommendedStart = trip.getTargetArrivalTime().minusHours(2);
                        etaText = "~2h";
                    }
                    
                    return TripDto.MemberResponse.builder()
                        .userId(m.getUserId())
                        .userName(m.getUserName())
                        .userEmail(m.getUserEmail())
                        .role(m.getRole())
                        .joinedAt(m.getJoinedAt())
                        .lat(m.getLat())
                        .lng(m.getLng())
                        .recommendedStartTime(recommendedStart)
                        .eta(etaText)
                        .build();
                })
                .collect(Collectors.toList());

        return TripDto.TripResponse.builder()
                .id(trip.getId())
                .name(trip.getName())
                .destination(trip.getDestination())
                .destinationLat(trip.getDestinationLat())
                .destinationLng(trip.getDestinationLng())
                .tripDate(trip.getTripDate())
                .targetArrivalTime(trip.getTargetArrivalTime())
                .organizerName(trip.getOrganizerName())
                .status(trip.getStatus())
                .description(trip.getDescription())
                .imageUrl(trip.getImageUrl())
                .inviteCode(trip.getInviteCode())
                .memberCount(memberResponses.size())
                .members(memberResponses)
                .createdAt(trip.getCreatedAt())
                .sideQuests(trip.getSideQuests())
                .build();
    }

    private TripDto.TripSummaryResponse toTripSummary(Trip trip, Long currentUserId) {
        TripMember.MemberRole myRole = tripMemberRepository
                .findByTripIdAndUserId(trip.getId(), currentUserId)
                .map(TripMember::getRole)
                .orElse(TripMember.MemberRole.MEMBER);

        return TripDto.TripSummaryResponse.builder()
                .id(trip.getId())
                .name(trip.getName())
                .destination(trip.getDestination())
                .destinationLat(trip.getDestinationLat())
                .destinationLng(trip.getDestinationLng())
                .tripDate(trip.getTripDate())
                .targetArrivalTime(trip.getTargetArrivalTime())
                .status(trip.getStatus())
                .imageUrl(trip.getImageUrl())
                .inviteCode(trip.getInviteCode() != null ? trip.getInviteCode() : "N/A")
                .memberCount(tripMemberRepository.countByTripIdAndStatusIn(trip.getId(), List.of(TripMember.MemberStatus.JOINED)))
                .organizerName(trip.getOrganizerName())
                .myRole(myRole)
                .sideQuests(trip.getSideQuests())
                .build();
    }
}
