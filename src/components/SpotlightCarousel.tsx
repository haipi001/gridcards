"use client";

// Spotlight carousel — the real cards on this site, rotated.
// Slide 1 is always the PSA-graded Lando Norris Auto Red Refractor; the rest
// are real 1/1 digital cards from the 2020 archive. Auto-advances, pauses on
// hover/focus, and is fully keyboard and tap operable.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type SpotlightSlide = {
  id: string;
  img: string;
  alt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  badges: string[];
  text: string;
  href: string;
  cta: string;
};

const INTERVAL = 5600;

export default function SpotlightCarousel({
  slides,
}: {
  slides: SpotlightSlide[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (next: number) => setIndex(((next % slides.length) + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || slides.length < 2) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[index];

  return (
    <section
      className="spotlight"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Featured real cards"
    >
      <div className="spotlightStage">
        {slides.map((s, i) => (
          <div
            className={`spotlightSlide ${i === index ? "active" : ""}`}
            key={s.id}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt={s.alt} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
        <button
          className="spotlightArrow prev"
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous card"
        >
          ‹
        </button>
        <button
          className="spotlightArrow next"
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next card"
        >
          ›
        </button>
        <div className="spotlightDots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === index ? "active" : ""}
              onClick={() => go(i)}
              aria-label={`Show ${s.title}`}
            />
          ))}
        </div>
        <span className="spotlightCount">
          {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>

      <div className="spotlightInfo" aria-live="polite">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h3>
          {slide.title}
          <span className="spotlightSub">{slide.subtitle}</span>
        </h3>
        <div className="gradedBadges">
          {slide.badges.map((b) => (
            <span className="pill" key={b}>
              {b}
            </span>
          ))}
        </div>
        <p className="mut">{slide.text}</p>
        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <Link className="btn primary" href={slide.href}>
            {slide.cta}
          </Link>
          {/* Only speak up when the visitor paused the rotation — a permanent
              caption here read like a stray fragment next to the button. */}
          {paused ? <span className="spotlightPaused">已暂停 · 移开鼠标继续</span> : null}
        </div>
      </div>
    </section>
  );
}
