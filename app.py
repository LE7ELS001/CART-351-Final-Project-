import time
import pymongo

from threading import Thread
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from pymongo import MongoClient




app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


# MongoDB user and password
DB_user = "EricP"
DB_password = "CART351Final"

#playerId and sid mapping
connected_players = {}

#player health 
player_hp = {}

#current match map
current_match_map = None

#spawn position 
spawn_positionsX_left = 100
spawn_positionsX_right = 700

#Timer 
game_timer = 60
game_timer_refresh = 60
game_active = False
timer_running = False
timer_thread = None

# Connect to MongoDB
client = MongoClient(f"mongodb+srv://{DB_user}:{DB_password}@cluster0.cqzgv05.mongodb.net/?appName=Cluster0")
DB_data = client["CART351"]
DB_Player = DB_data["FinalProject"]


#------------- update win and loss number --------------
def record_win_loss(winner_id, loser_id):
    #print(f"Update state: Winner({winner_id}) ///// Loser({loser_id})")

    if winner_id:
        DB_Player.update_one(
            {"playerId": winner_id},
            {"$inc": {"wins": 1}}
        )

    if loser_id: 
        DB_Player.update_one(
            {"playerId": loser_id},
            {"$inc": {"losses": 1}}
        )


#------------- reset game ----------------
def reset_round_state():
    global game_active, player_hp, current_match_map

    print('---------- Reset game to next round ---------')
    player_hp.clear()
    current_match_map = None

    for sid, player in list(connected_players.items()):
        if(player['side'] in ['left', 'right']):
            player['side'] = 'spectator'

#------------- Timer function -------------
def run_timer():
    global game_timer, game_active,timer_running
    print("----- Timer Thread Started -----")


    try:
        socketio.emit('game_state', {'active': False})

        #reset players position 
        socketio.emit('reset_positions')
    

        # prepare phase 
        for i in range(5,0,-1):
            print(f"Preparation: {i}")

            socketio.emit('timer_update', {"time": f"{i}"})
            time.sleep(1)


        # game start
        socketio.emit("game_state", {"active": True})
        print("Go")
        socketio.emit("timer_update", {"time": "GO!"})
        game_active = True
        # update frontend game state

        # 60s countdown
        game_timer = game_timer_refresh
        while game_timer > 0 and game_active:
            time.sleep(1)

            if not game_active:
                break

            game_timer -= 1
            socketio.emit('timer_update', {"time": game_timer})

            #debug
            # print(f"Counting down: {game_timer}")
    
        # game end
        if game_timer <= 0:
            print("----- Time's up -----")
            socketio.emit('timer_update', {"time": "TIME"})

            game_active = False
            socketio.emit("game_state", {"active": False})

            #get the player in the fight
            left_player = None
            right_player = None

            for p in connected_players.values():
                if p['side'] == 'left':
                    left_player = p
                elif p['side'] == 'right':
                    right_player = p

            if left_player and right_player:
                left_player_hp = player_hp.get(left_player['playerId'], 100)
                right_player_hp = player_hp.get(right_player['playerId'], 100)

                if left_player_hp > right_player_hp:
                    record_win_loss(left_player['playerId'], right_player['playerId'])
                    socketio.emit('game_over', {
                        "result": "win",
                        "winner": left_player['playerName'],
                        "winnerId": left_player['playerId'],
                        "message": f"{left_player['playerName']} WINS" 
                    })
                elif left_player_hp < right_player_hp:
                    record_win_loss(right_player['playerId'], left_player['playerId'])
                    socketio.emit('game_over', {
                        "result": "win",
                        "winner": right_player['playerName'],
                        "winnerId": right_player['playerId'],
                        "message":f"{right_player['playerName']} WINS"
                    })
                else: 
                    socketio.emit('game_over', {
                        "result": "draw", 
                        "message": "TIME UP! Draw Game"
                    })
            else: 
                socketio.emit('game_over', {"result": "draw", "message": "TIME UP"})

            reset_round_state()
    except Exception as e:
        print('------- Timer Thread error: {e} ---------')

    finally:
        print("---------- Timer Thread Ended ------------")
        timer_running = False
   
#-----------------------------------------

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
            "playerName": data.get("playerName"),
            "color": data["color"],
            "lastActive": data["lastActive"]
        },
        "$setOnInsert": {
            "wins": 0,
            "losses": 0
        }

        },
        upsert=True
    )

    return jsonify({"status": "ok"})

#get player record 
@app.route("/api/get_players")
def get_players():
    data = list(DB_Player.find({}, {"_id": 0}).sort('wins', -1).limit(10))
    return jsonify(data)
#-----------------------------------

#------------ socketIO ----------------

@socketio.on("connect")
def on_connect():
    print("A player connected:", request.sid)

