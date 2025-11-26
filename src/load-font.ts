import { continueRender, delayRender, staticFile } from "remotion";

// Font names
export const TheBoldFont = "TheBoldFont";
export const MonsterratBlack = "Montserrat";

let loaded = false;

export const loadFont = async (): Promise<void> => {
  if (loaded) {
    return Promise.resolve();
  }

  const waitForFont = delayRender();
  loaded = true;

  // Load TheBoldFont (primary font)
  const boldFont = new FontFace(
    TheBoldFont,
    `url('${staticFile("fonts/theboldfont.ttf")}') format('truetype')`
  );

  await boldFont.load();
  document.fonts.add(boldFont);

  continueRender(waitForFont);
};
