class Starfield {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.stars = [];
        this.shootingStars = [];
        this.numStars = 150;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            // Normalize mouse to range [-0.5, 0.5]
            this.targetMouseX = (e.clientX / window.innerWidth) - 0.5;
            this.targetMouseY = (e.clientY / window.innerHeight) - 0.5;
        });

        // Initialize stars
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push(this.createStar());
        }

        // Start animation loop
        this.animate();
        
        // Setup shooting star trigger
        this.scheduleShootingStar();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Re-adjust number of stars based on screen size
        const area = (this.canvas.width * this.canvas.height) / 10000;
        this.numStars = Math.min(Math.floor(area * 1.5), 300);
        
        // If stars list is shorter, fill it
        while (this.stars.length < this.numStars) {
            this.stars.push(this.createStar());
        }
        // If too many, trim it
        if (this.stars.length > this.numStars) {
            this.stars = this.stars.slice(0, this.numStars);
        }
    }

    createStar() {
        const sizes = [0.5, 0.8, 1, 1.2, 1.5, 2];
        const sizeWeights = [40, 30, 15, 10, 4, 1]; // Make smaller stars much more common
        
        // Weighted random selection for size
        let r = Math.random() * 100;
        let sum = 0;
        let size = 0.8;
        for (let i = 0; i < sizes.length; i++) {
            sum += sizeWeights[i];
            if (r <= sum) {
                size = sizes[i];
                break;
            }
        }

        // Star color variations
        const colors = [
            'rgba(255, 255, 255, ',
            'rgba(217, 239, 255, ', // subtle blue
            'rgba(255, 240, 217, ', // subtle yellow
            'rgba(255, 224, 224, ', // subtle red
        ];
        const colorWeights = [70, 15, 10, 5];
        r = Math.random() * 100;
        sum = 0;
        let colorPrefix = colors[0];
        for (let i = 0; i < colors.length; i++) {
            sum += colorWeights[i];
            if (r <= sum) {
                colorPrefix = colors[i];
                break;
            }
        }

        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: size,
            colorPrefix: colorPrefix,
            opacity: Math.random(),
            twinkleSpeed: 0.005 + Math.random() * 0.015,
            phase: Math.random() * Math.PI * 2,
            depth: 0.2 + Math.random() * 0.8 // for parallax effect
        };
    }

    createShootingStar() {
        const startX = Math.random() * this.canvas.width;
        const startY = Math.random() * (this.canvas.height * 0.5); // Start in top half
        const angle = Math.PI / 6 + Math.random() * (Math.PI / 6); // 30 to 60 degrees diagonal
        const speed = 10 + Math.random() * 15;
        
        return {
            x: startX,
            y: startY,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            length: 80 + Math.random() * 120,
            opacity: 1.0,
            fadeSpeed: 0.015 + Math.random() * 0.02,
            color: 'rgba(255, 255, 255, '
        };
    }

    scheduleShootingStar() {
        const nextTime = 4000 + Math.random() * 8000; // spawn every 4-12 seconds
        setTimeout(() => {
            if (document.visibilityState === 'visible' && this.shootingStars.length < 2) {
                this.shootingStars.push(this.createShootingStar());
            }
            this.scheduleShootingStar();
        }, nextTime);
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Smoothly interpolate mouse parallax positions
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
        
        // Draw twinkling stars
        for (let star of this.stars) {
            // Apply slight mouse parallax shift based on depth
            let drawX = star.x + (this.mouseX * 30 * star.depth);
            let drawY = star.y + (this.mouseY * 30 * star.depth);
            
            // Wrap coordinates around screen if parallax moves them out
            if (drawX < 0) drawX += this.canvas.width;
            if (drawX > this.canvas.width) drawX -= this.canvas.width;
            if (drawY < 0) drawY += this.canvas.height;
            if (drawY > this.canvas.height) drawY -= this.canvas.height;
            
            // Twinkle logic
            star.phase += star.twinkleSpeed;
            const currentOpacity = 0.15 + (Math.sin(star.phase) + 1) * 0.5 * 0.75 * star.opacity;
            
            this.ctx.beginPath();
            this.ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = star.colorPrefix + currentOpacity.toFixed(2) + ')';
            this.ctx.shadowBlur = star.size > 1.2 ? 4 : 0;
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fill();
        }
        
        // Draw & Update shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            
            this.ctx.beginPath();
            // Create a gradient for the tail
            const grad = this.ctx.createLinearGradient(
                ss.x, ss.y, 
                ss.x - ss.dx * 3, ss.y - ss.dy * 3
            );
            grad.addColorStop(0, ss.color + ss.opacity.toFixed(2) + ')');
            grad.addColorStop(1, ss.color + '0)');
            
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 1.5;
            this.ctx.moveTo(ss.x, ss.y);
            this.ctx.lineTo(ss.x - ss.dx * 1.5, ss.y - ss.dy * 1.5);
            this.ctx.stroke();
            
            // Update position
            ss.x += ss.dx;
            ss.y += ss.dy;
            ss.opacity -= ss.fadeSpeed;
            
            // Remove if off screen or fully faded
            if (ss.opacity <= 0 || ss.x > this.canvas.width || ss.y > this.canvas.height) {
                this.shootingStars.splice(i, 1);
            }
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Starfield('stars-canvas');
});
