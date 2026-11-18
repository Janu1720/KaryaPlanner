package com.manager.taskprioritizer.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.manager.taskprioritizer.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // This custom method will help us find a user by their email during login
    Optional<User> findByEmail(String email);
}