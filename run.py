import subprocess
import sys
import os
from threading import Thread
from pathlib import Path
import time
import socket

# Get the absolute path to the project root
ROOT_DIR = Path(__file__).parent.absolute()

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def wait_for_port(port, timeout=5):
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_port_in_use(port):
            return True
        time.sleep(0.1)
    return False

def run_backend():
    backend_dir = ROOT_DIR / 'backend'
    if not backend_dir.exists():
        print(f"Error: Backend directory not found at {backend_dir}")
        sys.exit(1)
    
    print("Starting backend server...")
    os.chdir(backend_dir)
    try:
        subprocess.run([sys.executable, 'app.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Backend server failed to start: {e}")
        sys.exit(1)

def run_frontend():
    frontend_dir = ROOT_DIR / 'frontend'
    if not frontend_dir.exists():
        print(f"Error: Frontend directory not found at {frontend_dir}")
        sys.exit(1)
    
    print("Starting frontend server...")
    os.chdir(frontend_dir)
    try:
        subprocess.run([sys.executable, 'serve.py'], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Frontend server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print(f"Project root directory: {ROOT_DIR}")
    
    # Check if ports are already in use
    if is_port_in_use(5000):
        print("Error: Port 5000 is already in use. Please stop any running servers.")
        sys.exit(1)
    if is_port_in_use(8000):
        print("Error: Port 8000 is already in use. Please stop any running servers.")
        sys.exit(1)

    # Create threads for both servers
    backend_thread = Thread(target=run_backend, daemon=True)
    frontend_thread = Thread(target=run_frontend, daemon=True)

    try:
        print("Starting servers...")
        backend_thread.start()
        frontend_thread.start()
        
        # Wait for servers to start
        if not wait_for_port(5000):
            print("Error: Backend server failed to start on port 5000")
            sys.exit(1)
        if not wait_for_port(8000):
            print("Error: Frontend server failed to start on port 8000")
            sys.exit(1)

        print("\nServers are running!")
        print("Frontend: http://localhost:8000")
        print("Backend: http://localhost:5000")
        print("\nPress Ctrl+C to stop the servers")
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1) 