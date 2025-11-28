fetch("/api/enter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        playerId: "abc123",
        color: "red",
        lastActive: Date.now()
    })
});

async function loadPlayers() {
    const res = await fetch("/api/get_players");
    const players = await res.json();
    console.log(players);
}
loadPlayers();