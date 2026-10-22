package com.voyzr.tripservice.exception;

import com.voyzr.tripservice.dto.TripDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

// Custom Exception Classes
class TripNotFoundException extends RuntimeException {
    public TripNotFoundException(Long id) {
        super("Trip not found with id: " + id);
    }
}

class UnauthorizedTripActionException extends RuntimeException {
    public UnauthorizedTripActionException(String message) {
        super(message);
    }
}

class AlreadyMemberException extends RuntimeException {
    public AlreadyMemberException(Long userId, Long tripId) {
        super("User " + userId + " is already a member of trip " + tripId);
    }
}

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Handles JSON mapping errors (e.g. bad date format) -> 400
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleInputError(HttpMessageNotReadableException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(TripDto.ApiResponse.error("JSON Error: " + ex.getMostSpecificCause().getMessage()));
    }

    // Handles @Valid validation failures -> 400
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(TripDto.ApiResponse.error("Validation failed: " + errors));
    }

    @ExceptionHandler(TripNotFoundException.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleNotFound(TripNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(TripDto.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedTripActionException.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleUnauthorized(UnauthorizedTripActionException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(TripDto.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AlreadyMemberException.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleAlreadyMember(AlreadyMemberException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(TripDto.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<TripDto.ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(TripDto.ApiResponse.error("An unexpected error occurred: " + ex.getMessage()));
    }
}
