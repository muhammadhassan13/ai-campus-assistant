export default function GlobalStyles() {
  return (
    <style>{`
      html, body, #root {
        margin: 0;
        padding: 0;
        height: 100%;
        background: transparent;
        overflow: hidden;
      }

      body, main, aside, button, input, select, a {
        transition-property: background-color, border-color, color, box-shadow;
        transition-duration: 150ms;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Hide every scrollbar visually, but keep scrolling working. */
      * {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* Old Edge */
      }
      *::-webkit-scrollbar {
        width: 0;
        height: 0;
        display: none;
        background: transparent;
      }
      *::-webkit-scrollbar-thumb,
      *::-webkit-scrollbar-track,
      *::-webkit-scrollbar-button,
      *::-webkit-scrollbar-corner,
      *::-webkit-scrollbar-track-piece {
        display: none;
        background: transparent;
        width: 0;
        height: 0;
        border: none;
      }
    `}</style>
  );
}
