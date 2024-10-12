// Fonction pour calculer et afficher les alertes de slippage
function checkSlippage(price: any, quote: any) {
  // Calcule le slippage en comparant le prix estimé avec le prix réel
  const expectedPrice = parseFloat(price.price);
  const actualPrice = parseFloat(quote.price);

  const slippage = ((actualPrice - expectedPrice) / expectedPrice) * 100;

  console.log(`Expected Price: ${expectedPrice}`);
  console.log(`Actual Price: ${actualPrice}`);
  console.log(`Slippage: ${slippage.toFixed(2)}%`);

  // Si le slippage dépasse 1 %, alerte l'utilisateur
  if (slippage > 1) {
    console.log("⚠️ Alerte : Le slippage est trop élevé (> 1%) ! Transaction à risque.");
  }
  // Si le slippage est inférieur à 0.1 %, opportunité avantageuse
  else if (slippage < 0.1) {
    console.log("✅ Opportunité : Le slippage est très faible (< 0.1%) ! Transaction avantageuse.");
  }
}

// Ajout dans la fonction main
const main = async () => {
  // 4. Affiche toutes les sources de liquidité sur Scroll
  await getLiquiditySources();

  // Spécifier le montant de vente
  const decimals = (await weth.read.decimals()) as number;
  const sellAmount = parseUnits("0.1", decimals);

  // Paramètres de la monétisation (frais d'affiliation et collecte du surplus)
  const affiliateFeeBps = "100"; // 1 %
  const surplusCollection = "true";

  // Récupération du prix avec les paramètres de monétisation
  const priceParams = new URLSearchParams({
    chainId: client.chain.id.toString(),
    sellToken: weth.address,
    buyToken: wsteth.address,
    sellAmount: sellAmount.toString(),
    taker: client.account.address,
    affiliateFee: affiliateFeeBps, // Paramètre pour les frais d'affiliation
    surplusCollection: surplusCollection, // Paramètre pour la collecte du surplus
  });

  const priceResponse = await fetch(
    "https://api.0x.org/swap/permit2/price?" + priceParams.toString(),
    {
      headers,
    }
  );
  const price = await priceResponse.json();

  // Vérifier si une allocation est nécessaire pour Permit2
  if (price.issues.allowance !== null) {
    try {
      const { request } = await weth.simulate.approve([
        price.issues.allowance.spender,
        maxUint256,
      ]);
      console.log("Autorisation du contrat Permit2 pour dépenser du WETH...", request);
      const hash = await weth.write.approve(request.args);
      console.log(
        "Autorisation accordée à Permit2 pour dépenser du WETH.",
        await client.waitForTransactionReceipt({ hash })
      );
    } catch (error) {
      console.log("Erreur lors de l'approbation de Permit2 :", error);
    }
  } else {
    console.log("WETH déjà approuvé pour Permit2");
  }

  // Récupération de la citation avec les paramètres de monétisation
  const quoteParams = new URLSearchParams();
  for (const [key, value] of priceParams.entries()) {
    quoteParams.append(key, value);
  }

  const quoteResponse = await fetch(
    "https://api.0x.org/swap/permit2/quote?" + quoteParams.toString(),
    {
      headers,
    }
  );
  const quote = await quoteResponse.json();

  // Afficher le slippage
  checkSlippage(price, quote);

  // Affichage des sources de liquidité et des taxes
  if (quote.route) {
    displayLiquiditySources(quote.route);
  }
  if (quote.tokenMetadata) {
    displayTokenTaxes(quote.tokenMetadata);
  }
};
