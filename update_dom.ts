import fs from "fs";

const filePath = "src/App.tsx";
let content = fs.readFileSync(filePath, "utf8");

// 1. Scale initial loading tickPriceStep by compressionMultiplier
const originalLoaderText = `    // Orderbook compression (Decoupled: Spot is 5000, Futures remains tickStep)
    const tickPriceStep = isBtc
      ? marketType === "FUTURES"
        ? 0.25
        : 5.0
      : marketType === "FUTURES"
        ? 0.005
        : 0.01;`;

const replacementLoaderText = `    // Orderbook compression (Decoupled: Spot is 5000, Futures remains tickStep)
    const tickPriceStep =
      (isBtc
        ? marketType === "FUTURES"
          ? 0.25
          : 5.0
        : marketType === "FUTURES"
          ? 0.005
          : 0.01) * compressionMultiplier;`;

if (content.includes(originalLoaderText)) {
  content = content.replace(originalLoaderText, replacementLoaderText);
  console.log("Successfully replaced loader tickPriceStep!");
} else {
  // Let's try matching with different spacing or line-endings
  console.log("loader tickPriceStep original text NOT found directly, trying lenient replace...");
  const regex = /const tickPriceStep = isBtc\s*\?\s*marketType === "FUTURES"\s*\?\s*0\.25\s*:\s*5\.0\s*:\s*marketType === "FUTURES"\s*\?\s*0\.005\s*:\s*0\.01;/;
  if (regex.test(content)) {
    content = content.replace(regex, `const tickPriceStep = (isBtc ? (marketType === "FUTURES" ? 0.25 : 5.0) : (marketType === "FUTURES" ? 0.005 : 0.01)) * compressionMultiplier;`);
    console.log("Lenient replaced loader tickPriceStep!");
  }
}

// 2. Scale WS tickPriceStep by compressionMultiplier
const originalWsText = `        // Update Order Book on every tick with decoupled price steps
        const isBtc = activePair.symbol.toUpperCase().includes("BTC");
        const tickPriceStep = isBtc
          ? marketType === "FUTURES"
            ? 0.25
            : 5.0
          : marketType === "FUTURES"
            ? 0.005
            : 0.01;`;

const replacementWsText = `        // Update Order Book on every tick with decoupled price steps
        const isBtc = activePair.symbol.toUpperCase().includes("BTC");
        const tickPriceStep =
          (isBtc
            ? marketType === "FUTURES"
              ? 0.25
              : 5.0
            : marketType === "FUTURES"
              ? 0.005
              : 0.01) * compressionMultiplier;`;

if (content.includes(originalWsText)) {
  content = content.replace(originalWsText, replacementWsText);
  console.log("Successfully replaced WS tickPriceStep!");
}

// 3. Update DOMSidebar priceStep prop
const originalDomSidebarText = `            {/* DOM SIDEBAR TIGHT INGRESS PANEL */}
            <div className="w-[320px] flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-950/20 p-2 overflow-hidden backdrop-blur-md shrink-0">
              <DOMSidebar
                orderBook={orderBook}
                lastPrice={lastPrice}
                priceStep={tickStep}`;

const replacementDomSidebarText = `            {/* DOM SIDEBAR TIGHT INGRESS PANEL */}
            <div className="w-[320px] flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-950/20 p-2 overflow-hidden backdrop-blur-md shrink-0">
              <DOMSidebar
                orderBook={orderBook}
                lastPrice={lastPrice}
                priceStep={
                  (isBtc
                    ? marketType === "FUTURES"
                      ? 0.25
                      : 5.0
                    : marketType === "FUTURES"
                      ? 0.005
                      : 0.01) * compressionMultiplier
                }`;

if (content.includes(originalDomSidebarText)) {
  content = content.replace(originalDomSidebarText, replacementDomSidebarText);
  console.log("Successfully replaced DOMSidebar priceStep!");
}

fs.writeFileSync(filePath, content, "utf8");
console.log("All replacements written back tosrc/App.tsx!");
