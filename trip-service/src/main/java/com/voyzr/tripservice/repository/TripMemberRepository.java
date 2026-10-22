package com.voyzr.tripservice.repository;

import com.voyzr.tripservice.entity.TripMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, Long> {

    List<TripMember> findByTripId(Long tripId);

    boolean existsByTripIdAndUserId(Long tripId, Long userId);

    Optional<TripMember> findByTripIdAndUserId(Long tripId, Long userId);

    List<TripMember> findByUserIdAndStatus(Long userId, TripMember.MemberStatus status);

    int countByTripId(Long tripId);

    int countByTripIdAndStatusIn(Long tripId, java.util.Collection<TripMember.MemberStatus> statuses);
}
