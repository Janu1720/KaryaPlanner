package com.manager.taskprioritizer.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Data
@NoArgsConstructor
public class Task {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer priority;

    @Column(length = 500)
    private String comment; 

    // New Fields
    private LocalDateTime postedOn;
    private LocalDateTime estimatedCompletionBy;
    private LocalDateTime completedOn;
    private boolean completed = false;

    // Automatically stamp the current time when a task is first created
    @PrePersist
    protected void onCreate() {
        this.postedOn = LocalDateTime.now();
    }
}