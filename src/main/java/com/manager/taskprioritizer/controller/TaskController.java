package com.manager.taskprioritizer.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manager.taskprioritizer.model.Task;
import com.manager.taskprioritizer.model.User;
import com.manager.taskprioritizer.repository.TaskRepository;
import com.manager.taskprioritizer.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${groq.api.key}")
    private String groqApiKey;

    @GetMapping
    public ResponseEntity<List<Task>> getUserTasks(@RequestParam String email) {
        return ResponseEntity.ok(taskRepository.findByUserEmailAndCompletedFalse(email));
    }

    @GetMapping("/archive")
    public ResponseEntity<List<Task>> getArchivedTasks(@RequestParam String email) {
        return ResponseEntity.ok(taskRepository.findByUserEmailAndCompletedTrue(email));
    }

    @PostMapping("/prioritize")
    public ResponseEntity<?> prioritizeTasks(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String rawTasks = payload.get("tasks");

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(groqApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            User user = userRepository.findByEmail(email).orElse(null);
            String roleContext = (user != null && user.getPosition() != null && !user.getPosition().isEmpty()) 
                ? user.getPosition() + " at " + user.getCompany() : "Professional";
            String personaContext = (user != null && user.getPersona() != null && !user.getPersona().isEmpty()) 
                ? user.getPersona() : "General task management.";

            List<Task> pendingTasks = taskRepository.findByUserEmailAndCompletedFalse(email);
            StringBuilder pendingContext = new StringBuilder();
            if (pendingTasks.isEmpty()) {
                pendingContext.append("No pending tasks. The user's schedule is currently clear.");
            } else {
                for (Task t : pendingTasks) {
                    pendingContext.append("- ").append(t.getName())
                                  .append(" (Current Priority: ").append(t.getPriority()).append(")\n");
                }
            }

            String sanitizedTasks = rawTasks.replace("\"", "'").replace("\n", " ").replace("\r", " ");
            String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

            // --- RE-ENGINEERED PROMPT: Added 'is_professional' boolean and Hard-Reject Rules ---
         // --- 3. Build the Super-Prompt with STRICT ANTI-DUPLICATION ---
            String rawPrompt = "You are an elite AI productivity assistant. Analyze ONLY the new tasks and integrate them into the user's workflow.\n\n"
                    + "--- USER PROFILE ---\n"
                    + "Role: " + roleContext + "\n"
                    + "Persona: " + personaContext + "\n\n"
                    + "--- CURRENT PENDING TASKS (STRICT RULE: DO NOT INCLUDE THESE IN YOUR OUTPUT) ---\n"
                    + pendingContext.toString() + "\n\n"
                    + "--- NEW TASKS TO ANALYZE (ONLY PROCESS THESE) ---\n"
                    + sanitizedTasks + "\n\n"
                    + "Current time is " + currentTime + ".\n\n"
                    + "INSTRUCTIONS:\n"
                    + "Return strictly a JSON object with a 'tasks' array. Each object must have: 'name' (string), 'is_professional' (boolean), 'priority' (integer 1-5, 1=highest), 'comment' (string), and 'estimated_completion' (string, strict format 'yyyy-MM-dd HH:mm').\n\n"
                    + "STRICT GUARDRAILS:\n"
                    + "1. NO DUPLICATION: You must ONLY output the tasks listed in the 'NEW TASKS TO ANALYZE' section. Absolutely DO NOT output tasks from the 'CURRENT PENDING TASKS' section.\n"
                    + "2. PROFESSIONAL FILTER: This app is strictly for professional/academic tasks. If a task is a personal chore (e.g., 'buy milk', 'do laundry'), set 'is_professional' to false. These will be rejected.\n"
                    + "3. EMERGENCY EXCEPTION: If a non-professional task is a life-threatening emergency or urgent health crisis, set 'is_professional' to true and assign critical priority (1).\n"
                    + "4. STANDARD PRIORITIZATION: For all professional tasks (is_professional: true), priority MUST correlate with estimated_completion urgency and intelligently stack-rank against current pending tasks.";
            String safePrompt = rawPrompt.replace("\"", "'").replace("\n", "\\n");

            String requestBody = """
                {
                    "model": "openai/gpt-oss-120b",
                    "messages": [{"role": "user", "content": "%s"}],
                    "response_format": {"type": "json_object"}
                }
            """.formatted(safePrompt);

            HttpEntity<String> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                "https://api.groq.com/openai/v1/chat/completions", request, String.class
            );

            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(response.getBody());
            String aiContent = rootNode.path("choices").get(0).path("message").path("content").asText();
            JsonNode tasksArray = mapper.readTree(aiContent).path("tasks");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            
            // --- NEW: Split tasks into Saved vs Rejected ---
            List<Task> savedTasks = new ArrayList<>();
            List<String> rejectedTaskNames = new ArrayList<>();
            
            for (JsonNode node : tasksArray) {
                boolean isProfessional = node.path("is_professional").asBoolean(true); // Default to true just in case
                
                if (!isProfessional) {
                    // Task is personal. Log the name and skip database saving entirely.
                    rejectedTaskNames.add(node.path("name").asText());
                    continue; 
                }

                Task t = new Task();
                t.setUserEmail(email);
                t.setName(node.path("name").asText());
                t.setPriority(node.path("priority").asInt());
                t.setComment(node.path("comment").asText());
                
                try {
                    t.setEstimatedCompletionBy(LocalDateTime.parse(node.path("estimated_completion").asText(), formatter));
                } catch (Exception e) {
                    t.setEstimatedCompletionBy(LocalDateTime.now().plusDays(1)); 
                }
                savedTasks.add(taskRepository.save(t));
            }
            
            // Return both lists to the frontend so it can trigger the popup
            Map<String, Object> responseBodyOut = new HashMap<>();
            responseBodyOut.put("savedTasks", savedTasks);
            responseBodyOut.put("rejectedTasks", rejectedTaskNames);
            
            return ResponseEntity.ok(responseBodyOut);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("AI Processing failed");
        }
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> markComplete(@PathVariable Long id) {
        try {
            Task task = taskRepository.findById(id).orElseThrow();
            task.setCompleted(true);
            task.setCompletedOn(LocalDateTime.now());
            taskRepository.save(task);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/estimate")
    public ResponseEntity<?> updateEstimate(@PathVariable Long id, @RequestBody EstimatePayload payload) {
        try {
            Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
            LocalDateTime newTime = LocalDateTime.parse(payload.getEstimatedCompletion());
            task.setEstimatedCompletionBy(newTime);
            Task savedTask = taskRepository.save(task);
            return ResponseEntity.ok(savedTask);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid Date Format");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        taskRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/priority")
    public ResponseEntity<?> updatePriority(@PathVariable Long id, @RequestBody Map<String, Integer> payload) {
        Task task = taskRepository.findById(id).orElseThrow();
        task.setPriority(payload.get("priority"));
        taskRepository.save(task);
        return ResponseEntity.ok().build();
    }
    
    public static class EstimatePayload {
        private String estimatedCompletion;
        public String getEstimatedCompletion() { return estimatedCompletion; }
        public void setEstimatedCompletion(String estimatedCompletion) { this.estimatedCompletion = estimatedCompletion; }
    }
}