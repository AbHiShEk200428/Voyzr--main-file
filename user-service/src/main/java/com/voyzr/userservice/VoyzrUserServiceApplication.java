package com.voyzr.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.voyzr.userservice.entity.User;
import com.voyzr.userservice.repository.UserRepository;

@SpringBootApplication
public class VoyzrUserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(VoyzrUserServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner seedUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() == 0) {
                userRepository.save(User.builder()
                    .username("voyzr_admin")
                    .email("admin@voyzr.com")
                    .password(passwordEncoder.encode("admin123"))
                    .firstName("Voyzr")
                    .lastName("Admin")
                    .build());
                userRepository.save(User.builder()
                    .username("john_doe")
                    .email("john@voyzr.com")
                    .password(passwordEncoder.encode("password123"))
                    .firstName("John")
                    .lastName("Doe")
                    .build());
                userRepository.save(User.builder()
                    .username("alice_traveler")
                    .email("alice@voyzr.com")
                    .password(passwordEncoder.encode("password123"))
                    .firstName("Alice")
                    .lastName("Smith")
                    .build());
                System.out.println("✓ Seeded 3 test users with hashed passwords.");
                System.out.println("  → Login: admin@voyzr.com / admin123");
                System.out.println("  → Login: john@voyzr.com / password123");
                System.out.println("  → Login: alice@voyzr.com / password123");
            } else {
                System.out.println("✓ Users already exist in DB, skipping seed.");
            }
        };
    }
}
