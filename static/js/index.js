//HTML Effect 
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.style.display === "block") {
        modal.style.display = "none";
    } else {
        modal.style.display = "block";
        if (modalId === 'leaderboard-modal' && typeof loadLeaderboard === 'function') {
            loadLeaderboard();
        }
    }
}
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

//Get Localstorage Data
const storedId = localStorage.getItem("fighter_id");
const storedName = localStorage.getItem("fighter_name");
const storedColor = localStorage.getItem("fighter_color");

// If no Id exist then create one
let myId = storedId;
if (!myId) {
    myId = "player_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    localStorage.setItem("fighter_id", myId);
}


window.addEventListener('load', function () {
    if (storedName) {
        const nameInput = document.getElementById('username');
        if (nameInput) nameInput.value = storedName;
    }

    if (storedColor) {
        const colorInput = document.getElementById('userColor');
        if (colorInput) colorInput.value = storedColor;
    }

});

window.startGame = async function () {
    const nameInput = document.getElementById('username');
    const colorInput = document.getElementById('userColor');

    if (!nameInput || !colorInput) return;

    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) {
        alert("INSERT COIN (ENTER NAME)!");
        return;
    }

    //Save data in LocalStorage
    localStorage.setItem("fighter_name", name);
    localStorage.setItem("fighter_color", color);

    try {
        await fetch("/api/enter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playerId: myId,
                playerName: name,
                color: color,
                lastActive: Date.now()
            })
        });

        window.location.href = "/game"
    } catch (err) {
        console.error("Login failed:", err);
        alert("Server connection failed!");
    }
}

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="5">LOADING...</td></tr>';

    try {
        const res = await fetch("/api/get_players");
        const players = await res.json();

        tbody.innerHTML = '';

        if (players.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">NO DATA YET</td></tr>';
            return;
        }

        players.forEach((player, index) => {
            const tr = document.createElement('tr');


            const wins = player.wins || 0;
            const losses = player.losses || 0;
            const total = wins + losses;
            let ratio = "0%";
            if (total > 0) {
                ratio = Math.round((wins / total) * 100) + "%";
            }

            // 排名样式
            let rankDisplay = index + 1;
            if (index === 0) rankDisplay = "🏆 1ST";
            if (index === 1) rankDisplay = "🥈 2ND";
            if (index === 2) rankDisplay = "🥉 3RD";

            tr.innerHTML = `
                <td>${rankDisplay}</td>
                <td style="color: ${player.color || '#fff'}">${player.playerName || 'UNKNOWN'}</td>
                <td>${wins}</td>
                <td>${losses}</td>
                <td>${ratio}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Failed to load leaderboard:", err);
        tbody.innerHTML = '<tr><td colspan="5">ERROR LOADING DATA</td></tr>';
    }
}

//get player record
// async function loadPlayers() {
//     const res = await fetch("/api/get_players");
//     const players = await res.json();
//     console.log(players);
// }
// loadPlayers();