import WebSocketManager from '../utils/WebSocketManager';

// Handle game updates
export function updateGame(time, delta, player, scene, lastUpdateTime, playerId, otherPlayers) {
  player.setVelocity(0);

  const speed = 160;
  const diagonalSpeed = speed / Math.sqrt(2);

  if (scene.cursors.left.isDown && scene.cursors.up.isDown) {
    player.setVelocity(-diagonalSpeed, -diagonalSpeed);
    player.anims.play('runUp', true);
    player.flipX = true;
  } else if (scene.cursors.right.isDown && scene.cursors.up.isDown) {
    player.setVelocity(diagonalSpeed, -diagonalSpeed);
    player.anims.play('runUp', true);
    player.flipX = false;
  } else if (scene.cursors.left.isDown && scene.cursors.down.isDown) {
    player.setVelocity(-diagonalSpeed, diagonalSpeed);
    player.anims.play('runDown', true);
    player.flipX = true;
  } else if (scene.cursors.right.isDown && scene.cursors.down.isDown) {
    player.setVelocity(diagonalSpeed, diagonalSpeed);
    player.anims.play('runDown', true);
    player.flipX = false;
  } else if (scene.cursors.left.isDown) {
    player.setVelocityX(-speed);
    player.anims.play('walk', true);
    player.flipX = true;
  } else if (scene.cursors.right.isDown) {
    player.setVelocityX(speed);
    player.anims.play('walk', true);
    player.flipX = false;
  } else if (scene.cursors.up.isDown) {
    player.setVelocityY(-speed);
    player.anims.play('runUp', true);
  } else if (scene.cursors.down.isDown) {
    player.setVelocityY(speed);
    player.anims.play('runDown', true);
  } else {
    player.anims.play('stand', true);
  }

  // Control update interval to reduce the number of updates per second
  if (time - lastUpdateTime.current > 100) {
    WebSocketManager.sendData({
      id: playerId,
      x: player.x,
      y: player.y,
      animation: player.anims.currentAnim.key,
      flipX: player.flipX
    });
    lastUpdateTime.current = time;
  }

  // Interpolate positions for all other players
  interpolateOtherPlayers(delta, otherPlayers);
}

// Handle incoming WebSocket messages
export function handleWebSocketMessage(data, localPlayerId, scene, otherPlayers) {
  const { players } = data;
  Object.keys(players).forEach(id => {
    if (id !== localPlayerId) { // Ignore local player
      const { x, y, animation, flipX } = players[id];

      if (!otherPlayers.current[id]) {
        const newPlayer = scene.physics.add.sprite(x, y, 'sprite1');
        newPlayer.setInteractive();
        newPlayer.setCollideWorldBounds(true);
        otherPlayers.current[id] = newPlayer;
      }

      const otherPlayer = otherPlayers.current[id];
      otherPlayer.targetX = x;
      otherPlayer.targetY = y;
      otherPlayer.flipX = flipX;

      if (animation && scene.anims.exists(animation)) {
        otherPlayer.anims.play(animation, true);
      } else {
        otherPlayer.anims.play('stand', true);
      }
    }
  });
}

// Improved interpolation for player positions
function interpolateOtherPlayers(delta, otherPlayers) {
  Object.values(otherPlayers).forEach(player => {
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
