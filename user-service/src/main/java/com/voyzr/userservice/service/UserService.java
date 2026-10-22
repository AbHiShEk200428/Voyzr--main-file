package com.voyzr.userservice.service;

import com.voyzr.userservice.entity.User;
import com.voyzr.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final com.voyzr.userservice.repository.FriendshipRepository friendshipRepository;

    public com.voyzr.userservice.entity.User createUser(com.voyzr.userservice.entity.User user) {
        log.info("Creating user: {}", user.getUsername());
        return userRepository.save(user);
    }

    // Friendships
    public com.voyzr.userservice.entity.Friendship sendFriendRequest(Long userId, Long friendId) {
        if (userId.equals(friendId)) throw new RuntimeException("Cannot add yourself");
        
        com.voyzr.userservice.entity.Friendship friendship = com.voyzr.userservice.entity.Friendship.builder()
                .userId(userId)
                .friendId(friendId)
                .status(com.voyzr.userservice.entity.Friendship.FriendshipStatus.PENDING)
                .build();
        return friendshipRepository.save(friendship);
    }

    public void acceptFriendRequest(Long userId, Long requesterId) {
        com.voyzr.userservice.entity.Friendship f = friendshipRepository.findByUserIdAndFriendId(requesterId, userId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        f.setStatus(com.voyzr.userservice.entity.Friendship.FriendshipStatus.ACCEPTED);
        friendshipRepository.save(f);
    }

    @Transactional(readOnly = true)
    public List<com.voyzr.userservice.entity.User> getFriends(Long userId) {
        List<Long> ids = friendshipRepository.findByUserIdAndStatus(userId, com.voyzr.userservice.entity.Friendship.FriendshipStatus.ACCEPTED)
                .stream().map(com.voyzr.userservice.entity.Friendship::getFriendId).toList();
        
        List<Long> ids2 = friendshipRepository.findByFriendIdAndStatus(userId, com.voyzr.userservice.entity.Friendship.FriendshipStatus.ACCEPTED)
                .stream().map(com.voyzr.userservice.entity.Friendship::getUserId).toList();
        
        List<Long> allIds = new java.util.ArrayList<>(ids);
        allIds.addAll(ids2);
        return userRepository.findAllById(allIds);
    }

    @Transactional(readOnly = true)
    public com.voyzr.userservice.entity.User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    @Transactional(readOnly = true)
    public User getUserByPublicId(String uniquePublicId) {
        return userRepository.findByUniquePublicId(uniquePublicId)
                .orElseThrow(() -> new RuntimeException("User not found with public ID: " + uniquePublicId));
    }

    @Transactional(readOnly = true)
    public List<User> searchUsers(String query) {
        return userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query);
    }

    public User updateProfile(Long id, User updates) {
        User user = getUserById(id);
        if (updates.getFirstName() != null) user.setFirstName(updates.getFirstName());
        if (updates.getLastName() != null)  user.setLastName(updates.getLastName());
        if (updates.getAvatarUrl() != null) user.setAvatarUrl(updates.getAvatarUrl());
        return userRepository.save(user);
    }
}
