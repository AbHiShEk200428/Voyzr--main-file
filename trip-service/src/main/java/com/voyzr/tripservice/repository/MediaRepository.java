package com.voyzr.tripservice.repository;

import com.voyzr.tripservice.entity.Media;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByTripId(Long tripId);
}
