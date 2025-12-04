let myId = localStorage.getItem("fighter_id");
let myName = localStorage.getItem("fighter_name");


if (!myId) {
    myId = "player_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    localStorage.setItem("fighter_id", myId);
}
if (!myName) {
    myName = "Unknown Warrior";
}

const playerId = myId;
const playerName = myName;
const playerColor = localStorage.getItem("fighter_color") || '#ffffff';

const socket = io();


const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

spawn_positionsX_left = 100;
spawn_positionsX_right = 700;

p_height = 150;
p_width = 50;

c.fillRect(0, 0, canvas.width, canvas.height);

//players 
const gravity = 0.3;
const moveSpeed = 3;
const jumpDistance = 12;
const damage = 20;

//game state
let isGameActive = true;

let isMatchEnded = false;


//background
const backgroundImage = new Image();
backgroundImage.src = '/static/assets/background/background.png';

const SAMURAI_CONFIG = {
    imageSrc: '/static/assets/character/Idle.png',
    framesMax: 8,
    offset: {
        x: 273,
        y: 217
    },
    scale: 3,
    sprites: {
        idle: {
            imageSrc: '/static/assets/character/Idle.png',
            framesMax: 8,
        },
        run: {
            imageSrc: '/static/assets/character/Run.png',
            framesMax: 8,
        },
        jump: {
            imageSrc: '/static/assets/character/Jump.png',
            framesMax: 2,
        },
        fall: {
            imageSrc: '/static/assets/character/Fall.png',
            framesMax: 2,
        },
        attack: {
            imageSrc: '/static/assets/character/Attack.png',
            framesMax: 6,
        },
        takeHit: {
            imageSrc: '/static/assets/character/Take Hit.png',
            framesMax: 4
        },
        death: {
            imageSrc: '/static/assets/character/Death.png',
            framesMax: 6
        }
    }

}

//players list 
let players = {};



players[playerId] = new Player({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    color: playerColor,
    ...SAMURAI_CONFIG
    // offset: {
    //     x: 215,
    //     y: 280
    // },

    // scale: 3,
    // sprites: {
    //     idle: {
    //         imageSrc: '/static/assets/character/Idle.png',
    //         framesMax: 8,
    //     },
    //     run: {
    //         imageSrc: '/static/assets/character/Run.png',
    //         framesMax: 8,
    //     }
    // }


});



//--------------- socket events ---------------

socket.emit("join", {
    playerName: playerName,
    playerId: playerId,
    color: playerColor,
    x: players[playerId].position.x,
    y: players[playerId].position.y,

});

// send the initial position
socket.emit("player_move", {
    playerId: playerId,
    x: players[playerId].position.x,
    y: players[playerId].position.y,
    vx: players[playerId].velocity.x,
    vy: players[playerId].velocity.y
});

socket.on("assign_side", ({ playerId, side, x, y, name, color }) => {
    const me = players[playerId];
    me.side = side;
    me.position.x = x;
    me.position.y = y;
    me.name = name;

    //debug 
    console.log("Assigned side is :", side);

    updateUIForSide(side);

    updateNameTag(side, name);
});

//new player joined 
socket.on("player_join", (data) => {
    if (!players[data.playerId]) {
        players[data.playerId] = new Player({
            position: { x: data.x, y: data.y },
            velocity: { x: 0, y: 0 },
            color: data.color,
            ...SAMURAI_CONFIG
            // imageSrc: '/static/assets/character/Idle.png',
            // framesMax: 8,
            // scale: 3,
            // offset: {
            //     x: 215,
            //     y: 280
            // }
        });
        players[data.playerId].side = data.side;
        players[data.playerId].name = data.playerName;

        updateNameTag(data.side, data.playerName);
    }
});

socket.on("player_move", (data) => {
    if (data.playerId === playerId) return;

    if (players[data.playerId]) {
        players[data.playerId].position.x = data.x;
        players[data.playerId].position.y = data.y;
        players[data.playerId].velocity.x = data.vx;
        players[data.playerId].velocity.y = data.vy;
    }
});

