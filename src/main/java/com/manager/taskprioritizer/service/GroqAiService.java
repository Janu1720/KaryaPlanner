package com.manager.taskprioritizer.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GroqAiService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    public String getTaskPrioritiesFromAi(String rawTasks) {
        var restTemplate = new RestTemplate();

        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        String systemPrompt = "You are a task prioritization AI. Analyze the user's tasks. Assign a priority score from 1 (Low) to 5 (Critical) to each. Write a brief, actionable comment on how to start it. You MUST return ONLY a raw JSON array of objects. Do not include markdown tags like ```json. Each object must have exactly these keys: \"taskName\" (string), \"priorityScore\" (integer), \"aiComment\" (string).";

        var systemMessage = new HashMap< String, Object >();
        systemMessage.put("role", "system");
        systemMessage.put("content", systemPrompt);

        var userMessage = new HashMap< String, Object >();
        userMessage.put("role", "user");
        userMessage.put("content", rawTasks);

        var requestBody = new HashMap< String, Object >();
        requestBody.put("model", "llama3-8b-8192");
        requestBody.put("messages", List.of(systemMessage, userMessage));
        requestBody.put("temperature", 0.2); 

        var entity = new HttpEntity<>(requestBody, headers);

        try {
            var response = restTemplate.postForEntity(GROQ_API_URL, entity, Map.class);
            
            @SuppressWarnings("unchecked")
            var responseBody = (Map< String, Object >) response.getBody();
            
            @SuppressWarnings("unchecked")
            var choices = (List< Map< String, Object > >) responseBody.get("choices");
            
            @SuppressWarnings("unchecked")
            var message = (Map< String, Object >) choices.get(0).get("message");
            
            return (String) message.get("content");
            
        } catch (Exception e) {
            e.printStackTrace();
            return "[]"; 
        }
    }
}