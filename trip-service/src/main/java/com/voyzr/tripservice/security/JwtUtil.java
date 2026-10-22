package com.voyzr.tripservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * JwtUtil — reads and validates JWT tokens issued by the Auth Service.
 *
 * The Trip Service never CREATES tokens — only the Auth Service does.
 * This class only READS them to find out who the user is.
 *
 * How JWT works:
 *   Header.Payload.Signature
 *   The payload contains "claims" like userId, username, email.
 *   We verify the signature using the shared secret key.
 */
@Component
@Slf4j
public class JwtUtil {

    // Injected from application.yml — MUST match the Auth Service's secret
    @Value("${jwt.secret}")
    private String secret;

    /**
     * Parse the token and extract all claims (the payload).
     * Throws an exception automatically if token is expired or tampered with.
     */
    private Claims extractAllClaims(String token) {
        Key key = Keys.hmacShaKeyFor(secret.getBytes());
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /** Extract the user's ID from the token (stored as "sub" or custom claim) */
    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return Long.parseLong(claims.get("userId", String.class));
    }

    /** Extract the user's display name */
    public String extractUserName(String token) {
        return extractAllClaims(token).get("name", String.class);
    }

    /** Extract the user's email */
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject(); // subject is usually email
    }

    /** Check if the token is still valid (not expired, signature matches) */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (Exception e) {
            log.error("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }
}
