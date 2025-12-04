spawn_positionsX_left = 100;
spawn_positionsX_right = 700;

p_height = 150;
p_width = 50;

collisionBoxOffsetY = 30;


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

// player class
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

        // this.position = position;
        this.velocity = velocity;
        // this.height = 150;
        // this.width = 50;
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
        this.framesHold = 15
        this.sprites = sprites || {}

        //color 
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

        // for (const sprite in sprites) {
        //     sprites[sprite].image = new Image()
        //     sprites[sprite].image.src = sprites[sprite].imageSrc
        // }

        console.log(this.sprites);
    }

    generateTintedImage(img) {
        if (!this.color || this.color === '#ffffff') {
            return img
        }

        const buffer = document.createElement('canvas');
        buffer.width = img.width;
        buffer.height = img.height;
        const ctx = buffer.getContext('2d');

        ctx.drawImage(img, 0, 0);

        ctx.globalCompositeOperation = 'source-atop'

        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 0, buffer.width, buffer.height);

        ctx.globalAlpha = 1.0
        ctx.globalCompositeOperation = 'source-over';

        return buffer;
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
        // if (this.state !== newState) {
        //     this.state = newState;
        // }
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

        //test the state
        // if (this.state === 'idle') c.fillStyle = 'white'
        // if (this.state === 'run') c.fillStyle = 'blue'
        // if (this.state === 'jump') c.fillStyle = 'orange'
        // if (this.state === 'fall') c.fillStyle = 'yellow'
        // if (this.state === 'attack') c.fillStyle = 'purple'
        // c.fillRect(this.position.x, this.position.y, this.width, this.height)

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


        //attack box
        if (this.isAttacking) {
            if (this.frameCurrent === 4) {
                c.fillStyle = 'green';
                c.fillRect(this.attackBox.position.x, this.attackBox.position.y, this.attackBox.width, this.attackBox.height);
            }
        }
    }

    update() {
        this.draw();
        this.animateFrames();
        //updae attack box position 
        this.updateAttackBox();

        //debug character collision box 
        // c.fillStyle = 'rgba(255, 0, 0, 0.3)'
        // c.fillRect(this.position.x, this.position.y, this.width, this.height)


        this.position.x += this.velocity.x;
        if (this.position.x < 0) {
            this.position.x = 0;
        }
        else if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width;
        }

        this.position.y += this.velocity.y;


        //fall to ground
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

        //jump and fall state
        if (this.velocity.y < 0) {
            this.setState('jump');
        } else if (this.velocity.y > 0) {
            this.setState('fall');
        }


    }

    updateAttackBox() {


        if (this.facing === "right") {
            this.attackBox.offset.x = this.width;  //right
        } else {
            this.attackBox.offset.x = -this.attackBox.width; // left
        }

        //update collision box position 
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

    }
}