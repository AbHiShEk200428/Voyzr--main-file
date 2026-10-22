import os
import re

# We will define the files and their technical summaries
FILES_AND_SUMMARIES = [
    {
        "path": "voyzr-frontend/client/App.tsx",
        "language": "tsx",
        "summary": "This file serves as the main entry point for the React frontend, handling global state providers like Theme, Auth, and React Query. It is responsible for defining the application's routing topology and enforcing protected routes based on user session status."
    },
    {
        "path": "voyzr-frontend/server/index.ts",
        "language": "typescript",
        "summary": "The Express backend acts as a custom API Gateway and proxy server for the frontend, routing requests to various microservices to avoid CORS issues. It integrates directly with third-party APIs such as Gemini AI, Wikipedia, and Geoapify to supply real-time context and photo placeholders for trips."
    },
    {
        "path": "voyzr-frontend/client/services/api.ts",
        "language": "typescript",
        "summary": "This file defines the core API client for the frontend, consolidating all interactions with backend services. It manages HTTP requests, handles authorization tokens via localStorage, and implements global error handling for unauthorized or failed requests."
    },
    {
        "path": "trip-service/src/main/java/com/voyzr/tripservice/entity/Trip.java",
        "language": "java",
        "summary": "This JPA Entity defines the schema and relationship mapping for a 'Trip' within the PostgreSQL database. It stores core itinerary details including destinations, automated side quests encoded as JSON, and the overarching status of the trip lifecycle."
    },
    {
        "path": "trip-service/src/main/java/com/voyzr/tripservice/entity/TripMember.java",
        "language": "java",
        "summary": "This JPA Entity maps the relationship between users and trips in the database, enabling the group travel functionality. It stores the role (e.g., Organizer, Member) and status of each participant within a given expedition."
    },
    {
        "path": "trip-service/src/main/java/com/voyzr/tripservice/controller/TripController.java",
        "language": "java",
        "summary": "The REST controller manages all incoming HTTP requests related to the Trip microservice, exposing endpoints for trip creation, modification, and group invitations. It acts as the gateway between external API requests and internal business logic while enforcing security through Spring Security contexts."
    },
    {
        "path": "trip-service/src/main/java/com/voyzr/tripservice/service/TripService.java",
        "language": "java",
        "summary": "This service layer houses the core business logic for trip management, handling operations like trip creation, participant management, and validation. It coordinates between the database repositories and other microservices (like Notifications) to ensure data consistency during complex operations."
    },
    {
        "path": "voyzr-frontend/client/components/Sidebar.tsx",
        "language": "tsx",
        "summary": "This UI component renders the responsive navigation sidebar for the application, adapting its layout for both desktop and mobile views. It utilizes Framer Motion to provide smooth, dynamic animations that enhance the premium feel of the user interface."
    },
    {
        "path": "voyzr-frontend/client/components/AuthProvider.tsx",
        "language": "tsx",
        "summary": "This React Context provider encapsulates the authentication state and logic, managing token lifecycle and user sessions across the entire application. It exposes a unified 'useAuth' hook that allows components to seamlessly log in, log out, and check authentication status."
    },
    {
        "path": "voyzr-frontend/client/pages/Login.tsx",
        "language": "tsx",
        "summary": "The Login page handles user authentication by capturing credentials and communicating with the user service. It employs smart redirects, seamlessly forwarding users to a pending trip invitation if they joined via a magic link before creating an account."
    },
    {
        "path": "voyzr-frontend/client/pages/Dashboard.tsx",
        "language": "tsx",
        "summary": "The Dashboard serves as the main command center for the user, aggregating their active and upcoming trips into an intuitive grid. It implements intelligent UI features like the Voyzr AI Advisor, which proactively analyzes user spending and routing to provide tailored trip recommendations."
    },
    {
        "path": "voyzr-frontend/client/pages/InviteLink.tsx",
        "language": "tsx",
        "summary": "This component manages the 'Magic Link' invitation flow, intercepting invite codes from the URL and attempting to seamlessly add the user to a trip group. If the user is unauthenticated, it securely stores the invite intent in session storage before redirecting them to the signup pipeline."
    }
]

PROJECT_ROOT = "."
OUTPUT_FILE = "Final_Report_Appendix.md"


def clean_code(code_lines):
    # Remove excessive blank lines (more than 1 consecutive blank line becomes just 1)
    cleaned = []
    prev_empty = False
    
    for line in code_lines:
        is_empty = line.strip() == ""
        if is_empty and prev_empty:
            continue
        cleaned.append(line)
        prev_empty = is_empty
        
    return cleaned


def generate_formatted_appendix():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("# Source Code Appendix\n\n")
        out.write("This appendix contains the core source code for the platform, demonstrating the microservice architecture and responsive React frontend.\n\n")
        
        for item in FILES_AND_SUMMARIES:
            filepath = os.path.join(PROJECT_ROOT, item["path"])
            # Fallback path if running inside a nested dir
            if not os.path.exists(filepath):
                # Try finding it dynamically or adjusting slash
                filepath = os.path.abspath(item["path"].replace("/", "\\"))
            
            if not os.path.exists(filepath):
                print(f"Warning: File not found {filepath}")
                continue
                
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                cleaned_lines = clean_code(lines)
                
            # Write Header
            out.write(f"## {item['path']}\n")
            out.write(f"**Language:** `{item['language'].upper()}`\n\n")
            
            # Write Summary
            out.write(f"**Technical Summary:** {item['summary']}\n\n")
            
            # Write Code Block
            out.write(f"```{item['language']}\n")
            for line in cleaned_lines:
                out.write(line)
            out.write("\n```\n\n")
            out.write("---\n\n")

    print(f"Successfully generated {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_formatted_appendix()
