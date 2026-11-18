package com.manager.taskprioritizer.controller;

import com.manager.taskprioritizer.model.User;
import com.manager.taskprioritizer.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // 1. Fetch User Profile (Used when loading the Profile Page)
    @GetMapping("/profile")
    public ResponseEntity<User> getUserProfile(@RequestParam String email) {
        Optional<User> user = userRepository.findByEmail(email);
        return user.map(ResponseEntity::ok)
                   .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 2. Create or Update User Profile (Used by auth.js and profile.js)
    @PutMapping("/profile")
    public ResponseEntity<User> saveOrUpdateProfile(@RequestBody User incomingUser) {
        // Check if user already exists
        Optional<User> existingUserOpt = userRepository.findByEmail(incomingUser.getEmail());
        
        User userToSave;
        if (existingUserOpt.isPresent()) {
            // Update existing user
            userToSave = existingUserOpt.get();
            if (incomingUser.getName() != null) userToSave.setName(incomingUser.getName());
            if (incomingUser.getPosition() != null) userToSave.setPosition(incomingUser.getPosition());
            if (incomingUser.getCompany() != null) userToSave.setCompany(incomingUser.getCompany());
            if (incomingUser.getPersona() != null) userToSave.setPersona(incomingUser.getPersona());
            if (incomingUser.getAvatarPath() != null) userToSave.setAvatarPath(incomingUser.getAvatarPath());
        } else {
            // Create new user (Triggered by auth.js upon Sign Up)
            userToSave = incomingUser;
        }

        User savedUser = userRepository.save(userToSave);
        return ResponseEntity.ok(savedUser);
    }
}