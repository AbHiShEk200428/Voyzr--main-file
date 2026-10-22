import os

# Configuration
# The root of your workspace
PROJECT_ROOT = "."
# The output file
OUTPUT_FILE = "code_appendix.md"

# Which file extensions to include
ALLOWED_EXTENSIONS = {'.java', '.tsx', '.ts'}

# Directories to skip entirely
IGNORED_DIRS = {
    'node_modules', 'target', '.git', '.vscode', 
    'dist', 'build', '.idea', 'screenshots', '.history'
}

# The maximum characters roughly equivalent to 60-70 pages.
# 1 page is around 50 lines. 70 pages is ~3500 lines.
MAX_LINES = 4000

def generate_appendix():
    total_lines = 0
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        outfile.write("# Voyzr Source Code Appendix\n\n")
        
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ALLOWED_EXTENSIONS:
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            lines = infile.readlines()
                            
                            # Filter out empty files or imports-only files (optional)
                            if len(lines) < 10:
                                continue
                            
                            # Write the path as a header
                            relative_path = os.path.relpath(file_path, PROJECT_ROOT)
                            outfile.write(f"## File: `{relative_path}`\n\n")
                            outfile.write(f"```{ext[1:]}\n")
                            
                            for line in lines:
                                outfile.write(line)
                                total_lines += 1
                                
                            outfile.write("\n```\n\n")
                            
                            if total_lines >= MAX_LINES:
                                print(f"Reached max line limit ({MAX_LINES} lines), stopping extraction.")
                                return

                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")

    print(f"Successfully generated {OUTPUT_FILE} with {total_lines} lines of code.")

if __name__ == "__main__":
    generate_appendix()
