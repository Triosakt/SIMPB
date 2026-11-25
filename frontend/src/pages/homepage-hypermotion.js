
/*
 * SIMPB Cinematic Motion
 * Hanya scroll reveal. Tidak ada pointer tracking.
 */

const processedCards = new WeakSet();
const processedSections = new WeakSet();

const reduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

const sectionObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        entry.target.classList.add("cm-visible");
        sectionObserver.unobserve(entry.target);
      }
    }, {
      threshold:0.08,
      rootMargin:"0px 0px -25px 0px"
    })
  : null;

function scan() {
  const root = document.getElementById("root");
  if (!root) return;

  root.querySelectorAll("article").forEach(card => {
    if (processedCards.has(card)) return;

    processedCards.add(card);

    card.classList.remove(
      "hyper-card",
      "hyper-active",
      "hyper-shock"
    );

    card.style.removeProperty("--hyper-x");
    card.style.removeProperty("--hyper-y");
    card.style.removeProperty("--hyper-rx");
    card.style.removeProperty("--hyper-ry");

    card.classList.add("cm-card");
  });

  root.querySelectorAll("main > section").forEach(section => {
    if (processedSections.has(section)) return;

    processedSections.add(section);
    section.classList.add("cm-section");

    if (reduced.matches || !sectionObserver) {
      section.classList.add("cm-visible");
    } else {
      sectionObserver.observe(section);
    }
  });
}

function start() {
  scan();

  const root = document.getElementById("root");
  if (!root) return;

  let scheduled = false;

  const observer = new MutationObserver(() => {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  });

  observer.observe(root, {
    childList:true,
    subtree:true
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      observer.disconnect();
      sectionObserver?.disconnect();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, {
    once:true
  });
} else {
  start();
}
