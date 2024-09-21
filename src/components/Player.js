// Player.js
import Phaser from 'phaser';

export default class Player {
  constructor(scene, x, y, key) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, key);

    // Enable interactions
    this.sprite.setInteractive();
    this.sprite.on('pointerdown', this.onClick, this);
  }

  onClick() {
    console.log('Player clicked');
    // Implement interaction menu or future interactions
  }

  createAnimations() {
    this.scene.anims.create({
      key: 'stand',
      frames: [{ key: 'sprite1', frame: 0 }],
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'walk',
      frames: this.scene.anims.generateFrameNumbers('sprite1', { start: 1, end: 11 }),
      frameRate: 10,
      repeat: -1
    });
  }

  playAnimation(key) {
    this.sprite.anims.play(key);
  }
}
