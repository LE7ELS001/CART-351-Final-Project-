function getVideoPath(fileName) {
    return `/static/assets/background/${fileName}`;
}

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

    // Warrior selection
    let selectedWarrior = 'A';
    let selectedColor = '#ff0000';
    
    if (storedColor) {
        // Find matching warrior or default to A
        const warriorBtns = document.querySelectorAll('.warrior-btn');
        let found = false;
        warriorBtns.forEach(btn => {
            if (btn.dataset.color === storedColor) {
                selectedWarrior = btn.dataset.warrior;
                selectedColor = storedColor;
                btn.classList.add('selected');
                found = true;
            } else {
                btn.classList.remove('selected');
            }
        });
        if (!found && warriorBtns[0]) {
            warriorBtns[0].classList.add('selected');
        }
    }
    
    // Warrior button click handlers
    document.querySelectorAll('.warrior-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.warrior-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedWarrior = btn.dataset.warrior;
            selectedColor = btn.dataset.color;
        });
    });

    const bgVideo = document.getElementById("bg-video");
    const mapCards = document.querySelectorAll(".map-card");

    let currentMap = localStorage.getItem("fighter_map") || "Arizona Desert, U.S.A.mp4";

    if (bgVideo) {
        bgVideo.src = getVideoPath(currentMap);
        bgVideo.load();
    }

    mapCards.forEach(card => {
        const mapFile = card.dataset.map;
        const cardVideo = card.querySelector('video');
        
        if (cardVideo) {
            cardVideo.load();
            
            cardVideo.addEventListener('loadedmetadata', function() {
                cardVideo.currentTime = 3; 
            }, { once: true });
            

            cardVideo.addEventListener('seeked', function() {
                cardVideo.pause();
            }, { once: true });
        }
        
        if (mapFile === currentMap) {
            card.classList.add("selected");
        }
        
  
        card.addEventListener("click", () => {
            currentMap = mapFile;
            localStorage.setItem("fighter_map", currentMap);

   
            mapCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
        });

        card.addEventListener("mouseenter", () => {
            if (cardVideo) {
                cardVideo.muted = false;  
                cardVideo.volume = 0.5;   
                cardVideo.currentTime = 0; 
                cardVideo.play().catch(err => console.warn("Video hover blocked:", err));
            }
        });

        card.addEventListener("mouseleave", () => {
            if (cardVideo) {
                cardVideo.pause();
                cardVideo.muted = true;
                cardVideo.currentTime = 3;  
            }
        });
    });
});


window.startGame = async function () {
    const nameInput = document.getElementById('username');

    if (!nameInput) return;

    const name = nameInput.value.trim();
    const selectedBtn = document.querySelector('.warrior-btn.selected');
    const color = selectedBtn ? selectedBtn.dataset.color : '#ff0000';
    const warrior = selectedBtn ? selectedBtn.dataset.warrior : 'A';

    if (!name) {
        alert("INSERT COIN (ENTER NAME)!");
        return;
    }

    //Save data in LocalStorage
    localStorage.setItem("fighter_name", name);
    localStorage.setItem("fighter_color", color);
    localStorage.setItem("fighter_warrior", warrior);

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

//get player record
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



// ========== INTRO LOGIC ==========
let introActive = true;
let bgmStarted = false;

window.addEventListener("DOMContentLoaded", () => {
    const intro = document.getElementById("sf-intro");
    const introBgm = document.getElementById("intro-bgm");  
    const bgVideo = document.getElementById("bg-video");    
    const subText = document.querySelector(".sf-sub");
    const logo = document.querySelector(".sf-logo");
    const crt = document.getElementById("crt-overlay");
    const copyright = document.getElementById("sf-copyright");

    if (introBgm) {
        introBgm.volume = 0.3;
    }

    if (!intro) return;

    function handleIntroInteraction() {
        if (!bgmStarted) {
            bgmStarted = true;

            if (introBgm) {
                introBgm.play().catch(err => console.warn("Intro BGM blocked:", err));
            }

            if (copyright) {
                copyright.classList.add("show");
            }

            if (subText) {
                subText.textContent = "PRESS ANY KEY";
                subText.classList.add("sub-on");
            }

            if (logo) {
                logo.classList.add("logo-on");
            }

            if (intro) {
                intro.classList.add("intro-on");
            }

            if (crt) {
                crt.classList.add("crt-on");
            }

            return;
        }

        if (introActive) {
            introActive = false;

            intro.classList.add("fade-out");
            setTimeout(() => {
                intro.style.display = "none";
                
                const uiContainer = document.querySelector('.ui-container');
                if (uiContainer) {
                    uiContainer.classList.add('show');
                }
            }, 600);

            if (crt) {
                crt.classList.remove("crt-on");
            }

            if (introBgm) {
                introBgm.pause();
                introBgm.currentTime = 0;
            }
        }
    }

    window.addEventListener("keydown", () => {
        if (!introActive) return;
        handleIntroInteraction();
    });

    window.addEventListener("click", () => {
        if (!introActive) return;
        handleIntroInteraction();
    });
});