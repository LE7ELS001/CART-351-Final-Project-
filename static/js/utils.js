//global variables 
const spawn_positionsX_left = 100;
const spawn_positionsX_right = 874;

const p_height = 150;
const p_width = 50;

const collisionBoxOffsetY = 30;

//dectect for collision 
function rectCollision({ rect1, rect2 }) {
    return (
        rect1.position.x + rect1.width >= rect2.position.x &&
        rect1.position.x <= rect2.position.x + rect2.width &&
        rect1.position.y + rect1.height >= rect2.position.y &&
        rect1.position.y <= rect2.position.y + rect2.height
    )
}

//update health bar
function updateHealthBar(id, hp) {
    const percent = Math.max(hp, 0);

    const targetPlayer = players[id];

    if (targetPlayer && targetPlayer.side === 'left') {
        //my health bar 
        document.getElementById('hp-left').style.width = percent + '%';
    } else {
        //other player's health bar
        document.getElementById('hp-right').style.width = percent + '%';
    }
}

//assign health bar 
function updateUIForSide(side) {
    const leftUI = document.getElementById('hp-left');
    const rightUI = document.getElementById('hp-right');

    if (side === 'left') {
        leftUI.style.opacity = 1;
        rightUI.style.opacity = 0.5;
    }
    else {
        leftUI.style.opacity = 0.5;
        rightUI.style.opacity = 1;
    }
}

//UI update 
function updateNameTag(side, name) {
    const displayName = name || "Unknown";

    if (side === "left") {
        document.querySelector('.name-left').innerText = displayName;
    } else if (side === 'right') {
        document.querySelector('.name-right').innerText = displayName;
    }
}

