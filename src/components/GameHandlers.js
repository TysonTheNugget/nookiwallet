// GameHandlers.js

import WebSocketManager from '../utils/WebSocketManager';

// Handle game updates
export function updateGame(time, delta, player, scene, lastUpdateTime, playerId, otherPlayers) {
  // Access the sprite within the container
  const playerSprite = player.list[0];

  // Reset velocity
  player.body.setVelocity(0);

  const speed = 160;
  const diagonalSpeed = speed / Math.sqrt(2);

  if (scene.cursors.left.isDown && scene.cursors.up.isDown) {
    player.body.setVelocity(-diagonalSpeed, -diagonalSpeed);
    playerSprite.anims.play('runUp', true);
    playerSprite.flipX = true;
  } else if (scene.cursors.right.isDown && scene.cursors.up.isDown) {
    player.body.setVelocity(diagonalSpeed, -diagonalSpeed);
    playerSprite.anims.play('runUp', true);
    playerSprite.flipX = false;
  } else if (scene.cursors.left.isDown && scene.cursors.down.isDown) {
    player.body.setVelocity(-diagonalSpeed, diagonalSpeed);
    playerSprite.anims.play('runDown', true);
    playerSprite.flipX = true;
  } else if (scene.cursors.right.isDown && scene.cursors.down.isDown) {
    player.body.setVelocity(diagonalSpeed, diagonalSpeed);
    playerSprite.anims.play('runDown', true);
    playerSprite.flipX = false;
  } else if (scene.cursors.left.isDown) {
    player.body.setVelocityX(-speed);
    playerSprite.anims.play('walk', true);
    playerSprite.flipX = true;
  } else if (scene.cursors.right.isDown) {
    player.body.setVelocityX(speed);
    playerSprite.anims.play('walk', true);
    playerSprite.flipX = false;
  } else if (scene.cursors.up.isDown) {
    player.body.setVelocityY(-speed);
    playerSprite.anims.play('runUp', true);
  } else if (scene.cursors.down.isDown) {
    player.body.setVelocityY(speed);
    playerSprite.anims.play('runDown', true);
  } else {
    playerSprite.anims.play('stand', true);
  }

  // Control update interval to reduce the number of updates per second
  if (time - lastUpdateTime.current > 100) {
    WebSocketManager.sendData({
      id: playerId,
      x: player.x,
      y: player.y,
      animation: playerSprite.anims.currentAnim.key,
      flipX: playerSprite.flipX,
      scale: playerSprite.scaleX, // Assuming uniform scale
    });
    lastUpdateTime.current = time;
  }

  // Interpolate positions for all other players
  interpolateOtherPlayers(delta, otherPlayers);
}

// Handle incoming WebSocket messages
export function handleWebSocketMessage(data, localPlayerId, scene, otherPlayers) {
  const { players } = data;
  Object.keys(players).forEach((id) => {
    if (id !== localPlayerId) {
      const { x, y, animation, flipX, scale, username } = players[id];

      if (!otherPlayers.current[id]) {
        // Create the sprite and text
        const otherPlayerSprite = scene.add.sprite(0, 0, 'sprite1').setScale(scale || 2);
        const otherUsernameText = scene.add.text(0, -50, username || id, {
          fontSize: '16px',
          fill: '#fff',
        });
        otherUsernameText.setOrigin(0.5, 1);

        // Create a container
        const otherPlayerContainer = scene.add.container(x, y, [otherPlayerSprite, otherUsernameText]);

        // Enable physics
        scene.physics.world.enable(otherPlayerContainer);
        otherPlayerContainer.body.setCollideWorldBounds(true);

        otherPlayers.current[id] = otherPlayerContainer;
      }

      const otherPlayer = otherPlayers.current[id];
      const otherPlayerSprite = otherPlayer.list[0];

      otherPlayer.targetX = x;
      otherPlayer.targetY = y;
      otherPlayerSprite.flipX = flipX;

      // Update the scale of the other player's sprite
      if (scale) {
        otherPlayerSprite.setScale(scale);
      }

      if (animation && scene.anims.exists(animation)) {
        otherPlayerSprite.anims.play(animation, true);
      } else {
        otherPlayerSprite.anims.play('stand', true);
      }
    }
  });
}

// Improved interpolation for player positions
function interpolateOtherPlayers(delta, otherPlayers) {
  Object.values(otherPlayers.current).forEach((player) => {
    const distanceX = player.targetX - player.x;
    const distanceY = player.targetY - player.y;

    const step = 0.2; // Interpolation step
    if (Math.abs(distanceX) > 1) {
      player.x += distanceX * step;
    } else {
      player.x = player.targetX;
    }

    if (Math.abs(distanceY) > 1) {
      player.y += distanceY * step;
    } else {
      player.y = player.targetY;
    }
  });
}