socket.on("existing_players", (playersList) => {
    playersList.forEach(p => {
        if (!players[p.playerId]) {
            players[p.playerId] = new Player({
                position: { x: p.x, y: p.y },
                velocity: { x: 0, y: 0 },
                color: p.color,
                ...SAMURAI_CONFIG
                // imageSrc: '/static/assets/character/Idle.png',
                // framesMax: 8,
                // scale: 3,
                // offset: {
                //     x: 215,
                //     y: 280
                // }
            });
            players[p.playerId].side = p.side;
            players[p.playerId].name = p.playerName;

            updateNameTag(p.side, p.playerName);
        }
    });
});

socket.on("player_leave", (data) => {
    if (!isMatchEnded) {
        delete players[data.playerId];
    }
});

socket.on("state_change", ({ playerId, state }) => {
    if (players[playerId]) {
        players[playerId].setState(state);
    }
});

socket.on('player_attack', ({ playerId }) => {
    if (players[playerId]) {
        players[playerId].attack();
    }
})

socket.on("update_hp", ({ playerId, hp }) => {
    if (players[playerId]) {
        players[playerId].health = hp;
        updateHealthBar(playerId, hp);

        if (hp <= 0) {
            players[playerId].setState('death');
        } else {
            players[playerId].setState('takeHit');
        }
        //console.log("Updated HP:", playerId, hp);
    }
});

socket.on("reset_positions", () => {

    isMatchEnded = false;

    document.getElementById("result-overlay").style.display = "none";
    document.getElementById("result-title").classList.remove("title-victory", "title-defeat", "title-draw");


    for (const id in players) {
        if (Object.hasOwnProperty.call(players, id)) {
            const player = players[id];


            player.velocity.x = 0;
            player.velocity.y = 0;
            player.setState("idle");


            if (player.side === 'left') {
                player.position.x = spawn_positionsX_left;
                player.facing = 'right';
            } else if (player.side === 'right') {
                player.position.x = spawn_positionsX_right;
                player.facing = 'left';
            }


            player.position.y = 0;

            updateHealthBar(id, 100);
        }
    }
});

//game active state 
socket.on("game_state", (data) => {

    //debug
    console.log("Game active state:", data.active);

    isGameActive = data.active;

    if (!isGameActive) {
        //stop all the player and reset the state to idle
        Object.values(players).forEach(player => {
            player.velocity.x = 0;
            player.velocity.y = 0;
            player.setState("idle");
        });
    }

})

// timer
socket.on("timer_update", (data) => {
    const timerElement = document.getElementById("Timer");

    if (timerElement) {
        timerElement.innerText = data.time;

        if (typeof data.time === 'number') {
            timerElement.style.fontSize = '40px';
            timerElement.style.color = 'white';
        } else {
            timerElement.style.fontSize = '20px';
            timerElement.style.color = 'yellow';
        }
    }


})

//game over 
socket.on("game_over", (data) => {

    isGameActive = false;

    isMatchEnded = true;

    setTimeout(() => {

        const overlay = document.getElementById("result-overlay");
        const title = document.getElementById("result-title");
        const subtitle = document.getElementById("result-subtitle");
        const returnBtn = document.querySelector(".btn-return");

        overlay.style.display = "flex";

        title.classList.remove("title-victory", "title-defeat", "title-draw");

        if (data.result === "draw") {
            title.innerText = "DRAW GAME";
            title.classList.add("title-draw");
            subtitle.innerText = "NO WINNER";
        } else {
            if (data.winnerId === playerId) {
                title.innerText = "YOU WIN";
                title.classList.add("title-victory");
            } else {
                title.innerText = "YOU LOSE";
                title.classList.add("title-defeat");
            }

            if (data.message) {
                subtitle.innerText = data.message.toUpperCase();
            } else {
                const winnerName = data.winner ? data.winner.toUpperCase() : 'UNKNOWN';
                subtitle.innerText = `WINNER: ${winnerName}`;
            }
        }

        socket.disconnect();

        let countdown = 5;

        returnBtn.innerText = `< MAIN MENU (${countdown}) >`;
        const timerInterval = setInterval(() => {
            countdown--;

            returnBtn.innerText = `< MAIN MENU (${countdown}) >`;

            if (countdown <= 0) {
                clearInterval(timerInterval);
                window.location.href = '/';
            }
        }, 1000);
    }, 500)


});



