package com.manager.taskprioritizer.repository;

import com.manager.taskprioritizer.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    // Fetches active tasks for the main board
    List<Task> findByUserEmailAndCompletedFalse(String userEmail);
    
    // NEW: Fetches completed tasks for your Archive page
    List<Task> findByUserEmailAndCompletedTrue(String userEmail);
}