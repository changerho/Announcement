from http.server import SimpleHTTPRequestHandler
import socketserver
import os
import json
import importlib
import parse_data

PORT = 8000

class DashboardRequestHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/refresh':
            try:
                print("Received update request. Re-parsing Web Data.txt & Excel data...")
                importlib.reload(parse_data)
                parse_data.main()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
                self.end_headers()
                
                response = {
                    "status": "success",
                    "message": "資訊源最新資料已即時更新完成！"
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                print("Data update complete.")
            except Exception as e:
                print(f"Error updating data: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {
                    "status": "error",
                    "message": f"更新失敗: {str(e)}"
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

socketserver.TCPServer.allow_reuse_address = True
try:
    # Auto-run parser logic on server startup
    print("Initializing dashboard data from Web Data.txt...")
    parse_data.main()
    
    with socketserver.TCPServer(("", PORT), DashboardRequestHandler) as httpd:
        print(f"Dashboard server running on http://localhost:{PORT}")
        httpd.serve_forever()
except Exception as e:
    print(f"Failed to start server: {e}")

