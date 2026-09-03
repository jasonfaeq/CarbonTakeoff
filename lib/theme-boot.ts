export const THEME_KEY = "carbon-takeoff:theme";

/** Runs before first paint, so a saved theme never flashes the wrong colours. */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
