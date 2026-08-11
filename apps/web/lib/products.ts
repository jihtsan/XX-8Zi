export type Variant = {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
};

export type Product = {
  id: number;
  slug: string;
  code: string;
  name: string;
  category: string;
  description: string;
  material: string;
  image: string;
  variants: Variant[];
};

type ApiProduct = {
  id: number;
  slug: string;
  code: string;
  name: string;
  category: string;
  description: string;
  material: string;
  variants: Array<{ id: number; name: string; reference_price: number; in_stock: boolean }>;
};

export const products: Product[] = [
  {
    id: 1,
    slug: "amethyst-star-orbit",
    code: "CRYSTAL-101",
    name: "紫晶星轨",
    category: "水晶系列",
    description: "深浅紫晶珠体依次排列，保留天然冰裂与棉絮纹理，以一枚克制的银色隔珠收束。",
    material: "天然紫水晶 / 925银隔珠 / 弹力线",
    image: "/asset/picture/amethyst-star-orbit.jpg",
    variants: [
      { id: 1, name: "8mm / 16cm", price: 298, inStock: true },
      { id: 2, name: "10mm / 17cm", price: 368, inStock: true },
    ],
  },
  {
    id: 2,
    slug: "green-phantom-garden",
    code: "CRYSTAL-102",
    name: "绿幽灵庭",
    category: "水晶系列",
    description: "清透石英中分布苔绿色绿泥石包裹体，每颗珠子的层次与形态均有自然差异。",
    material: "天然绿幽灵水晶 / 弹力线",
    image: "/asset/picture/green-phantom-garden.jpg",
    variants: [{ id: 3, name: "9mm / 16cm", price: 428, inStock: true }],
  },
  {
    id: 3,
    slug: "gold-rutile-current",
    code: "CRYSTAL-103",
    name: "金发晶流光",
    category: "水晶系列",
    description: "通透晶体中可见细密而不规则的金色针状包裹体，光线下呈现自然层次。",
    material: "天然金发晶 / 弹力线",
    image: "/asset/picture/gold-rutile-current.jpg",
    variants: [{ id: 4, name: "10mm / 17cm", price: 628, inStock: true }],
  },
];

export function formatPrice(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function productPrice(product: Product) {
  const prices = product.variants.map((variant) => variant.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`;
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

function mapApiProduct(product: ApiProduct): Product {
  const fallback = products.find((item) => item.slug === product.slug);
  return {
    id: product.id,
    slug: product.slug,
    code: product.code,
    name: product.name,
    category: product.category,
    description: product.description,
    material: product.material,
    image: fallback?.image ?? "/asset/picture/amethyst-star-orbit.jpg",
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.reference_price,
      inStock: variant.in_stock,
    })),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
  try {
    const response = await fetch(`${apiUrl}/catalog/products`, { cache: "no-store" });
    if (!response.ok) return products;
    return ((await response.json()) as ApiProduct[]).map(mapApiProduct);
  } catch {
    return products;
  }
}

export async function fetchProduct(slug: string): Promise<Product | undefined> {
  return (await fetchProducts()).find((product) => product.slug === slug);
}
