package com.voyzr.placesservice.controller;

import com.voyzr.placesservice.entity.Attraction;
import com.voyzr.placesservice.repository.AttractionRepository;
import com.voyzr.placesservice.service.PlacesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/places")
@Slf4j
@RequiredArgsConstructor
public class PlacesController {

    private final PlacesService placesService;
    private final AttractionRepository attractionRepository;

    @GetMapping("/search")
    public List<PlacesService.PlaceSuggestion> search(@RequestParam String query) {
        return placesService.searchPlaces(query);
    }

    @GetMapping("/attractions")
    public List<PlacesService.PlaceSuggestion> getAttractions(@RequestParam double lat, @RequestParam double lng) {
        return placesService.getAttractions(lat, lng);
    }

    @GetMapping("/all")
    public List<PlacesService.PlaceSuggestion> getAllAttractions() {
        return placesService.getAllAttractions();
    }

    @PostMapping("/attractions/manual")
    public ResponseEntity<Attraction> addManual(@RequestBody Attraction attraction) {
        log.info("SCOUT MODE: Manually capturing intel for {}", attraction.getName());
        return ResponseEntity.ok(attractionRepository.save(attraction));
    }
}
