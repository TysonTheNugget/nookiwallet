import Phaser from 'phaser';
import React, { useRef, useEffect } from 'react';
import WebSocketManager from '../utils/WebSocketManager';
import { updateGame, handleWebSocketMessage } from './GameHandlers';

function Game() {
  const gameRef = useRef(null);
  const playerId = useRef(WebSocketManager.generatePlayerId()); // Generate a unique ID for the player
  const playerRef = useRef(null); // Local player reference
  const otherPlayers = useRef({}); // To store other players
  const sceneRef = useRef(null); // Store a reference to the Phaser scene

  const lastUpdateTime = useRef(0); // To control the update interval

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 1500, // Adjusted to the size of the background map
      height: 850,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
          setBounds: { x: 0, y: 0, width: 1500, height: 850 } // Set world bounds to match the background map size
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: (time, delta) => updateGame(time, delta, playerRef.current, sceneRef.current, lastUpdateTime, playerId.current, otherPlayers.current)
      }
    };

    const game = new Phaser.Game(config);

    function preload() {
      this.load.image('map', 'assets/map.png');
      this.load.spritesheet('sprite1', 'assets/sprite1.png', {
        frameWidth: 32,
        frameHeight: 32
      });
    }

    function create() {
      sceneRef.current = this; // Store a reference to the Phaser scene
      this.add.image(750, 425, 'map'); // Adjusted map positioning to center

      // Set world bounds for the map
      this.physics.world.setBounds(0, 0, 1500, 850);

      // Initialize local player
      playerRef.current = this.physics.add.sprite(250, 425, 'sprite1');
      playerRef.current.setCollideWorldBounds(true); // Prevent player from moving out of the world bounds

      // Define animations
      this.anims.create({
        key: 'stand',
        frames: [{ key: 'sprite1', frame: 0 }],
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('sprite1', { start: 1, end: 10 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'runUp',
        frames: this.anims.generateFrameNumbers('sprite1', { start: 11, end: 12 }),
        frameRate: 10,
        repeat: -1
      });

      this.anims.create({
        key: 'runDown',
        frames: this.anims.generateFrameNumbers('sprite1', { start: 13, end: 14 }),
        frameRate: 10,
        repeat: -1
      });

      playerRef.current.anims.play('stand');

      // Enable keyboard input
      this.cursors = this.input.keyboard.createCursorKeys();

      // Handle clicks
      playerRef.current.setInteractive();
      playerRef.current.on('pointerdown', () => {
        console.log('Player sprite clicked');
      });

      // Register to receive messages from WebSocket
      WebSocketManager.registerOnMessage(data => handleWebSocketMessage(data, playerId.current, sceneRef.current, otherPlayers));

      // Establish WebSocket connection
      WebSocketManager.connect();
    }

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} />;
}

export default Game;
