import socketserver
from http.server import BaseHTTPRequestHandler
import database as db
import json

class HttpServer(BaseHTTPRequestHandler):
	def do_POST(self):
		try:
			action = self.path.strip("/")
			query = json.loads(self.rfile.read(int(self.headers.get('Content-Length'))))
			if action == "createAccount":
				userInfo = db.createUser(query["name"], query["password"], query["inviteCode"])
				self.respondOK({"userID": userInfo[0], "token": userInfo[1]})
				return;
			
			if action == "login":
				userInfo = db.getTokenAndID(query["name"], query["password"])
				self.respondOK({"userID": userInfo[0], "token": userInfo[1]})
				return;
			
			if action == "logout":
				db.invalidateToken(query["userID"], query["token"])
				self.respondOK(None)
				return;
			
			if action == "verifyToken":
				self.respondOK({"verified": db.authenticateToken(query["userID"], query["token"])})
				return;
			
			if action == "createThread":
				self.respondOK({"threadID": db.createThread(query["userID"], query["token"], query["title"], query["content"])})
				return;
			
			if action == "createPost":
				self.respondOK({"postID": db.createPost(query["userID"], query["token"], query["threadID"], query["content"])})
				return;
			
			if action == "deletePost":
				self.respondOK({"deleted": db.deletePost(query["userID"], query["token"], query["postID"])})
				return;
			
			if action == "editPost":
				self.respondOK({"edited": db.editPost(query["userID"], query["token"], query["postID"], query["newContent"])})
				return;
			
			if action == "getThreads":
				threads = db.getThreads(query["userID"], query["token"], query["page"], 10)
				threadCount = db.getThreadCount(query["userID"], query["token"])
				self.respondOK({"threads": threads, "threadCount": threadCount})
				return;
			
			if action == "getPosts":
				self.respondOK({"posts": db.getPosts(query["userID"], query["token"], query["threadID"], query["page"], min(query["postsPerPage"], 50))})
				return;
			
			if action == "getUserPosts":
				self.respondOK({"posts": db.getUserPosts(query["userID"], query["token"], query["requestedUserID"], query["page"], 15)})
				return;
			
			if action == "getPostLocation":
				self.respondOK(db.getPostLocation(query["userID"], query["token"], query["postID"]))
				return;
			
			if action == "getUserInfo":
				self.respondOK({"user": db.getUserInfo(query["userID"], query["token"], query["requestedUserID"])})
				return;
			
			if action == "getForumInfo":
				self.respondOK(db.getForumInfo(query["userID"], query["token"]))
				return;
			
			if action == "getThreadInfo":
				self.respondOK({"thread": db.getThreadInfo(query["userID"], query["token"], query["threadID"])})
				return;
			
			if action == "subscribeToThread":
				self.respondOK({"subscribed": db.subscribeToThread(query["userID"], query["token"], query["threadID"])})
				return;
			
			if action == "unsubscribeFromThread":
				self.respondOK({"unsubscribed": db.unsubscribeFromThread(query["userID"], query["token"], query["threadID"])})
				return;
			
			if action == "getNotificationCount":
				self.respondOK({"count": db.getNotificationCount(query["userID"], query["token"])})
				return;
			
			if action == "getNotifications":
				self.respondOK({"notifications": db.getNotifications(query["userID"], query["token"], query["page"], min(query["postsPerPage"], 50))})
				return;
			
			if action == "removeNotification":
				self.respondOK({"removed": db.removeNotification(query["userID"], query["token"], query["notificationID"])})
				return;
			
			self.send_response(400)
			self.send_header("Access-Control-Allow-Origin", "*")
			self.send_header("Content-type", "application/json")
			self.end_headers()
			self.wfile.write(bytes(json.dumps({"error": "unknownAction"}), "utf-8"))
		except Exception as e:
			print(e)
			self.send_response(500)
			self.send_header("Access-Control-Allow-Origin", "*")
			self.send_header("Content-type", "application/json")
			self.end_headers()
			self.wfile.write(bytes(json.dumps({"error": "unknown error"}), "utf-8"))
	
	def respondOK(self, jsonData):
		self.send_response(200)
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Content-type", "application/json")
		self.end_headers()
		if jsonData != None:
			self.wfile.write(bytes(json.dumps(jsonData), "utf-8"))

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("localhost", 55731), HttpServer)
httpd.serve_forever()