# CART-351 PROJECT III
A lightweight browser-based 1v1 fighting game built with real-time networking.  
Players join from any device on the same network, choose a name and color, and battle in a fast-paced arena.  
Match results are tracked and stored, contributing to a persistent leaderboard over time.

---------------

## Overview
This project was created as part of a course exploring networked interaction and multiplayer systems.  
The goal was to build a game that feels immediate and responsive, while also maintaining a record of gameplay history.  
Although simple in mechanics, the system handles synchronization, real-time interaction, and shared state between two clients.

---------------

## Features

- **1v1 Real-Time Multiplayer**
- Fast and responsive controls
- Pixel-art character sprites
- Persistent leaderboard storing wins/losses in MongoDB
- Real-time hit detection and movement sync via Socket.IO
- Runs entirely in the browser with no installation required for clients

---------------

## Controls

| Action | Key |
|--------|-----|
| Move Left | **A** |
| Move Right | **D** |
| Attack | **J** |
| Jump | **K** |

---------------

## Tech Stack

| Component | Tool |
|----------|------|
| Backend | Flask |
| Realtime Communication | Socket.IO |
| Database | MongoDB |
| Frontend | HTML / CSS / JavaScript |
| Assets | Pixel character sprite from Luiz Melo (Itch.io) |

---------------


