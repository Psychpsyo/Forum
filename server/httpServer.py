import socketserver
from http.server import BaseHTTPRequestHandler
import database as db
import json

class HttpServer(BaseHTTPRequestHandler):
	def do_POST(self):
		try:
			query = json.loads(self.rfile.read(int(self.headers.get('Content-Length'))))
			if query["action"] == "createAccount":
				userInfo = db.createUser(query["name"], query["password"], query["inviteCode"])
				self.respondOK({"userID": userInfo[0], "token": userInfo[1]})
				return;
			
			if query["action"] == "login":
				userInfo = db.getTokenAndID(query["name"], query["password"])
				self.respondOK({"userID": userInfo[0], "token": userInfo[1]})
				return;
			
			if query["action"] == "logout":
				db.invalidateToken(query["userID"], query["token"])
				self.respondOK(None)
				return;
			
			if query["action"] == "verifyToken":
				isValid = db.authenticateToken(query["userID"], query["token"])
				self.respondOK({"verified": isValid})
				return;
			
			if query["action"] == "createThread":
				threadID = db.createThread(query["userID"], query["token"], query["title"], query["content"])
				self.respondOK({"threadID": threadID})
				return;
			
			if query["action"] == "createPost":
				postID = db.createPost(query["userID"], query["token"], query["threadID"], query["content"])
				self.respondOK({"postID": postID})
				return;
			
			if query["action"] == "deletePost":
				deleted = db.deletePost(query["userID"], query["token"], query["postID"])
				self.respondOK({"deleted": deleted})
				return;
			
			if query["action"] == "editPost":
				edited = db.editPost(query["userID"], query["token"], query["postID"], query["newContent"])
				self.respondOK({"edited": edited})
				return;
			
			if query["action"] == "getThreads":
				threads = db.getThreads(query["userID"], query["token"], query["page"], 10)
				threadCount = db.getThreadCount(query["userID"], query["token"])
				self.respondOK({"threads": threads, "threadCount": threadCount})
				return;
			
			if query["action"] == "getPosts":
				posts = db.getPosts(query["userID"], query["token"], query["threadID"], query["page"], min(query["postsPerPage"], 50))
				self.respondOK({"posts": posts})
				return;
			
			if query["action"] == "getUserPosts":
				posts = db.getUserPosts(query["userID"], query["token"], query["requestedUserID"], query["page"], 15)
				self.respondOK({"posts": posts})
				return;
			
			if query["action"] == "getPostLocation":
				postLocation = db.getPostLocation(query["userID"], query["token"], query["postID"])
				self.respondOK(postLocation)
				return;
			
			if query["action"] == "getUserInfo":
				user = db.getUserInfo(query["userID"], query["token"], query["requestedUserID"])
				self.respondOK({"user": user})
				return;
			
			if query["action"] == "getForumInfo":
				forumInfo = db.getForumInfo(query["userID"], query["token"])
				self.respondOK(forumInfo)
				return;
			
			if query["action"] == "getThreadInfo":
				thread = db.getThreadInfo(query["userID"], query["token"], query["threadID"])
				self.respondOK({"thread": thread})
				return;
			
			if query["action"] == "subscribeToThread":
				subscribed = db.subscribeToThread(query["userID"], query["token"], query["threadID"])
				self.respondOK({"subscribed": subscribed})
				return;
			
			if query["action"] == "unsubscribeFromThread":
				unsubscribed = db.unsubscribeFromThread(query["userID"], query["token"], query["threadID"])
				self.respondOK({"unsubscribed": unsubscribed})
				return;
			
			if query["action"] == "getNotificationCount":
				count = db.getNotificationCount(query["userID"], query["token"])
				self.respondOK({"count": count})
				return;
			
			if query["action"] == "getNotifications":
				notifs = db.getNotifications(query["userID"], query["token"], query["page"], min(query["postsPerPage"], 50))
				self.respondOK({"notifications": notifs})
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