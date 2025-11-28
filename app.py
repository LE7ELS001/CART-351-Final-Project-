from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from pymongo import MongoClient




app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


# MongoDB user and password
DB_user = "EricP"
DB_password = "CART351Final"


# Connect to MongoDB
client = MongoClient(f"mongodb+srv://{DB_user}:{DB_password}@cluster0.cqzgv05.mongodb.net/?appName=Cluster0")
DB_data = client["CART351"]
DB_Player = DB_data["FinalProject"]

#------------ flask -------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game")
def game():
    return render_template("game.html")
#-------------------------------------


#---------- MongoDB --------------
@app.route("/api/enter", methods=["POST"])
def enter():
    data = request.json

    DB_Player.update_one(
        {"playerId": data["playerId"]},
        {"$set": {
            "playerId": data["playerId"],
            "color": data["color"],
            "lastActive": data["lastActive"]
        }},
        upsert=True
    )

    return jsonify({"status": "ok"})

#get player record 
@app.route("/api/get_players")
def get_players():
    data = list(DB_Player.find({}, {"_id": 0}))
    return jsonify(data)
#-----------------------------------

#------------ socketIO ----------------
@socketio.on("connect")
def on_connect():
    print("A player connected:", request.sid)

@socketio.on("disconnect")
def on_disconnect():
    print("A player disconnected:", request.sid)

# @socketio.on("player_move")
# def on_player_move(data):
#     emit("player_move", data, broadcast=True)

#Test MongoDB connection
# @app.route("/test_db")
# def test_db():
#     try:
#         data = list(DB_Player.find())
#         print("DB connected successfully!")
#         print("Current documents: ", data)

#         return {"status": "ok", "documents": data}

#     except Exception as e:
#         print("DB connection failed:", e)
#         return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
# app.run(debug=True)