//debug
// console.log(player);


//keys
const keys = {
    a: {
        pressed: false
    },

    d: {
        pressed: false
    },
    j: {
        pressed: false
    }


}

let lastState = players[playerId].state;

function animate() {
    window.requestAnimationFrame(animate);
    // c.fillStyle = 'black';
    // c.fillRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) {
        c.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    //find the two actual players 
    const fighters = Object.values(players).filter(p => p.side === 'left' || p.side === 'right');

    if (fighters.length == 2) {
        const p1 = fighters[0];
        const p2 = fighters[1];

        const p1Center = p1.position.x + p1.width / 2;
        const p2Center = p2.position.x + p2.width / 2;

        if (p1Center < p2Center) {
            p1.facing = 'right';
            p2.facing = 'left';
        } else {
            p1.facing = 'left';
            p2.facing = 'right';
        }

    }


    Object.values(players).forEach(player => player.update());

    const me = players[playerId];

    //detect for collision 
    if (me.isAttacking && me.frameCurrent === 4 && !me.hasHitThisFrame) {

        me.hasHitThisFrame = true;

        for (const id in players) {
            if (id === playerId) continue;

            const enemy = players[id];
            if (rectCollision({ rect1: me.attackBox, rect2: enemy })) {
                socket.emit("player_hit", {
                    attacker: playerId,
                    target: id,
                    damage: damage
                });
                // me.isAttacking = false;
                console.log('Hit', id);
            }


        }
    }

    if (me.frameCurrent !== 4) {
        me.hasHitThisFrame = false;
    }

    if (socket.connected) {
        socket.emit("player_move", {
            playerId: playerId,
            x: me.position.x,
            y: me.position.y,
            vx: me.velocity.x,
            vy: me.velocity.y
        });
    }

    if (me.state !== lastState) {
        socket.emit("state_change", {
            playerId: playerId,
            state: me.state
        });
        lastState = me.state;
    }
}



animate();

window.addEventListener('keydown', (event) => {

    //game active check 
    if (!isGameActive) return;

    const me = players[playerId];

    switch (event.key) {
        case 'd':
            //move right
            keys.d.pressed = true;
            me.lastKey = 'd';
            me.setState("run");
            break;

        case 'a':
            //move left
            keys.a.pressed = true;
            me.lastKey = 'a';
            me.setState("run");
            break;

        case 'k':
            //jump distance
            if (me.velocity.y === 0) {
                me.velocity.y = -jumpDistance;
                me.setState("jump");
            }
            break;
        case 'j':
            //attack
            // me.attack();
            if (!keys.j.pressed) {
                me.attack();

                socket.emit('player_attack', { playerId: playerId });

                keys.j.pressed = true;
            }
            break;


    }
    console.log(event.key);
})

window.addEventListener('keyup', (event) => {
    const me = players[playerId];

    if (event.key === "j") {
        keys.j.pressed = false;
    }

    if (event.key === "a" || event.key === "d") {
        keys[event.key].pressed = false;

        if (!keys.a.pressed && !keys.d.pressed) {
            me.setState("idle");
        }
    }
});

setInterval(() => {
    const player = players[playerId];

    if (!isGameActive) {
        player.velocity.x = 0;
        return;
    }

    //move speed 
    player.velocity.x = 0;
    if (keys.a.pressed && player.lastKey === 'a') {
        player.velocity.x = -moveSpeed;
    } else if (keys.d.pressed && player.lastKey === 'd') {
        player.velocity.x = moveSpeed;
    }
}, 16);

