package com.voyzr.userservice.service;

import com.voyzr.userservice.dto.AuthRequest;
import com.voyzr.userservice.dto.AuthResponse;
import com.voyzr.userservice.dto.RegisterRequest;
import com.voyzr.userservice.entity.User;
import com.voyzr.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        // Check for existing email/username to give a useful error
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("An account with this email already exists.");
        }
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("This username is already taken.");
        }

        var user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .build();
        
        // Save triggers @PrePersist which sets uniquePublicId and createdAt
        var savedUser = userRepository.save(user);
        
        // Re-fetch to ensure Hibernate-generated fields are populated in the object
        var freshUser = userRepository.findById(savedUser.getId())
                .orElseThrow(() -> new RuntimeException("Failed to retrieve saved user"));
        
        var jwtToken = jwtService.generateToken(freshUser);
        return AuthResponse.builder()
                .token(jwtToken)
                .id(freshUser.getId())
                .email(freshUser.getEmail())
                .username(freshUser.getUsername())
                .uniquePublicId(freshUser.getUniquePublicId())
                .build();
    }

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        var jwtToken = jwtService.generateToken(user);
        return AuthResponse.builder()
                .token(jwtToken)
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .uniquePublicId(user.getUniquePublicId())
                .build();
    }
}