@socketio.on("join")
def on_join(data):
    
    global timer_running, current_match_map

    playerId = data["playerId"]
    playerName = data.get("playerName", "Unknown")
    playerColor = data.get("color", "#ffffff")
    playerMap = data.get("map", "Arizona Desert, U.S.A.mp4")

    sid = request.sid

    #Assign player 
    active_sides = []

    for player_data in connected_players.values():
        if player_data['side'] == 'left' or player_data['side'] == 'right':
            active_sides.append(player_data['side'])

    #set player as spectator in default
    assigned_side = 'spectator'
    #move them outside the screen
    spawn_x = -10000

    #assign spawn position
    if 'left' not in active_sides:
        assigned_side = "left"
        spawn_x = spawn_positionsX_left
        current_match_map = playerMap    
    elif 'right' not in active_sides:
        assigned_side = "right"
        spawn_x = spawn_positionsX_right

    connected_players[sid] = {
        "playerId": playerId,
        "playerName": playerName,
        "color": playerColor,
        "x": spawn_x,
        "y": data["y"],
        "side": assigned_side
    }

    #send assigned side and spawn postition
    emit("assign_side", {
        "playerId": playerId,
        "name": playerName,
        "color": playerColor,
        "side": assigned_side,
        "x": spawn_x,
        "y": 0
    }, to=sid)

    #send map to second player
    if current_match_map:
        emit("set_map", {"map": current_match_map}, to=sid)
    
    if assigned_side != 'spectator':
        player_hp[playerId] = 100

    #debug
    #print("Player joined:", data["playerId"], "||with SID:", sid)
    print(f"Player joined: {playerName} ({assigned_side})")
    if current_match_map:
        print(f"Current match map: {current_match_map}")

    # send existing players to the newly connected player
    emit("existing_players", list(connected_players.values()), to=sid)

    # 
    join_data = {
        "playerId": playerId,
        "playerName": playerName,
        "x": spawn_x,
         "color": playerColor,
        "y": 0,
        "side": assigned_side 
    }

    #send new join to other players
    emit("player_join", join_data, broadcast=True, include_self=False)

    #Timer 
    fighter_count = 0
    for p in connected_players.values():
        if p['side'] == 'left' or p['side'] == 'right':
            fighter_count += 1
            
    if fighter_count == 2 and not timer_running:
        print("Two fighters ready. Starting timer thread...")
        timer_running = True
        Thread(target=run_timer).start()

@socketio.on("player_move")
def on_player_move(data):

    if not game_active: return 

    emit("player_move", data, broadcast=True, include_self=False)

@socketio.on("state_change")
def on_state_change(data):
    #debug
    player_id = data["playerId"]
    state = data["state"]

    
    emit("state_change", data, broadcast=True, include_self=False)

@socketio.on("player_attack")
def on_player_attack(data):
   
    emit("player_attack", data, broadcast=True, include_self=False)

@socketio.on("player_hit")
def on_player_hit(data):
    global game_active
    if not game_active: return

    attacker = data["attacker"]
    target = data["target"]
    damage = data["damage"]

    # initialize target HP if not exists
    if target not in player_hp:
        player_hp[target] = 100

    if attacker not in player_hp:
        player_hp[attacker] = 100

    # reduce target HP
    player_hp[target] -= damage
    if player_hp[target] < 0:
        player_hp[target] = 0

    # debug
    print(f"{attacker} hit {target}! New HP: {player_hp[target]}")

    emit("update_hp", {
        "playerId": target,
        "hp": player_hp[target]
    }, broadcast=True)

    # win/loss condition
    dead_players = []

    for pid, hp in player_hp.items():
        if hp <= 0:
            dead_players.append(pid)
 
    if len(dead_players) > 0 :
        game_active = False
        socketio.emit('game_state', {'active': False})

        result_type = ""
        winner_name = ""

        attacker_name = "Unknown"
        target_name = "Unknown"

        #Iterate connected_players take the ID as key and name as value and id_to_name is a dict
        id_to_name = {p['playerId']: p['playerName'] for p in connected_players.values()}

        attacker_name = id_to_name.get(attacker, "Unknown")
        target_name = id_to_name.get(target, "Unknown")

        target_dead = player_hp[target] <= 0
        attacker_dead = player_hp.get(attacker, 0) <= 0 
        #Both Loss
        if target_dead and attacker_dead:
            result_type = "Draw"
            print('Game Over: Draw')
            socketio.emit('game_over', {"result" : "draw", "message": "Draw Game"})

        elif target_dead :
            result_type = 'win'
            print(f"Game over: {attacker} wins")
            record_win_loss(attacker, target) 
            socketio.emit('game_over', {"result": "win", "winner": attacker_name, "winnerId": attacker, "message": f'{attacker_name} WINS'})
    
        reset_round_state()

@socketio.on("disconnect")
def on_disconnect():
    global game_active

    sid = request.sid
    if sid in connected_players:
        player_data = connected_players[sid]
        playerId = player_data['playerId']
        print(f"Player disconnected: {playerId}")

        if playerId in player_hp:
            del player_hp[playerId]

        del connected_players[sid]
        emit("player_leave", {"playerId": playerId}, broadcast=True)

        if game_active and (player_data['side'] == 'left' or player_data['side'] == 'right'):
            print(f'Active Player {playerId} disconnected. Stop the game')
        
            game_active = False
            socketio.emit('game_state', {"active": False})

            if player_data['side'] == 'left':
                winner_side = 'right'
            elif player_data['side'] == 'right':
                winner_side = 'left'

            winner_data = None
            for p in connected_players.values():
                if p['side'] == winner_side:
                    winner_data = p
                    break

            if winner_data: 
                print(f'Game Forfeit. Winner: {winner_data['playerName']}')
                record_win_loss(winner_data['playerId'], playerId) 
                socketio.emit('game_over', {
                    'result': 'win',
                    'winner': winner_data['playerName'],
                    'winnerId': winner_data['playerId'],
                    'message': "OPPONENT DISCONNECTED"
                })
        
            reset_round_state()


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