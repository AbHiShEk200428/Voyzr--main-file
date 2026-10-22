package com.voyzr.tripservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Main entry point for the Voyzr Trip Service.
 *
 * @SpringBootApplication combines three annotations:
 *   - @Configuration: marks this as a source of bean definitions
 *   - @EnableAutoConfiguration: tells Spring Boot to auto-configure based on dependencies
 *   - @ComponentScan: scans this package and sub-packages for Spring components
 */
@SpringBootApplication
@EnableAsync
public class TripServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TripServiceApplication.class, args);
    }
}
