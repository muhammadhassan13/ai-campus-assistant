import React, { useEffect } from 'react';

export default function StarBackground({
  children,
}: {
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const canvas = document.getElementById('spaceCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    let stars: Star[] = [];
    const numStars = 600;
    const speed = 2.5;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class Star {
      x!: number;
      y!: number;
      z!: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = (Math.random() - 0.5) * width * 2;
        this.y = (Math.random() - 0.5) * height * 2;
        this.z = Math.random() * width;
      }

      update() {
        this.z -= speed;
        if (this.z <= 0) {
          this.z = width;
          this.x = (Math.random() - 0.5) * width * 2;
          this.y = (Math.random() - 0.5) * height * 2;
        }
      }

      draw() {
        const k = 300 / this.z;
        const px = this.x * k + width / 2;
        const py = this.y * k + height / 2;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const pSize = Math.max(1, (1 - this.z / width) * 3.5);
          const opacity = Math.min(1, (1 - this.z / width) * 1.5);

          ctx.fillStyle = `rgba(130, 190, 255, ${opacity})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (let i = 0; i < numStars; i++) {
      stars.push(new Star());
    }

    let animationFrameId: number;
    function animate() {
      ctx.fillStyle = 'rgba(5, 10, 25, 0.35)';
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={containerStyle}>
      <canvas id="spaceCanvas" style={canvasStyle}></canvas>
      <div style={contentStyle}>{children}</div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  background: 'radial-gradient(circle at center, #0a1128 0%, #010308 100%)',
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const canvasStyle: React.CSSProperties = {
  display: 'block',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
};

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  textAlign: 'center',
  padding: '20px',
};
