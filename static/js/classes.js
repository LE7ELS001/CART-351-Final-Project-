//Sprite class
class Sprite {
    constructor({ position, imageSrc, scale = 1, framesMax = 1, offset = { x: 0, y: 0 } }) {
        this.position = position
        this.height = p_height
        this.width = p_width
        this.image = new Image()
        this.image.src = imageSrc
        this.scale = scale
        this.framesMax = framesMax
        this.offset = offset
    }

    draw() {
        c.drawImage(
            this.image,
            this.frameCurrent * (this.image.width / this.framesMax),
            0,
            this.image.width / this.framesMax,
            this.image.height,
            this.position.x - this.offset.x,
            this.position.y - this.offset.y,
            (this.image.width / this.framesMax) * this.scale,
            this.image.height * this.scale
        )
    }

    animateFrames() {
        this.framesElapsed++

        if (this.framesElapsed % this.framesHold === 0) {
            if (this.frameCurrent < this.framesMax - 1) {
                this.frameCurrent++;
            } else {
                if (this.state === 'death') return;

                if (this.state === 'attack') {
                    this.isAttacking = false;
                    this.setState('idle');
                }

                if (this.state == 'takeHit') {
                    this.setState('idle');
                }

                this.frameCurrent = 0;
            }
        }
    }

    update() {
        this.draw();
        this.animateFrames();
    }
}

// Player class
class Player extends Sprite {
    constructor({
        position,
        velocity,
        imageSrc,
        scale = 1,
        framesMax = 1,
        offset = { x: 0, y: 0 },
        sprites,
        color = '#ffffff'
    }) {
        super({
            position,
            imageSrc,
            scale,
            framesMax,
            offset
        })

        this.velocity = velocity;
        this.height = p_height;
        this.width = p_width;
        this.lastKey;
        this.attackBox = {
            position: {
                x: this.position.x,
                y: this.position.y
            },
            width: 230,
            height: 40,
            offset: {
                x: 0,
                y: 20
            }
        }

        this.name = '';
        this.side = 'left';
        this.health = 100;
        this.facing = "right";
        this.isAttacking = false;
        this.state = 'idle';
        this.color = color

        this.frameCurrent = 0
        this.framesElapsed = 0
        this.framesHold = 5
        this.sprites = sprites || {}

        this.sprites = JSON.parse(JSON.stringify(sprites || {}));

        for (const key in this.sprites) {
            const obj = this.sprites[key];
            obj.image = new Image();
            obj.image.src = obj.imageSrc;
            obj.tintedImage = null;

            obj.image.onload = () => {
                obj.tintedImage = this.generateTintedImage(obj.image);
                if (this.state === key) {
                    this.image = obj.tintedImage;
                }
            }
        }

        this.image = new Image();
        this.image.src = imageSrc;
        this.image.onload = () => {
            this.image = this.generateTintedImage(this.image);
        }

        console.log(this.sprites);
    }

    generateTintedImage(img) {
        if (!this.color || this.color === '#ffffff' || this.color === '#ff0000') {
            return img;
        }

        const buffer = document.createElement('canvas');
        buffer.width = img.width;
        buffer.height = img.height;
        const ctx = buffer.getContext('2d');

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, buffer.width, buffer.height);
        const data = imageData.data;

        const targetColor = this.hexToRgb(this.color);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a > 0) {
                const isRed = r > g && r > b &&
                    r > 120 &&
                    g < 100 && b < 100 &&
                    (r - g) > 50 && (r - b) > 50;

                if (isRed) {
                    const intensity = r / 255;
                    data[i] = targetColor.r * intensity;
                    data[i + 1] = targetColor.g * intensity;
                    data[i + 2] = targetColor.b * intensity;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return buffer;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 0, b: 0 };
    }

    setState(newState) {
        if (this.state === 'death') {
            return;
        }

        if (this.state === 'takeHit' && this.state !== newState) {
            if (this.frameCurrent < this.sprites.takeHit.framesMax - 1) return;
        }

        if (this.state === 'attack' && this.isAttacking && newState !== 'takeHit') {
            return;
        }

        if (this.state === newState) return;

        if (this.sprites && this.sprites[newState]) {
            this.image = this.sprites[newState].tintedImage || this.sprites[newState].image;
            this.framesMax = this.sprites[newState].framesMax;
            this.frameCurrent = 0;
        }
        this.state = newState;
    }

    attack() {
        if (this.state === 'death') return;
        this.setState('attack');
        this.isAttacking = true;
    }

    takeHit() {
        if (this.state !== 'death') {
            this.setState('takeHit');
        }
    }

    draw() {
        const groundY = 515;
        const centerX = this.position.x + this.width / 2;
        const feetY = this.position.y + this.height;
        const distanceToGround = Math.max(0, groundY - feetY);

        let shadowScale = 1 - (distanceToGround / 300);
        if (shadowScale < 0.2) shadowScale = 0.2;

        c.beginPath();
        c.fillStyle = `rgba(0, 0, 0, ${0.5 * shadowScale})`;
        c.ellipse(
            centerX,
            groundY + 2,
            40 * shadowScale,
            12 * shadowScale,
            0, 0, Math.PI * 2
        );
        c.fill();
        c.closePath();

        c.save();

        if (this.facing === 'left') {
            const imageWidth = (this.image.width / this.framesMax) * this.scale;
            const drawX = this.position.x - this.offset.x;
            c.translate(drawX + imageWidth / 2, this.position.y);
            c.scale(-1, 1);
            c.translate(-(drawX + imageWidth / 2), -this.position.y);
        }

        super.draw();
        c.restore();
    }

    update() {
        this.draw();
        this.animateFrames();
        this.updateAttackBox();

        this.position.x += this.velocity.x;
        if (this.position.x < 0) {
            this.position.x = 0;
        }
        else if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width;
        }

        this.position.y += this.velocity.y;

        if (this.position.y + this.height + this.velocity.y >= canvas.height - 61) {
            this.velocity.y = 0;
            this.position.y = 365

            if (this.state !== 'death' && this.state !== 'takeHit' && this.state !== 'attack') {
                if (this.velocity.x !== 0) {
                    this.setState('run');
                } else {
                    this.setState('idle');
                }
            }
        } else {
            this.velocity.y += gravity;
        }

        if (this.velocity.y < 0) {
            this.setState('jump');
        } else if (this.velocity.y > 0) {
            this.setState('fall');
        }
    }

    updateAttackBox() {
        if (this.facing === "right") {
            this.attackBox.offset.x = this.width;
        } else {
            this.attackBox.offset.x = -this.attackBox.width;
        }

        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;
    }
}