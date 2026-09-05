import { z } from "zod";

export const toolNameSchema = z.enum([
  "search_catalog",
  "get_product",
  "check_price",
  "select_product",
  "set_quantity",
  "select_merchant",
  "prepare_checkout",
]);

export type ToolName = z.infer<typeof toolNameSchema>;

export const toolCallSchema = z.object({
  tool: toolNameSchema,
  parameters: z.record(z.string(), z.unknown()),
});

export type ToolCall = z.infer<typeof toolCallSchema>;

export interface CatalogProduct {
  id: string;
  name: string;
  category: "Electronics" | "Office" | "Travel" | "Services";
  merchant: string;
  amount: number;
  currency: "INR";
  destination: string;
  inStock: boolean;
  description: string;
  environment: "SANDBOX_CATALOG";
}

export const SANDBOX_CATALOG: CatalogProduct[] = [
  {
    id: "prod-headphones-01",
    name: "Sony WH-1000XM4 Wireless Noise Cancelling Headphones",
    category: "Electronics",
    merchant: "Croma Digital",
    amount: 24990,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Industry-leading noise cancelling wireless headphones with 30h battery.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-headphones-02",
    name: "Boat Rockerz 450 Wireless Bluetooth Headphones",
    category: "Electronics",
    merchant: "Croma Digital",
    amount: 1499,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Budget wireless on-ear headphones with 15h playback.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-headphones-high",
    name: "Sennheiser HE 1 Luxury Audiophile Flagship Headphones",
    category: "Electronics",
    merchant: "Croma Digital",
    amount: 75000,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Ultra-luxury reference electrostatic headphone system.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-headphones-untrusted",
    name: "Generic Beats Knockoff Unbranded Audio",
    category: "Electronics",
    merchant: "Untrusted Overseas Vendor",
    amount: 4999,
    currency: "INR",
    destination: "unknown-destination",
    inStock: true,
    description: "Uncertified overseas audio electronics with unverified origin.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-laptop-01",
    name: "ThinkPad Enterprise Business Laptop",
    category: "Electronics",
    merchant: "Croma Digital",
    amount: 47999,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Enterprise workstation laptop with Intel Core i7 and 16GB RAM.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-laptop-flagship",
    name: "Ultra Max Pro Extreme Workstation",
    category: "Electronics",
    merchant: "Unknown Electronics Hub",
    amount: 149000,
    currency: "INR",
    destination: "unknown-destination",
    inStock: true,
    description: "High-spec workstation exceeding typical organizational spending caps.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-backpack-01",
    name: "Ergonomic Commuter Laptop Backpack",
    category: "Office",
    merchant: "OfficeMart",
    amount: 3499,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Water-resistant commuter backpack with dedicated padded laptop sleeve.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-monitor-01",
    name: "Dell UltraSharp 27-inch 4K Monitor",
    category: "Electronics",
    merchant: "Croma Digital",
    amount: 28000,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Dell UltraSharp 27-inch 4K IPS display for professional developer and office workstations.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-monitor-02",
    name: "Office 4K UltraWide Ergonomic Monitor",
    category: "Office",
    merchant: "OfficeMart",
    amount: 28000,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "32-inch 4K IPS display for professional developer and design workstations.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-hotel-01",
    name: "Skyline Hotels Deluxe Business Room (Bengaluru)",
    category: "Travel",
    merchant: "Skyline Hotels",
    amount: 18200,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Corporate approved 3-night lodging with business lounge access.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-hotel-unverified",
    name: "Grand Imperial Suites Presidential Penthouse",
    category: "Travel",
    merchant: "Grand Imperial Suites",
    amount: 32000,
    currency: "INR",
    destination: "unverified-vendor",
    inStock: true,
    description: "Unverified luxury boutique hotel suite exceeding typical tier threshold.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-train-01",
    name: "Indian Railway AC First Tier Express Transit",
    category: "Travel",
    merchant: "Railway Tickets",
    amount: 3100,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Corporate approved regional intercity transit ticket.",
    environment: "SANDBOX_CATALOG",
  },
  {
    id: "prod-cab-01",
    name: "Metro Cab Airport Express Shuttle",
    category: "Travel",
    merchant: "Metro Cab",
    amount: 1200,
    currency: "INR",
    destination: "approved-merchant",
    inStock: true,
    description: "Standard ground transportation to commercial airport.",
    environment: "SANDBOX_CATALOG",
  },
];

// Tool parameter schemas
export const searchCatalogSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  step: z.string().optional(),
});

export const getProductSchema = z.object({
  productId: z.string().min(1),
});

export const checkPriceSchema = z.object({
  productId: z.string().min(1),
});

export const selectProductSchema = z.object({
  productId: z.string().min(1),
});

export const setQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(10),
});

export const selectMerchantSchema = z.object({
  merchant: z.string().min(1),
});

export const prepareCheckoutSchema = z.object({
  productId: z.string().min(1),
  merchant: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default("INR"),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  category: z.string().default("Electronics"),
  destination: z.string().default("approved-merchant"),
});

