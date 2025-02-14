import http.server
import socketserver
import os
from pathlib import Path

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Ensure we're serving from the frontend directory
        super().__init__(*args, directory=str(Path(__file__).parent.absolute()), **kwargs)

def run_frontend():
    try:
        # Change to the frontend directory
        os.chdir(Path(__file__).parent.absolute())
        
        with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
            print(f"Frontend server started at http://localhost:{PORT}")
            httpd.serve_forever()
    except Exception as e:
        print(f"Error starting frontend server: {e}")
        raise

if __name__ == "__main__":
    run_frontend() 