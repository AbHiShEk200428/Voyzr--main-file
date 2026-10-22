import os
import re

OUTPUT_FILE = "CHAPTER_7_PROGRAM_CODES.txt"
PROJECT_ROOT = "."

# We define the structure and the specific paths to look into to keep it at 15-20 pages.
# To keep length reasonable, we'll pick main Application, Config, Controller, Service per module.

MODULES = [
    {
        "section": "7.1 VOYZR API GATEWAY",
        "description": "Gateway routing and general system configuration.",
        "paths": ["voyzr-gateway/src"],
        "keywords": ["Application", "Config"]
    },
    {
        "section": "7.2 USER SERVICE",
        "description": "User authentication, registration, and profile management.",
        "paths": ["user-service/src"],
        "keywords": ["Application", "Controller", "Service", "Config"]
    },
    {
        "section": "7.3 TRIP SERVICE",
        "description": "Core business logic for managing travel itineraries and group trips.",
        "paths": ["trip-service/src"],
        "keywords": ["Application", "TripController", "TripService", "Config"]
    },
    {
        "section": "7.4 CHAT SERVICE",
        "description": "Real-time communication, STOMP WebSocket configurations, and AI chat integration.",
        "paths": ["chat-service/src"],
        "keywords": ["Application", "ChatController", "ChatService", "WebSocket"]
    },
    {
        "section": "7.5 EXPENSE MODULE",
        "description": "Financial tracking and split expense management among trip members.",
        "paths": ["expense-service/src"],
        "keywords": ["Application", "ExpenseController", "ExpenseService"]
    },
    {
        "section": "7.6 LOCATION & PLACES SERVICES",
        "description": "Live GPS tracking and Geoapify location intelligence integrations.",
        "paths": ["location-service/src", "places-service/src"],
        "keywords": ["Application", "LocationController", "LocationService", "PlacesController", "PlacesService"]
    },
    {
        "section": "7.7 NOTIFICATION SERVICE",
        "description": "Asynchronous alerting and push notifications using Apache Kafka.",
        "paths": ["notification-service/src"],
        "keywords": ["Application", "NotificationController", "NotificationService"]
    },
    {
        "section": "7.8 FRONTEND (REACT)",
        "description": "Responsive client interface integrating map visualizations and real-time chat.",
        "paths": ["voyzr-frontend/client/pages", "voyzr-frontend/client/components", "voyzr-frontend/server"],
        "keywords": ["App.tsx", "index.ts", "Chat", "Map", "Dashboard"]
    }
]

def clean_code(lines):
    cleaned = []
    prev_empty = False
    
    # Simple regex to remove completely blank lines or lines with only spaces to compress output
    for line in lines:
        stripped = line.strip()
        is_empty = (stripped == "")
        
        # Omit consecutive empty lines
        if is_empty and prev_empty:
            continue
            
        # Omit import statements to drastically reduce boilerplate in academic report
        if stripped.startswith("import ") and stripped.endswith(";"):
            continue
        if stripped.startswith("package "):
            pass # Keep package for context
            
        cleaned.append(line)
        prev_empty = is_empty
        
    return cleaned

def is_important_file(filename, keywords):
    # E.g. Check if the filename contains "Controller", "Service", etc.
    # For frontend exact matches might be better, but substring is fine.
    for kw in keywords:
        if kw in filename:
            # specifically for Frontend extensions or java
            if filename.endswith(".java") or filename.endswith(".tsx") or filename.endswith(".ts") or filename.endswith(".jsx"):
                return True
    return False

def generate_report():
    total_files_added = 0
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("CHAPTER 7 – PROGRAM CODES\n\n")
        
        for mod in MODULES:
            out.write(f"{mod['section']}\n")
            out.write(f"{mod['description']}\n\n")
            
            # Gather files for this module
            files_to_print = []
            for path_fragment in mod["paths"]:
                search_dir = os.path.join(PROJECT_ROOT, path_fragment)
                search_dir = os.path.abspath(search_dir.replace("/", os.sep))
                
                if not os.path.exists(search_dir):
                    continue
                    
                for root, dirs, files in os.walk(search_dir):
                    if "node_modules" in root or "target" in root:
                        continue
                        
                    for file in files:
                        if is_important_file(file, mod["keywords"]):
                            files_to_print.append(os.path.join(root, file))
            
            # Sort files by importance
            files_to_print.sort(key=lambda x: ("Controller" not in x, "App.tsx" not in x, "Application" not in x, x))
            
            # STRICT LIMIT: Pick ONLY the top 2 files per module to keep length extremely short
            for filepath in files_to_print[:2]:
                filename = os.path.basename(filepath)
                
                out.write(f"{filename}\n")
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        code_lines = f.readlines()
                        
                    cleaned_lines = clean_code(code_lines)
                    
                    # STRICT LIMIT: Only print the first 45 lines of the file
                    MAX_LINES = 45
                    for i, line in enumerate(cleaned_lines):
                        if i >= MAX_LINES:
                            out.write("    // ... (Remaining implementation details omitted for brevity) ...\n")
                            # Add a closing brace to make it look structurally valid
                            out.write("}\n")
                            break
                        out.write(line.rstrip("\n") + "\n")
                    
                    out.write("\n")
                    total_files_added += 1
                except Exception as e:
                    pass
            
            out.write("\n")

    print(f"Successfully generated {OUTPUT_FILE} bridging {total_files_added} components, strictly truncated.")

if __name__ == "__main__":
    generate_report()