export const TOOL_DESCRIPTIONS = [
  {
    name: "search_catalog",
    description: "Search available products in the sandbox catalog by category, keyword query, or max price limit.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query e.g. 'headphones', 'laptop', 'hotel'" },
        category: { type: "string", description: "Product category: 'Electronics', 'Office', 'Travel'" },
        maxPrice: { type: "number", description: "Optional upper bound for price in INR" },
      },
    },
  },
  {
    name: "get_product",
    description: "Retrieve comprehensive specifications and merchant information for a specific product ID.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product ID from search results" },
      },
      required: ["productId"],
    },
  },
  {
    name: "check_price",
    description: "Verify the authoritative real-time unit price and currency for a catalog product.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product ID to verify pricing for" },
      },
      required: ["productId"],
    },
  },
  {
    name: "select_product",
    description: "Lock in a catalog product candidate for checkout preparation.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "Product ID to select" },
      },
      required: ["productId"],
    },
  },
  {
    name: "set_quantity",
    description: "Set the desired purchase quantity (1-10).",
    parameters: {
      type: "object",
      properties: {
        quantity: { type: "number", description: "Quantity integer between 1 and 10" },
      },
      required: ["quantity"],
    },
  },
  {
    name: "select_merchant",
    description: "Select the merchant or vendor fulfillment entity for the order.",
    parameters: {
      type: "object",
      properties: {
        merchant: { type: "string", description: "Merchant name" },
      },
      required: ["merchant"],
    },
  },
  {
    name: "prepare_checkout",
    description: "Finalize cart payload before payment gateway handoff. Required terminal step.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        merchant: { type: "string" },
        amount: { type: "number" },
        quantity: { type: "number" },
        category: { type: "string" },
        destination: { type: "string" },
      },
      required: ["productId", "merchant", "amount"],
    },
  },
];

export function executeTool(call: ToolCall): Record<string, unknown> {
  const envMeta = { environment: "SANDBOX_CATALOG" as const };

  switch (call.tool) {
    case "search_catalog": {
      const params = searchCatalogSchema.parse(call.parameters);
      const queryStr = (params.query ?? "").toLowerCase().trim();
      const catStr = (params.category ?? "").toLowerCase().trim();

      const filtered = SANDBOX_CATALOG.filter((item) => {
        if (catStr && item.category.toLowerCase() !== catStr && !item.name.toLowerCase().includes(catStr)) {
          return false;
        }
        if (queryStr) {
          const itemText = `${item.name} ${item.description} ${item.category} ${item.merchant}`.toLowerCase();
          const matchExact = itemText.includes(queryStr);
          const tokens = queryStr.split(/[\s,.-]+/).filter((t) => t.length >= 2);
          const matchTokens = tokens.length > 0 && tokens.some((t) => itemText.includes(t));
          if (!matchExact && !matchTokens) return false;
        }
        if (params.maxPrice !== undefined && item.amount > params.maxPrice) {
          return false;
        }
        return true;
      });

      return {
        ...envMeta,
        count: filtered.length,
        products: filtered.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          merchant: p.merchant,
          amount: p.amount,
          currency: p.currency,
          destination: p.destination,
        })),
      };
    }

    case "get_product": {
      const params = getProductSchema.parse(call.parameters);
      const found = SANDBOX_CATALOG.find((p) => p.id === params.productId);
      if (!found) {
        return { ...envMeta, error: `Product '${params.productId}' not found in sandbox catalog.` };
      }
      return { ...envMeta, product: found };
    }

    case "check_price": {
      const params = checkPriceSchema.parse(call.parameters);
      const product = SANDBOX_CATALOG.find((p) => p.id === params.productId);
      if (!product) {
        return { ...envMeta, error: `Product '${params.productId}' not found in sandbox catalog.` };
      }
      return {
        ...envMeta,
        productId: product.id,
        name: product.name,
        amount: product.amount,
        currency: product.currency,
        merchant: product.merchant,
      };
    }

    case "select_product": {
      const params = selectProductSchema.parse(call.parameters);
      const product = SANDBOX_CATALOG.find((p) => p.id === params.productId);
      return {
        ...envMeta,
        selectedProductId: params.productId,
        productName: product?.name ?? "Unknown item",
        amount: product?.amount ?? 0,
        merchant: product?.merchant ?? "Unknown",
        category: product?.category ?? "Electronics",
        destination: product?.destination ?? "unknown-destination",
      };
    }

    case "set_quantity": {
      const params = setQuantitySchema.parse(call.parameters);
      return {
        ...envMeta,
        quantity: params.quantity,
      };
    }

    case "select_merchant": {
      const params = selectMerchantSchema.parse(call.parameters);
      return {
        ...envMeta,
        merchant: params.merchant,
      };
    }

    case "prepare_checkout": {
      const params = prepareCheckoutSchema.parse(call.parameters);
      return {
        ...envMeta,
        checkoutPrepared: true,
        productId: params.productId,
        merchant: params.merchant,
        amount: params.amount,
        currency: params.currency,
        quantity: params.quantity,
        category: params.category,
        destination: params.destination,
      };
    }
  }
}
