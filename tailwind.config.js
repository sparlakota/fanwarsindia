/** Tailwind build config. Rebuild css/tailwind.css with scripts/build-css.ps1 after changing any class in
 *  the HTML or js/ files. Same brand colours/fonts that the old CDN <script> config had. */
module.exports = {
  content: ["./*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        fwblack: "#050505",
        fwwhite: "#FFFFFF",
        fwred: "#FF1A1A",
        fwdeepred: "#B00000",
      },
      fontFamily: {
        display: ["Anton", "Arial Black", "sans-serif"],
        name: ["Oswald", "Anton", "sans-serif"],
        body: ["Barlow", "Inter", "sans-serif"],
      },
    },
  },
};
