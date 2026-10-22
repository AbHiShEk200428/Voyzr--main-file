package com.voyzr.userservice.controller;

import com.voyzr.userservice.entity.User;
import com.voyzr.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        return ResponseEntity.ok(userService.createUser(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> search(@RequestParam String query) {
        return ResponseEntity.ok(userService.searchUsers(query));
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody User updates) {
        return ResponseEntity.ok(userService.updateProfile(id, updates));
    }

    // Social
    @PostMapping("/{id}/friends/{friendId}")
    public ResponseEntity<com.voyzr.userservice.entity.Friendship> addFriend(@PathVariable Long id, @PathVariable Long friendId) {
        return ResponseEntity.ok(userService.sendFriendRequest(id, friendId));
    }

    @PostMapping("/{id}/friends/{requesterId}/accept")
    public ResponseEntity<Void> acceptFriend(@PathVariable Long id, @PathVariable Long requesterId) {
        userService.acceptFriendRequest(id, requesterId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/public/{uniquePublicId}")
    public ResponseEntity<User> getUserByPublicId(@PathVariable String uniquePublicId) {
        return ResponseEntity.ok(userService.getUserByPublicId(uniquePublicId));
    }

    @GetMapping("/{id}/friends")
    public ResponseEntity<List<User>> getFriends(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getFriends(id));
    }
}
