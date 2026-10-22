package com.voyzr.tripservice.service;

import com.voyzr.tripservice.dto.MediaDto;
import com.voyzr.tripservice.entity.Media;
import com.voyzr.tripservice.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;

    public MediaDto.MediaResponse addMedia(MediaDto.CreateMediaRequest request, String userName) {
        log.info("Adding media for trip {} by user {}", request.getTripId(), userName);

        Media media = Media.builder()
                .tripId(request.getTripId())
                .description(request.getDescription())
                .url(request.getUrl())
                .uploadedBy(userName)
                .build();

        Media saved = mediaRepository.save(media);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MediaDto.MediaResponse> getMediaByTrip(Long tripId) {
        return mediaRepository.findByTripId(tripId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private MediaDto.MediaResponse toResponse(Media m) {
        return MediaDto.MediaResponse.builder()
                .id(m.getId())
                .tripId(m.getTripId())
                .description(m.getDescription())
                .url(m.getUrl())
                .uploadedBy(m.getUploadedBy())
                .timestamp(m.getTimestamp())
                .build();
    }
}
