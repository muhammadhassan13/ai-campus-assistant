export default function LiquidBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, #EDF2FE 0%, #E8ECFB 45%, #F1E9F6 100%)',
      }}
    >
      {/* Sky-blue bloom — top-left */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-15%',
          width: '75vw',
          height: '75vw',
          background:
            'radial-gradient(circle at 50% 50%, #8FB6F0 0%, #A8C5F0 35%, rgba(237,242,254,0) 70%)',
          filter: 'blur(40px)',
          opacity: 0.85,
        }}
      />

      {/* Violet wash — middle-right */}
      <div
        style={{
          position: 'absolute',
          top: '18%',
          right: '-22%',
          width: '70vw',
          height: '70vw',
          background:
            'radial-gradient(circle at 50% 50%, #A99BE0 0%, #C3B6E8 40%, rgba(237,242,254,0) 72%)',
          filter: 'blur(45px)',
          opacity: 0.8,
        }}
      />

      {/* Pink blush — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-25%',
          left: '-12%',
          width: '70vw',
          height: '70vw',
          background:
            'radial-gradient(circle at 50% 50%, #E7B6C2 0%, #EFC8D2 42%, rgba(237,242,254,0) 72%)',
          filter: 'blur(45px)',
          opacity: 0.75,
        }}
      />

      {/* Mint hint — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          background:
            'radial-gradient(circle at 50% 50%, #B4DED2 0%, #CBE5DC 40%, rgba(237,242,254,0) 72%)',
          filter: 'blur(50px)',
          opacity: 0.6,
        }}
      />

      {/* Soft white center lift */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: '30%',
          width: '45vw',
          height: '45vw',
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(50px)',
          opacity: 0.7,
        }}
      />
    </div>
  );
}
