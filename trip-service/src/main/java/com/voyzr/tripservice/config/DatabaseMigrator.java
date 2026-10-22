package com.voyzr.tripservice.config;

import com.voyzr.tripservice.entity.Trip;
import com.voyzr.tripservice.entity.TripMember;
import com.voyzr.tripservice.repository.TripRepository;
import com.voyzr.tripservice.repository.TripMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class DatabaseMigrator implements CommandLineRunner {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;

    @Override
    public void run(String... args) {
        log.info(">>> STARTING DATABASE INTEGRITY CHECK <<<");
        
        // 1. Fix Trips (Invite Codes)
        List<Trip> allTrips = tripRepository.findAll();
        long tripCount = 0;
        for (Trip trip : allTrips) {
            if (trip.getInviteCode() == null || trip.getInviteCode().isEmpty()) {
                trip.setInviteCode("TRIP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                tripRepository.save(trip);
                tripCount++;
            }
        }

        // 2. Fix Trip Members (Status)
        List<TripMember> allMembers = tripMemberRepository.findAll();
        long memberCount = 0;
        for (TripMember member : allMembers) {
            if (member.getStatus() == null) {
                member.setStatus(TripMember.MemberStatus.JOINED);
                tripMemberRepository.save(member);
                memberCount++;
            }
        }

        if (tripCount > 0 || memberCount > 0) {
            log.info(">>> SUCCESS: Fixed {} trips and {} members.", tripCount, memberCount);
        } else {
            log.info(">>> DATABASE IS HEALTHY: No changes needed.");
        }
    }
}
