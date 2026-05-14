import { useEffect, useState } from "react";
import {
  CURSIVE_CATEGORY_CATALOG,
  CURSIVE_CATEGORY_SUMMARIES,
  CURSIVE_LIVE_CATEGORY_SLUGS,
  type CursiveCategorySlug,
} from "../../../../../packages/shared/src/contracts";

export type { CursiveCategorySlug } from "../../../../../packages/shared/src/contracts";

export const CURSIVE_ACTIVE_CATEGORY = "credit_bureau_dispute" as const;

type CursiveCategoryPickerProps = {
  selectedCategory: CursiveCategorySlug | null;
  onSelect: (category: CursiveCategorySlug) => void;
};

const LIVE_CATEGORY_SET = new Set<CursiveCategorySlug>([...CURSIVE_LIVE_CATEGORY_SLUGS]);

export function CursiveCategoryPicker({
  selectedCategory,
  onSelect,
}: CursiveCategoryPickerProps) {
  const [expandedCategory, setExpandedCategory] = useState<CursiveCategorySlug | null>(
    selectedCategory ?? CURSIVE_ACTIVE_CATEGORY,
  );

  useEffect(() => {
    if (selectedCategory) {
      setExpandedCategory(selectedCategory);
    }
  }, [selectedCategory]);

  return (
    <section className="cursive-card" aria-label="Cursive category picker">
      <div className="cursive-card__header">
        <div>
          <p className="eyebrow">Cursive Intake</p>
          <h3>Choose a letter category</h3>
        </div>
        <p className="panel-description">
          Official letter generation starts with a category and validated intake,
          not chat.
        </p>
      </div>
      <div className="cursive-category-grid">
        {CURSIVE_CATEGORY_CATALOG.map((option) => {
          const isSelected = option.slug === selectedCategory;
          const isExpanded = option.slug === expandedCategory;
          const isLive = LIVE_CATEGORY_SET.has(option.slug);

          return (
            <article
              key={option.slug}
              className={[
                "cursive-category-card",
                isSelected ? "is-selected" : "",
                isExpanded ? "is-expanded" : "",
                isLive ? "" : "is-unavailable",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="cursive-category-row">
                <button
                  className="cursive-category-button"
                  onClick={() => {
                    onSelect(option.slug);
                    setExpandedCategory(option.slug);
                  }}
                  type="button"
                >
                  <span className="cursive-category-button__topline">
                    <span className="cursive-category-title">{option.displayName}</span>
                    <span className="cursive-category-badge">
                      {isLive ? "Live draft lane" : "Intake scaffold"}
                    </span>
                  </span>
                </button>
                <button
                  aria-expanded={isExpanded}
                  className="cursive-category-toggle"
                  onClick={() => {
                    setExpandedCategory((currentCategory) =>
                      currentCategory === option.slug ? null : option.slug,
                    );
                  }}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`cursive-category-chevron${isExpanded ? " is-selected" : ""}`}
                  >
                    {isExpanded ? "−" : "+"}
                  </span>
                  <span className="sr-only">
                    {isExpanded ? "Collapse category details" : "Expand category details"}
                  </span>
                </button>
              </div>
              {isExpanded ? (
                <div className="cursive-category-card__details">
                  <p className="cursive-category-summary">
                    {CURSIVE_CATEGORY_SUMMARIES[option.slug]}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
