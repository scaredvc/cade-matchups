const BASE = import.meta.env.BASE_URL;
const SOURCE_URL = "https://giphy.com/gifs/basketball-2tall-sportsball-yTuXSiS6XV7dEPpBAG";

/**
 * 2Tall's dancing Cade, served from our own domain as an animated WebP. An image (not a video)
 * avoids autoplay blocking such as iOS Low Power Mode. Reduced-motion visitors get a still frame.
 */
export default function DancingCade() {
  return (
    <figure className="mascot">
      <picture>
        <source media="(prefers-reduced-motion: no-preference)" srcSet={`${BASE}media/cade-dance.webp`} type="image/webp" />
        <img
          src={`${BASE}media/cade-dance.jpg`}
          alt="Cartoon Cade Cunningham dancing in a Pistons #2 jersey"
          width={480}
          height={480}
        />
      </picture>
      <figcaption>
        2Tall Animation ·{" "}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          GIPHY
        </a>
      </figcaption>
    </figure>
  );
}
