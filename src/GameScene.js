class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        const bodies = [
            'blue_body_circle', 'blue_body_rhombus', 'blue_body_square',
            'green_body_circle', 'green_body_rhombus', 'green_body_square',
            'pink_body_circle', 'pink_body_rhombus', 'pink_body_square',
            'purple_body_circle', 'purple_body_rhombus', 'purple_body_square',
            'red_body_circle', 'red_body_rhombus',
            'yellow_body_circle', 'yellow_body_rhombus', 'yellow_body_square',
        ];
        for (const key of bodies) {
            this.load.image(key, `assets/${key}.png`);
        }

        const faces = [
            ['smile1', 'face_smile_open_eye'],
            ['smile2', 'face_smile_open_eye_2'],
            ['smile3', 'face_smile_open_eye_3'],
            ['smile4', 'face_smile_closed_eye'],
            ['frown1', 'face_frown_open_eye'],
            ['frown2', 'face_frown_open_eye_2'],
            ['frown3', 'face_frown_closed_eye'],
            ['frown4', 'face_frown_closed_eye_2'],
            ['grimace', 'face_grimace_open_eye'],
        ];
        for (const [key, file] of faces) {
            this.load.image(key, `assets/${file}.png`);
        }
    }

    create() {
        this.COLS = 4;
        this.ROWS = 4;
        this.NUM_PAIRS = (this.COLS * this.ROWS) / 2;
        this.TOTAL_TIME = 120;
        this.PAD = 30;
        this.SCORE_BAR = 55;
        this.TIMER_BAR = 50;

        this.faceTypes = ['smile1', 'smile2', 'smile3', 'smile4',
                          'frown1', 'frown2', 'frown3', 'frown4'];

        this.bodyCombos = [
            ['blue', 'circle'], ['blue', 'rhombus'], ['blue', 'square'],
            ['green', 'circle'], ['green', 'rhombus'], ['green', 'square'],
            ['pink', 'circle'], ['pink', 'rhombus'], ['pink', 'square'],
            ['purple', 'circle'], ['purple', 'rhombus'], ['purple', 'square'],
            ['red', 'circle'], ['red', 'rhombus'],
            ['yellow', 'circle'], ['yellow', 'rhombus'], ['yellow', 'square'],
        ];

        this.cards = [];
        this.firstPick = null;
        this.secondPick = null;
        this.isLocked = false;
        this.gameOver = false;
        this.score = 0;
        this.pairsFound = 0;

        this.drawBackground();
        this.setupUI();
        this.setupTimer();
        this.buildGrid();
    }

    drawBackground() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xf5f0ff, 0xf5f0ff, 0xe8e0f8, 0xe8e0f8, 1);
        bg.fillRect(0, 0, 800, 600);
    }

    setupUI() {
        this.titleText = this.add.text(400, 12, 'FACE MATCHER', {
            fontSize: '26px',
            fontFamily: 'Arial Black, Arial',
            fontStyle: 'bold',
            color: '#4a3a8a',
        }).setOrigin(0.5, 0).setDepth(10);

        this.scoreText = this.add.text(400, 38, 'Score: 0', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#6a5aaa',
        }).setOrigin(0.5, 0).setDepth(10);

        this.pairsText = this.add.text(780, 38, `0 / ${this.NUM_PAIRS} pairs`, {
            fontSize: '15px',
            fontFamily: 'Arial',
            color: '#8877bb',
        }).setOrigin(1, 0).setDepth(10);

        const topLine = this.add.graphics().setDepth(10);
        topLine.lineStyle(1, 0xccccdd);
        topLine.beginPath();
        topLine.moveTo(20, this.SCORE_BAR);
        topLine.lineTo(780, this.SCORE_BAR);
        topLine.strokePath();

        const botLine = this.add.graphics().setDepth(10);
        botLine.lineStyle(1, 0xccccdd);
        botLine.beginPath();
        botLine.moveTo(20, 600 - this.TIMER_BAR);
        botLine.lineTo(780, 600 - this.TIMER_BAR);
        botLine.strokePath();

        this.timerText = this.add.text(400, 600 - this.TIMER_BAR + 12, '2:00', {
            fontSize: '24px',
            fontFamily: 'Arial Black, Arial',
            fontStyle: 'bold',
            color: '#4a3a8a',
        }).setOrigin(0.5, 0).setDepth(10);

        this.timerLabel = this.add.text(400, 600 - this.TIMER_BAR + 36, 'time remaining', {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#9999bb',
        }).setOrigin(0.5, 0).setDepth(10);
    }

    setupTimer() {
        this.timeLeft = this.TOTAL_TIME;
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timeLeft--;
                this.updateTimerDisplay();
                if (this.timeLeft <= 0) {
                    this.timerEvent.remove();
                    this.onTimeUp();
                }
            },
            loop: true,
        });
    }

    updateTimerDisplay() {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
        if (this.timeLeft <= 10) {
            this.timerText.setColor('#cc3333');
        } else if (this.timeLeft <= 30) {
            this.timerText.setColor('#cc8833');
        }
    }

    buildGrid() {
        const gridTop = this.SCORE_BAR + this.PAD;
        const gridBot = 600 - this.TIMER_BAR - this.PAD;
        const gridW = 800 - this.PAD * 2;
        const gridH = gridBot - gridTop;
        const cellW = gridW / this.COLS;
        const cellH = gridH / this.ROWS;
        const bodySize = Math.min(cellW, cellH) * 0.72;
        const faceSize = bodySize * 0.55;

        const faceList = [];
        for (const type of this.faceTypes) {
            faceList.push(type, type);
        }
        Phaser.Utils.Array.Shuffle(faceList);

        const shuffledBodies = Phaser.Utils.Array.Shuffle([...this.bodyCombos]);

        this.cellGraphics = this.add.graphics().setDepth(0);

        let idx = 0;
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const cx = this.PAD + col * cellW + cellW / 2;
                const cy = gridTop + row * cellH + cellH / 2;

                this.cellGraphics.fillStyle(0xffffff, 0.3);
                this.cellGraphics.fillRoundedRect(
                    cx - cellW / 2 + 4, cy - cellH / 2 + 4,
                    cellW - 8, cellH - 8, 8
                );

                const bodyCombo = shuffledBodies[idx % shuffledBodies.length];
                const bodyKey = `${bodyCombo[0]}_body_${bodyCombo[1]}`;
                const faceType = faceList[idx];

                const bodyImg = this.add.image(cx, cy, bodyKey)
                    .setDisplaySize(bodySize, bodySize).setDepth(1);
                const faceImg = this.add.image(cx, cy, faceType)
                    .setDisplaySize(faceSize, faceSize).setDepth(2).setVisible(false);

                const cover = this.add.image(cx, cy, bodyKey)
                    .setDisplaySize(bodySize * 0.85, bodySize * 0.85)
                    .setDepth(3).setTint(0xaaaaaa).setAlpha(0.55);

                const questionMark = this.add.text(cx, cy, '?', {
                    fontSize: `${bodySize * 0.45}px`,
                    fontFamily: 'Arial Black, Arial',
                    fontStyle: 'bold',
                    color: '#ffffff',
                }).setOrigin(0.5, 0.5).setDepth(4);

                const card = {
                    row, col, cx, cy,
                    bodyImg, faceImg, cover, questionMark,
                    faceType, revealed: false, matched: false,
                };

                cover.setInteractive({ useHandCursor: true });
                cover.on('pointerdown', () => this.onCardClick(card));
                questionMark.setInteractive({ useHandCursor: true });
                questionMark.on('pointerdown', () => this.onCardClick(card));

                cover.on('pointerover', () => {
                    if (!this.isLocked && !card.revealed && !card.matched && !this.gameOver) {
                        this.tweens.add({ targets: [cover, questionMark], scaleX: 1.08, scaleY: 1.08, duration: 80 });
                    }
                });
                cover.on('pointerout', () => {
                    this.tweens.add({ targets: [cover, questionMark], scaleX: 1, scaleY: 1, duration: 80 });
                });

                this.cards.push(card);
                idx++;
            }
        }
    }

    onCardClick(card) {
        if (this.isLocked || card.revealed || card.matched || this.gameOver) return;

        card.revealed = true;

        this.tweens.add({
            targets: [card.cover, card.questionMark],
            scaleX: 0,
            scaleY: 0,
            duration: 120,
            ease: 'Back.easeIn',
            onComplete: () => {
                card.cover.setVisible(false);
                card.questionMark.setVisible(false);
                card.faceImg.setVisible(true);
                card.faceImg.setScale(0);
                this.tweens.add({
                    targets: card.faceImg,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Back.easeOut',
                });
            },
        });

        if (!this.firstPick) {
            this.firstPick = card;
        } else {
            this.secondPick = card;
            this.isLocked = true;

            if (this.firstPick.faceType === this.secondPick.faceType) {
                this.time.delayedCall(500, () => this.onMatch());
            } else {
                this.time.delayedCall(900, () => this.onMismatch());
            }
        }
    }

    onMatch() {
        this.score++;
        this.pairsFound++;
        this.scoreText.setText(`Score: ${this.score}`);
        this.pairsText.setText(`${this.pairsFound} / ${this.NUM_PAIRS} pairs`);

        const a = this.firstPick;
        const b = this.secondPick;

        this.tweens.add({
            targets: [a.bodyImg, a.faceImg],
            y: a.cy - 20,
            duration: 150,
            yoyo: true,
            ease: 'Quad.easeInOut',
        });
        this.tweens.add({
            targets: [b.bodyImg, b.faceImg],
            y: b.cy - 20,
            duration: 150,
            yoyo: true,
            ease: 'Quad.easeInOut',
        });

        this.time.delayedCall(350, () => {
            this.removeCard(a);
            this.removeCard(b);
        });

        this.firstPick = null;
        this.secondPick = null;

        this.time.delayedCall(700, () => {
            this.isLocked = false;
            if (this.pairsFound === this.NUM_PAIRS) {
                this.onWin();
            }
        });
    }

    removeCard(card) {
        card.matched = true;
        this.tweens.add({
            targets: [card.bodyImg, card.faceImg],
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 350,
            ease: 'Back.easeIn',
            onComplete: () => {
                card.bodyImg.setVisible(false);
                card.faceImg.setVisible(false);
            },
        });
    }

    onMismatch() {
        const a = this.firstPick;
        const b = this.secondPick;

        this.tweens.add({
            targets: a.faceImg,
            angle: -8,
            duration: 60,
            yoyo: true,
        });
        this.tweens.add({
            targets: b.faceImg,
            angle: 8,
            duration: 60,
            yoyo: true,
        });

        this.time.delayedCall(200, () => {
            this.hideCard(a);
            this.hideCard(b);
            this.firstPick = null;
            this.secondPick = null;
            this.isLocked = false;
        });
    }

    hideCard(card) {
        card.revealed = false;
        this.tweens.add({
            targets: card.faceImg,
            scaleX: 0,
            scaleY: 0,
            duration: 120,
            ease: 'Back.easeIn',
            onComplete: () => {
                card.faceImg.setVisible(false);
                card.faceImg.setAngle(0);
                card.faceImg.setScale(1);
                card.cover.setVisible(true);
                card.cover.setScale(0);
                card.questionMark.setVisible(true);
                card.questionMark.setScale(0);
                this.tweens.add({
                    targets: [card.cover, card.questionMark],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 150,
                    ease: 'Back.easeOut',
                });
            },
        });
    }

    onWin() {
        this.gameOver = true;
        this.timerEvent.remove();

        const bonus = this.timeLeft;
        this.score += bonus;
        this.scoreText.setText(`Score: ${this.score}`);

        for (const c of this.cards) {
            this.tweens.add({
                targets: [c.bodyImg, c.faceImg],
                y: c.cy - 15,
                duration: 200,
                yoyo: true,
                ease: 'Quad.easeInOut',
                delay: (c.row * this.COLS + c.col) * 30,
            });
        }

        this.time.delayedCall(600, () => this.showPopup(true, bonus));
    }

    onTimeUp() {
        this.gameOver = true;
        this.isLocked = true;
        this.showPopup(false, 0);
    }

    showPopup(isWin, bonus) {
        const overlay = this.add.graphics().setDepth(50);
        overlay.fillStyle(0x000000, 0.45);
        overlay.fillRect(0, 0, 800, 600);

        const panel = this.add.graphics().setDepth(51);
        panel.fillStyle(0xffffff, 0.95);
        panel.fillRoundedRect(175, 130, 450, 340, 20);
        panel.lineStyle(3, 0x4a3a8a);
        panel.strokeRoundedRect(175, 130, 450, 340, 20);

        const heading = isWin ? 'YOU WIN!' : "TIME'S UP!";
        const headingColor = isWin ? '#4a3a8a' : '#cc3333';

        this.add.text(400, 170, heading, {
            fontSize: '40px',
            fontFamily: 'Arial Black, Arial',
            fontStyle: 'bold',
            color: headingColor,
        }).setOrigin(0.5).setDepth(52);

        this.add.text(400, 240, `Pairs Matched:  ${this.pairsFound} / ${this.NUM_PAIRS}`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#6a5aaa',
        }).setOrigin(0.5).setDepth(52);

        if (isWin) {
            this.add.text(400, 280, `Time Bonus:  +${bonus}`, {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#6a5aaa',
            }).setOrigin(0.5).setDepth(52);
        }

        this.add.text(400, 335, `Final Score:  ${this.score}`, {
            fontSize: '30px',
            fontFamily: 'Arial Black, Arial',
            fontStyle: 'bold',
            color: '#4a3a8a',
        }).setOrigin(0.5).setDepth(52);

        const playBtn = this.add.text(400, 410, '[ Play Again ]', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#8877bb',
        }).setOrigin(0.5).setDepth(52).setInteractive({ useHandCursor: true });

        playBtn.on('pointerdown', () => this.scene.restart());
        playBtn.on('pointerover', () => playBtn.setColor('#aa66ff'));
        playBtn.on('pointerout', () => playBtn.setColor('#8877bb'));

        const btnTween = this.tweens.add({
            targets: playBtn,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}
