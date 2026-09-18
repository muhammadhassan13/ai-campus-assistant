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
          'linear-gradient(180deg, #F0F4FE 0%, #ECEEFB 45%, #F3ECF9 100%)',
      }}
    >
      {/* Cool blue bloom — top-left */}
      <div
        style={{
          position: 'absolute',
          top: '-25%',
          left: '-20%',
          width: '95vw',
          height: '95vw',
          background:
            'radial-gradient(circle at 45% 45%, #AFC7EE 0%, #C7D3EE 40%, rgba(238,241,250,0) 72%)',
          filter: 'blur(50px)',
          opacity: 0.7,
        }}
      />

      {/* Violet wash — middle-right */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: '-25%',
          width: '80vw',
          height: '80vw',
          background:
            'radial-gradient(circle at 50% 50%, #C1B4E3 0%, #D6CCEA 42%, rgba(238,241,250,0) 75%)',
          filter: 'blur(60px)',
          opacity: 0.65,
        }}
      />

      {/* Pale blush glow — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-15%',
          width: '80vw',
          height: '80vw',
          background:
            'radial-gradient(circle at 50% 50%, #E7CBC9 0%, #E9D9D8 42%, rgba(238,241,250,0) 75%)',
          filter: 'blur(60px)',
          opacity: 0.6,
        }}
      />

      {/* Soft center highlight */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '25%',
          width: '50vw',
          height: '50vw',
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(50px)',
          opacity: 0.7,
        }}
      />

      {/* Frost grain — high-frequency noise that the glass cards'
          backdrop-filter will sample and blur into frost. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.35'/%3E%3C/svg%3E\")",
          mixBlendMode: 'soft-light',
        }}
      />
    </div>
  );
}
