package com.voyzr.userservice.repository;

import com.voyzr.userservice.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    List<Friendship> findByUserIdAndStatus(Long userId, Friendship.FriendshipStatus status);
    List<Friendship> findByFriendIdAndStatus(Long friendId, Friendship.FriendshipStatus status);
    Optional<Friendship> findByUserIdAndFriendId(Long userId, Long friendId);
}
