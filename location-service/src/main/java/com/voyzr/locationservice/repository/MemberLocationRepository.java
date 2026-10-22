package com.voyzr.locationservice.repository;

import com.voyzr.locationservice.entity.MemberLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MemberLocationRepository extends JpaRepository<MemberLocation, Long> {
    List<MemberLocation> findByTripId(Long tripId);
    Optional<MemberLocation> findFirstByTripIdAndUserIdOrderByUpdatedAtDesc(Long tripId, Long userId);
}
