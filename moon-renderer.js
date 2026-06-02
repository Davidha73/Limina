class MoonRenderer {
    constructor() {
        this.textureLoaded = false;
        this.textureImage = new Image();
        this.textureImage.src = 'moon_texture.png';
        this.textureImage.onload = () => {
            this.textureLoaded = true;
            // Dispatch event to redraw when texture is loaded
            window.dispatchEvent(new CustomEvent('moonTextureLoaded'));
        };
    }

    /**
     * Draws a detailed, realistic moon on a canvas using texture and soft-terminator shadowing.
     * @param {HTMLCanvasElement} canvas 
     * @param {number} phase - Moon phase (0.0 to 1.0)
     * @param {object} options - Options { skyView: boolean, angle: number, parallacticAngle: number }
     */
    draw(canvas, phase, options = {}) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.43; // leave a small margin for glow

        ctx.clearRect(0, 0, width, height);

        // 1. Prepare rotation (Sky View vs Space View)
        ctx.save();
        if (options.skyView && options.angle !== undefined && options.parallacticAngle !== undefined) {
            // Rotate the entire drawing based on location's local horizon perspective
            const rotationAngle = options.angle - options.parallacticAngle;
            ctx.translate(cx, cy);
            ctx.rotate(rotationAngle);
            ctx.translate(-cx, -cy);
        }

        // 2. Draw Earthshine (the unlit, faint side of the moon)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip(); // clip to moon sphere

        // Base dark space color
        ctx.fillStyle = '#060712';
        ctx.fillRect(0, 0, width, height);

        // Faint moon texture for Earthshine
        if (this.textureLoaded) {
            ctx.globalAlpha = 0.08;
            ctx.drawImage(this.textureImage, cx - r, cy - r, r * 2, r * 2);
        } else {
            // Fallback unlit color
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fill();
        }
        ctx.restore();

        // 3. Draw Fully Illuminated Base (clipped by sphere)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (this.textureLoaded) {
            ctx.globalAlpha = 1.0;
            ctx.drawImage(this.textureImage, cx - r, cy - r, r * 2, r * 2);
        } else {
            // Fallback illuminated color (flat white/grey)
            ctx.fillStyle = '#e2e8f0';
            ctx.fill();
        }
        ctx.restore();

        // 4. Overlay Shadow (creates the actual phase with a soft blurred terminator)
        if (phase > 0.01 && phase < 0.99) {
            ctx.save();
            // Clip to sphere so the shadow blur doesn't bleed outside the moon circle
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Set soft edge blur for realistic terminator
            ctx.filter = 'blur(6px)';
            
            // Build the shadow path
            ctx.beginPath();
            
            if (phase < 0.5) {
                // Waxing phase: shadow is on the left
                // Sweep left circle outer boundary (counter-clockwise)
                ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
                
                // Sweep the terminator ellipse back to top
                const W = r * (1 - 4 * phase);
                ctx.ellipse(cx, cy, Math.abs(W), r, 0, Math.PI / 2, -Math.PI / 2, W > 0);
            } else {
                // Waning phase: shadow is on the right
                // Sweep right circle outer boundary (clockwise)
                ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
                
                // Sweep the terminator ellipse back to top
                const W = r * (4 * phase - 3);
                ctx.ellipse(cx, cy, Math.abs(W), r, 0, Math.PI / 2, -Math.PI / 2, W < 0);
            }

            ctx.closePath();
            
            // Fill shadow with deep dark background color
            ctx.fillStyle = 'rgba(5, 6, 17, 0.95)';
            ctx.fill();
            
            ctx.restore();
        } else if (phase <= 0.01 || phase >= 0.99) {
            // New Moon: Draw full shadow
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = 'rgba(5, 6, 17, 0.95)';
            ctx.fill();
            ctx.restore();
        }

        ctx.restore(); // Restore main rotation translate
    }

    /**
     * Draws a fast vector-based moon representation for grid views (calendar, lists).
     * @param {HTMLCanvasElement} canvas 
     * @param {number} phase - Moon phase (0.0 to 1.0)
     */
    drawMini(canvas, phase) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.42;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw unlit background base
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();

        // 2. Draw fully illuminated base, clipped to sphere
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#f6d365';
        ctx.fill();

        // 3. Draw shadow overlay on top
        if (phase > 0.01 && phase < 0.99) {
            ctx.beginPath();
            if (phase < 0.5) {
                // Waxing phase: shadow is on the left
                ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
                const W = r * (1 - 4 * phase);
                ctx.ellipse(cx, cy, Math.abs(W), r, 0, Math.PI / 2, -Math.PI / 2, W > 0);
            } else {
                // Waning phase: shadow is on the right
                ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
                const W = r * (4 * phase - 3);
                ctx.ellipse(cx, cy, Math.abs(W), r, 0, Math.PI / 2, -Math.PI / 2, W < 0);
            }
            ctx.closePath();
            
            // Fill with a dark obsidian color that blends into the calendar cell backings
            ctx.fillStyle = '#070919';
            ctx.fill();
        } else if (phase <= 0.01 || phase >= 0.99) {
            // New Moon: Draw full shadow
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = '#070919';
            ctx.fill();
        }

        ctx.restore(); // restore clipping context

        // 4. Subtle outer border highlight
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Attach to window so it can be loaded before ES Modules
window.MoonRenderer = MoonRenderer;
