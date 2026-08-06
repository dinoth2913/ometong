/* =========================================================
   OMETONG — CATEGORY / SUBCATEGORY TAXONOMY
   Single source of truth for the frontend. Mirrors the seed data in
   supabase/categories_schema.sql — if you add a subcategory there,
   add it here too.

   It's kept as a static list rather than fetched so filters and the
   Add Listing dropdown render instantly, with no round-trip before
   the page is usable. The database copy is what listings actually
   store against, and what an admin edits.

   Load this BEFORE marketplace.js / add-listing.js.
========================================================= */
(function () {
  "use strict";

  var CATEGORIES = [
    { slug: "electronics", label: "Electronics", icon: "🔌" },
    { slug: "apparel", label: "Apparel & Clothing", icon: "👕" },
    { slug: "textiles", label: "Textiles & Fabrics", icon: "🧵" },
    { slug: "machinery", label: "Machinery", icon: "⚙" },
    { slug: "food", label: "Food & Beverage", icon: "🍽" },
    { slug: "construction", label: "Construction", icon: "🏗" },
    { slug: "packaging", label: "Packaging", icon: "📦" },
    { slug: "services", label: "Services", icon: "🛠" },
    { slug: "logistics", label: "Logistics", icon: "🚚" }
  ];

  var SUBCATEGORIES = {
    electronics: [
      { slug: "smartphones-tablets", label: "Smartphones & Tablets" },
      { slug: "computers-laptops", label: "Computers & Laptops" },
      { slug: "consumer-audio", label: "Consumer Audio" },
      { slug: "home-appliances", label: "Home Appliances" },
      { slug: "industrial-electronics", label: "Industrial Electronics & Sensors" },
      { slug: "lighting-led", label: "Lighting & LED" },
      { slug: "components-semiconductors", label: "Components & Semiconductors" },
      { slug: "cables-accessories", label: "Cables & Accessories" }
    ],
    apparel: [
      { slug: "mens-t-shirts", label: "Men's T-Shirts" },
      { slug: "mens-shirts", label: "Men's Shirts" },
      { slug: "mens-trousers", label: "Men's Trousers & Jeans" },
      { slug: "mens-outerwear", label: "Men's Outerwear" },
      { slug: "mens-activewear", label: "Men's Activewear" },
      { slug: "womens-tops", label: "Women's Tops & Blouses" },
      { slug: "womens-dresses", label: "Women's Dresses" },
      { slug: "womens-trousers", label: "Women's Trousers & Skirts" },
      { slug: "womens-activewear", label: "Women's Activewear (Gym)" },
      { slug: "womens-officewear", label: "Women's Officewear" },
      { slug: "kids-clothing", label: "Kids' & Baby Clothing" },
      { slug: "uniforms-workwear", label: "Uniforms & Workwear" },
      { slug: "footwear", label: "Footwear" },
      { slug: "bags-accessories", label: "Bags & Accessories" }
    ],
    textiles: [
      { slug: "woven-fabrics", label: "Woven Fabrics" },
      { slug: "knitted-fabrics", label: "Knitted Fabrics" },
      { slug: "yarn-thread", label: "Yarn & Thread" },
      { slug: "denim", label: "Denim" },
      { slug: "technical-textiles", label: "Technical & Industrial Textiles" },
      { slug: "home-textiles", label: "Home Textiles" },
      { slug: "leather-synthetics", label: "Leather & Synthetics" }
    ],
    machinery: [
      { slug: "cnc-machine-tools", label: "CNC & Machine Tools" },
      { slug: "packaging-machinery", label: "Packaging Machinery" },
      { slug: "food-machinery", label: "Food Processing Machinery" },
      { slug: "textile-machinery", label: "Textile Machinery" },
      { slug: "construction-machinery", label: "Construction Machinery" },
      { slug: "pumps-compressors", label: "Pumps & Compressors" },
      { slug: "motors-drives", label: "Motors & Drives" },
      { slug: "spare-parts", label: "Spare Parts & Components" }
    ],
    food: [
      { slug: "spices-seasonings", label: "Spices & Seasonings" },
      { slug: "tea-coffee", label: "Tea & Coffee" },
      { slug: "nuts-dried-fruit", label: "Nuts & Dried Fruit" },
      { slug: "edible-oils", label: "Edible Oils" },
      { slug: "grains-pulses", label: "Grains & Pulses" },
      { slug: "beverages", label: "Beverages" },
      { slug: "snacks-confectionery", label: "Snacks & Confectionery" },
      { slug: "seafood", label: "Seafood" }
    ],
    construction: [
      { slug: "cement-aggregates", label: "Cement & Aggregates" },
      { slug: "steel-rebar", label: "Steel & Rebar" },
      { slug: "pipes-fittings", label: "Pipes & Fittings" },
      { slug: "roofing-cladding", label: "Roofing & Cladding" },
      { slug: "doors-windows", label: "Doors & Windows" },
      { slug: "tiles-flooring", label: "Tiles & Flooring" },
      { slug: "paints-coatings", label: "Paints & Coatings" },
      { slug: "tools-hardware", label: "Tools & Hardware" }
    ],
    packaging: [
      { slug: "corrugated-boxes", label: "Corrugated Boxes" },
      { slug: "flexible-packaging", label: "Flexible Packaging & Film" },
      { slug: "bottles-jars", label: "Bottles & Jars" },
      { slug: "labels-printing", label: "Labels & Printing" },
      { slug: "protective-packaging", label: "Protective Packaging" },
      { slug: "pallets-crates", label: "Pallets & Crates" },
      { slug: "bags-sacks", label: "Bags & Sacks" }
    ],
    services: [
      { slug: "quality-inspection", label: "Quality Inspection" },
      { slug: "sourcing-vetting", label: "Sourcing & Supplier Vetting" },
      { slug: "customs-documentation", label: "Customs & Documentation" },
      { slug: "product-design", label: "Product Design" },
      { slug: "certification-testing", label: "Certification & Testing" },
      { slug: "warehousing", label: "Warehousing" },
      { slug: "marketing-photography", label: "Marketing & Photography" }
    ],
    logistics: [
      { slug: "sea-freight", label: "Sea Freight" },
      { slug: "air-freight", label: "Air Freight" },
      { slug: "road-freight", label: "Road Freight" },
      { slug: "rail-freight", label: "Rail Freight" },
      { slug: "courier-express", label: "Courier & Express" },
      { slug: "cold-chain", label: "Cold Chain" },
      { slug: "customs-brokerage", label: "Customs Brokerage" },
      { slug: "last-mile", label: "Last-Mile Delivery" }
    ]
  };

  // Listings store their category as a label ("Food & Beverage"), so
  // both directions are needed when matching listings to filters.
  var labelToSlug = {};
  var slugToLabel = {};
  CATEGORIES.forEach(function (c) {
    labelToSlug[c.label] = c.slug;
    slugToLabel[c.slug] = c.label;
  });
  // Older listings were saved under the previous, shorter labels —
  // keep accepting those so nothing already listed falls out of view.
  labelToSlug["Textiles"] = "textiles";
  labelToSlug["Apparel"] = "apparel";

  var subLabelBySlug = {};
  Object.keys(SUBCATEGORIES).forEach(function (cat) {
    SUBCATEGORIES[cat].forEach(function (s) { subLabelBySlug[s.slug] = s.label; });
  });

  window.ometongTaxonomy = {
    categories: CATEGORIES,
    subcategories: SUBCATEGORIES,
    categoryLabelToSlug: labelToSlug,
    categorySlugToLabel: slugToLabel,
    subcategoriesFor: function (categorySlug) { return SUBCATEGORIES[categorySlug] || []; },
    subcategoryLabel: function (slug) { return subLabelBySlug[slug] || null; }
  };
})();
