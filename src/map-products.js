function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function getLocalizedValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    return (
      value.pt ||
      value["pt-BR"] ||
      value.pt_BR ||
      value.es ||
      value.en ||
      Object.values(value).find((v) => typeof v === "string") ||
      ""
    );
  }

  return "";
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return number.toFixed(2);
}

function normalizeAvailability(stock) {
  const qty = Number(stock || 0);
  return qty > 0 ? "in stock" : "out of stock";
}

function buildProductUrl(handle) {
  const storeUrl = process.env.STORE_URL?.replace(/\/$/, "");

  if (!storeUrl) {
    throw new Error("STORE_URL não definido.");
  }

  const normalizedHandle = getLocalizedValue(handle);

  if (!normalizedHandle) return storeUrl;

  return `${storeUrl}/produtos/${normalizedHandle}`;
}

function getMainImage(product, variant) {
  const variantImage = firstDefined(
    variant?.image?.src,
    variant?.image?.url,
    variant?.image?.https
  );

  if (variantImage) return variantImage;

  const firstProductImage = Array.isArray(product.images) ? product.images[0] : null;

  return firstDefined(
    firstProductImage?.src,
    firstProductImage?.url,
    firstProductImage?.https,
    product.featured_image?.src,
    product.featured_image?.url
  );
}

function buildVariantTitle(productName, variant) {
  const parts = [];

  if (Array.isArray(variant?.values)) {
    for (const value of variant.values) {
      if (typeof value === "string") parts.push(value);
      else if (value?.value) parts.push(value.value);
      else if (value?.name) parts.push(value.name);
    }
  }

  if (Array.isArray(variant?.attributes)) {
    for (const attr of variant.attributes) {
      const value = firstDefined(attr?.value, attr?.name);
      if (value) parts.push(value);
    }
  }

  const uniqueParts = [...new Set(parts.filter(Boolean))];

  return uniqueParts.length
    ? `${productName} - ${uniqueParts.join(" / ")}`
    : productName;
}

function buildDescription(product) {
  return stripHtml(
    getLocalizedValue(
      firstDefined(product.description, product.description_html, product.seo_description)
    )
  );
}

function getBrand(product) {
  return firstDefined(
    product.brand,
    product.vendor,
    product.manufacturer,
    process.env.DEFAULT_BRAND,
    "Sem marca"
  );
}

function buildBaseItem(product) {
  const name = getLocalizedValue(product.name);
  const description = buildDescription(product);
  const link = buildProductUrl(product.handle);
  const brand = getBrand(product);

  return {
    baseId: String(product.id),
    title: name,
    description,
    link,
    brand,
    condition: "new",
    itemGroupId: String(product.id)
  };
}

function mapSimpleProduct(product, baseItem) {
  const imageLink = getMainImage(product, null);
  const price = normalizePrice(firstDefined(product.promotional_price, product.price));
  const stock = firstDefined(product.stock, product.inventory, 0);

  if (!baseItem.title || !imageLink || !price) return null;

  return {
    id: baseItem.baseId,
    title: baseItem.title,
    description: baseItem.description,
    availability: normalizeAvailability(stock),
    condition: baseItem.condition,
    price,
    salePrice: product.promotional_price ? normalizePrice(product.promotional_price) : null,
    link: baseItem.link,
    imageLink,
    brand: baseItem.brand,
    itemGroupId: null
  };
}

function mapVariantProduct(product, baseItem, variant) {
  const imageLink = getMainImage(product, variant);
  const price = normalizePrice(firstDefined(variant.price, product.price));
  const stock = firstDefined(variant.stock, variant.inventory, 0);

  if (!imageLink || !price) return null;

  return {
    id: String(firstDefined(variant.sku, variant.id, `${product.id}-variant`)),
    title: buildVariantTitle(baseItem.title, variant),
    description: baseItem.description,
    availability: normalizeAvailability(stock),
    condition: baseItem.condition,
    price,
    salePrice: variant.promotional_price ? normalizePrice(variant.promotional_price) : null,
    link: baseItem.link,
    imageLink,
    brand: baseItem.brand,
    itemGroupId: baseItem.itemGroupId
  };
}

function isVisibleProduct(product) {
  if (product.published === false) return false;
  if (product.visible === false) return false;
  if (product.active === false) return false;
  return true;
}

export function mapProductsToFeedItems(products) {
  const items = [];

  for (const product of products) {
    if (!isVisibleProduct(product)) continue;

    const baseItem = buildBaseItem(product);
    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (variants.length > 0) {
      for (const variant of variants) {
        const item = mapVariantProduct(product, baseItem, variant);
        if (item) items.push(item);
      }
    } else {
      const item = mapSimpleProduct(product, baseItem);
      if (item) items.push(item);
    }
  }

  return items;
}
