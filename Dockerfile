# Build stage: Compiles your Java code using Maven
FROM maven:3-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Run stage: Starts the Spring Boot server
FROM eclipse-temurin:21-jdk-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Force Spring Boot to use Render's dynamic web port
ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=${PORT:8080}"]
