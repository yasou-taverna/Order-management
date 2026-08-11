(function () {
  function tableImageFor(table) {
    if (table.round) return "assets/tables/table-10-round.png";
    return `assets/tables/table-${table.seats}.png`;
  }

  function enhanceTableImages() {
    document.querySelectorAll(".table-tile").forEach(tile => {
      const idText = tile.querySelector(".table-id")?.textContent || "";
      const tableId = Number(idText.trim());
      const table = TABLE_BLUEPRINT.find(item => item.id === tableId);
      if (!table) return;

      tile.classList.add("table-image");
      tile.style.setProperty("--table-image", `url("../${tableImageFor(table)}")`);
      tile.setAttribute("aria-label", `שולחן ${table.id}, ${table.seats} מקומות`);
    });
  }

  const originalRenderTables = window.renderTables;
  if (typeof originalRenderTables === "function") {
    window.renderTables = function () {
      originalRenderTables();
      enhanceTableImages();
    };
  }

  enhanceTableImages();
})();
