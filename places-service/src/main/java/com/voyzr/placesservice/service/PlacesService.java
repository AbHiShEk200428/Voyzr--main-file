package com.voyzr.placesservice.service;

import com.voyzr.placesservice.entity.Attraction;
import com.voyzr.placesservice.repository.AttractionRepository;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PlacesService {

    private final AttractionRepository attractionRepository;

    @PostConstruct
    public void seedData() {
        log.info("Attraction service initialized. Waiting for database sync.");
    }

    public List<PlaceSuggestion> searchPlaces(String query) {
        return attractionRepository.findAll().stream()
                .filter(a -> a.getName().toLowerCase().contains(query.toLowerCase()))
                .map(this::mapToSuggestion)
                .collect(Collectors.toList());
    }

    public List<PlaceSuggestion> getAttractions(double lat, double lng) {
        log.info("Fetching CUSTOM attractions near {}, {}", lat, lng);
        
        // Define a bounding box (~10km radius)
        double offset = 0.1; // roughly 11km
        List<Attraction> nearby = attractionRepository.findNear(
                lat - offset, lat + offset, 
                lng - offset, lng + offset
        );

        return nearby.stream()
                .map(this::mapToSuggestion)
                .collect(Collectors.toList());
    }

    public List<PlaceSuggestion> getAllAttractions() {
        log.info("Fetching ALL curated database attractions");
        return attractionRepository.findAll().stream()
                .map(this::mapToSuggestion)
                .collect(Collectors.toList());
    }

    public String getPhotoUrl(String name) {
        return attractionRepository.findAll().stream()
                .filter(a -> a.getName().equalsIgnoreCase(name))
                .findFirst()
                .map(Attraction::getImage_url)
                .orElse("https://loremflickr.com/800/600/travel,landmark");
    }

    private PlaceSuggestion mapToSuggestion(Attraction a) {
        return new PlaceSuggestion(
                a.getName(),
                a.getAddress(),
                a.getLat(),
                a.getLng(),
                a.getRating(),
                a.getName(),
                a.getImage_url()
        );
    }

    @Data
    public static class PlaceSuggestion {
        private String name;
        private String address;
        private Double lat;
        private Double lng;
        private Double rating;
        private String photoReference;
        private String imageUrl;

        public PlaceSuggestion() {}

        public PlaceSuggestion(String name, String address, Double lat, Double lng, Double rating, String photoReference, String imageUrl) {
            this.name = name;
            this.address = address;
            this.lat = lat;
            this.lng = lng;
            this.rating = rating;
            this.photoReference = photoReference;
            this.imageUrl = imageUrl;
        }
    }
}
