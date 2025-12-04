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

    if (storedColor) {
        const colorInput = document.getElementById('userColor');
        if (colorInput) colorInput.value = storedColor;
    }

    const bgVideo = document.getElementById("bg-video");
    const mapCards = document.querySelectorAll(".map-card");

    let currentMap = localStorage.getItem("fighter_map") || "Arizona Desert, U.S.A.mp4";

    // 预加载背景视频但不播放
    if (bgVideo) {
        bgVideo.src = getVideoPath(currentMap);
        bgVideo.load();
    }

    // ⭐ 让所有地图卡片的视频显示随机帧（静态预览）
    mapCards.forEach(card => {
        const mapFile = card.dataset.map;
        const cardVideo = card.querySelector('video');
        
        // 设置视频显示随机帧作为静态预览
        if (cardVideo) {
            cardVideo.load();
            
            // 等待视频元数据加载完成后，跳到随机时间点
            cardVideo.addEventListener('loadedmetadata', function() {
                // 生成随机时间点（视频总时长的 10%-90%）
                const duration = cardVideo.duration;
                const randomTime = duration * (0.1 + Math.random() * 0.8);
                cardVideo.currentTime = randomTime;
            }, { once: true });
            
            // 确保视频暂停在随机帧
            cardVideo.addEventListener('seeked', function() {
                cardVideo.pause();
            }, { once: true });
        }
        
        if (mapFile === currentMap) {
            card.classList.add("selected");
        }
        
        // 点击选择地图
        card.addEventListener("click", () => {
            currentMap = mapFile;
            localStorage.setItem("fighter_map", currentMap);

            // 更新选中状态
            mapCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
        });

        // ⭐ 鼠标悬停：播放动态视频 + 音频
        card.addEventListener("mouseenter", () => {
            if (cardVideo) {
                cardVideo.muted = false;  // 取消静音
                cardVideo.volume = 0.5;   // 音量 50%
                cardVideo.currentTime = 0; // 从头播放
                cardVideo.play().catch(err => console.warn("Video hover blocked:", err));
            }
        });

        // ⭐ 鼠标离开：暂停在新的随机帧（恢复静态）
        card.addEventListener("mouseleave", () => {
            if (cardVideo) {
                // 停止播放并跳到新的随机帧
                cardVideo.pause();
                cardVideo.muted = true;
                
                const duration = cardVideo.duration;
                const randomTime = duration * (0.1 + Math.random() * 0.8);
                cardVideo.currentTime = randomTime;
            }
        });
    });
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
    const introBgm = document.getElementById("intro-bgm");  // Intro 专用 BGM
    const bgVideo = document.getElementById("bg-video");    // 地图视频（不在 Intro 播放）
    const subText = document.querySelector(".sf-sub");
    const logo = document.querySelector(".sf-logo");
    const crt = document.getElementById("crt-overlay");
    const copyright = document.getElementById("sf-copyright");

    // ⭐ 设置 Intro BGM 音量为 50%
    if (introBgm) {
        introBgm.volume = 0.5;
    }

    if (!intro) return;

    function handleIntroInteraction() {
        // 第一次点击：播放 Intro BGM
        if (!bgmStarted) {
            bgmStarted = true;

            // ⭐ 只播放 Intro BGM（音量 50%），不播放地图视频
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

        // 第二次点击：进入登录界面
        if (introActive) {
            introActive = false;

            intro.classList.add("fade-out");
            setTimeout(() => {
                intro.style.display = "none";
                
                // ⭐ 显示登录界面
                const uiContainer = document.querySelector('.ui-container');
                if (uiContainer) {
                    uiContainer.classList.add('show');
                }
            }, 600);

            if (crt) {
                crt.classList.remove("crt-on");
            }

            // ⭐ 停止 Intro BGM
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