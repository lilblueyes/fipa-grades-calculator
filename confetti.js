class ConfettiGenerator {
  constructor() {
    this.colors = [
      "rgb(30, 144, 255)",
      "rgb(128, 255, 0)",
      "rgb(255, 200, 0)",
      "rgb(212, 0, 255)",
      "rgb(87, 61, 255)",
      "rgb(0, 191, 255)",
      "rgb(238, 130, 238)",
      "rgb(0, 190, 0)",
      "rgb(70, 130, 180)",
      "rgb(255, 119, 0)",
      "rgb(40, 36, 255)",
      "rgb(220, 20, 60)",
    ];
    this.maxCount = 300;
    this.speed = 2;
    this.frameInterval = 15;
    this.particles = [];
    this.runningAnimation = false;
    this.waveAngle = 0;
    this.initCanvas();
  }

  initCanvas() {
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "fixed",
      top: 0,
      left: 0,
      pointerEvents: "none",
      zIndex: 10000,
    });
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  resetParticle(p) {
    p.color = this.colors[(Math.random() * this.colors.length) | 0];
    p.x = Math.random() * window.innerWidth;
    p.y = Math.random() * -window.innerHeight;
    p.diameter = Math.random() * 10 + 5;
    p.tilt = Math.random() * 20 - 10;
    p.tiltAngleIncrement = Math.random() * 0.07 + 0.05;
    p.tiltAngle = Math.random() * Math.PI;
    return p;
  }

  start(timeout = 1500) {
    while (this.particles.length < this.maxCount) {
      this.particles.push(this.resetParticle({}));
    }
    this.runningAnimation = true;
    this.animate();
    setTimeout(() => this.stop(), timeout);
  }

  stop() {
    this.runningAnimation = false;
  }

  animate() {
    if (!this.runningAnimation && this.particles.length === 0) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.update();
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }

  update() {
    this.waveAngle += 0.01;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!this.runningAnimation && p.y < -15) {
        p.y = this.canvas.height + 100;
      } else {
        p.tiltAngle += p.tiltAngleIncrement;
        p.x += Math.sin(this.waveAngle) - 0.5;
        p.y += (Math.cos(this.waveAngle) + p.diameter + this.speed) * 0.5;
        p.tilt = Math.sin(p.tiltAngle) * 15;
      }
      if (p.x > this.canvas.width + 20 || p.x < -20 || p.y > this.canvas.height) {
        if (this.runningAnimation && this.particles.length <= this.maxCount) {
          this.resetParticle(p);
        } else {
          this.particles.splice(i, 1);
          i--;
        }
      }
    }
  }

  draw() {
    this.particles.forEach((p) => {
      this.context.beginPath();
      this.context.lineWidth = p.diameter;
      const x2 = p.x + p.tilt;
      this.context.strokeStyle = p.color;
      this.context.moveTo(p.x + p.diameter / 2 + p.tilt, p.y);
      this.context.lineTo(x2, p.y + p.tilt + p.diameter / 2);
      this.context.stroke();
    });
  }
}

const confettiGenerator = new ConfettiGenerator();
window.triggerConfetti = function triggerConfetti() {
  confettiGenerator.start(1500);
};
