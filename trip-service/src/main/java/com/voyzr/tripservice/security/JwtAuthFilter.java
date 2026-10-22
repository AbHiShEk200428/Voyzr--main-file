package com.voyzr.tripservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JwtAuthFilter — runs on EVERY incoming HTTP request (before the controller).
 *
 * Flow:
 *   1. Read the "Authorization: Bearer <token>" header
 *   2. Extract and validate the JWT
 *   3. Put user info into Spring's SecurityContext
 *   4. Controllers can then call getCurrentUserId() to know who's logged in
 *
 * OncePerRequestFilter guarantees it only runs once per request.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Check for Gateway Headers (X-User-Id)
        String xUserId = request.getHeader("X-User-Id");
        if (xUserId != null) {
            Long userId = Long.parseLong(xUserId);
            String email = request.getHeader("X-User-Email") != null ? request.getHeader("X-User-Email") : "user@voyzr.com";
            String userName = request.getHeader("X-User-Name") != null ? request.getHeader("X-User-Name") : "Voyzr User";

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userId,
                            email,
                            List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    );
            authentication.setDetails(userName);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Read the Authorization header
        String authHeader = request.getHeader("Authorization");

        // 3. If no token — inject a hardcoded DEV USER so controllers work without Auth Service
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            injectDevUser();
            filterChain.doFilter(request, response);
            return;
        }

        // 4. Extract the token (remove "Bearer " prefix)
        String token = authHeader.substring(7);

        // 5. Validate and parse
        if (jwtUtil.isTokenValid(token)) {
            Long userId = jwtUtil.extractUserId(token);
            String userName = jwtUtil.extractUserName(token);
            String email = jwtUtil.extractEmail(token);

            log.debug("Authenticated user: {} (ID: {})", userName, userId);

            // 6. Create an Authentication object and store it in SecurityContext
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userId,
                            email,
                            List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    );

            authentication.setDetails(userName);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        // 7. Continue to the next filter / controller
        filterChain.doFilter(request, response);
    }

    /**
     * DEV MODE: Injects a hardcoded user into Spring's SecurityContext.
     *
     * This simulates what the Auth Service would do — it sets:
     *   principal  = userId (Long)   ← used by getCurrentUserId() in controllers
     *   credentials = email (String) ← used by getCurrentUserEmail()
     *   details    = name (String)   ← used by getCurrentUserName()
     *
     * Without this, controllers that call getCurrentUserId() crash with a
     * ClassCastException because Spring's default principal is a String username.
     *
     * ⚠️  Remove or gate behind @Profile("dev") once Auth Service is built.
     */
    private void injectDevUser() {
        // These values match the user already in your database
        Long   devUserId = 1L;
        String devName   = "Abhishek VS";
        String devEmail  = "abhishek@voyzr.com";

        UsernamePasswordAuthenticationToken devAuth =
                new UsernamePasswordAuthenticationToken(
                        devUserId,   // principal  → Long, matches what controllers expect
                        devEmail,    // credentials
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );
        devAuth.setDetails(devName);

        SecurityContextHolder.getContext().setAuthentication(devAuth);
        log.debug("DEV MODE: Injected dev user '{}' (ID: {})", devName, devUserId);
    }
}
