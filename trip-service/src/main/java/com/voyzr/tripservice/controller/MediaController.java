package com.voyzr.tripservice.controller;

import com.voyzr.tripservice.dto.MediaDto;
import com.voyzr.tripservice.dto.TripDto;
import com.voyzr.tripservice.service.MediaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/media")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@Slf4j
public class MediaController {

    private final MediaService mediaService;

    @GetMapping("/trip/{tripId}")
    public ResponseEntity<TripDto.ApiResponse<List<MediaDto.MediaResponse>>> getMediaByTrip(@PathVariable Long tripId) {
        log.info("GET /api/media/trip/{} - fetching media", tripId);
        List<MediaDto.MediaResponse> media = mediaService.getMediaByTrip(tripId);
        return ResponseEntity.ok(TripDto.ApiResponse.success("Media fetched", media));
    }

    @PostMapping
    public ResponseEntity<TripDto.ApiResponse<MediaDto.MediaResponse>> addMedia(@RequestBody MediaDto.CreateMediaRequest request) {
        log.info("POST /api/media - adding media '{}'", request.getDescription());
        
        // In real app, get from authentication
        String userName = "Abhishek VS"; 
        
        MediaDto.MediaResponse response = mediaService.addMedia(request, userName);
        return ResponseEntity.ok(TripDto.ApiResponse.success("Media added successfully", response));
    }
}
