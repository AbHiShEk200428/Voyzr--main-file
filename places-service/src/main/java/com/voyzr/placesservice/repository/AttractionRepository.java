package com.voyzr.placesservice.repository;

import com.voyzr.placesservice.entity.Attraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttractionRepository extends JpaRepository<Attraction, Long> {

    @Query("SELECT a FROM Attraction a WHERE a.lat BETWEEN :minLat AND :maxLat AND a.lng BETWEEN :minLng AND :maxLng")
    List<Attraction> findNear(@Param("minLat") double minLat, 
                             @Param("maxLat") double maxLat, 
                             @Param("minLng") double minLng, 
                             @Param("maxLng") double maxLng);
}
