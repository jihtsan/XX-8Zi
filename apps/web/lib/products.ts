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
  tone: { primary: string; secondary: string; glow: string };
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
    slug: "amethyst-orbit",
    code: "CRYSTAL-001",
    name: "紫晶轨道",
    category: "水晶系列",
    description: "深浅紫晶交错排列，保留天然冰裂与棉絮纹理，整体气质安静而有秩序。",
    material: "天然紫水晶 / 弹力线",
    tone: { primary: "#b99be8", secondary: "#5c3f7c", glow: "#eadcff" },
    variants: [
      { id: 1, name: "8mm / 16cm", price: 268, inStock: true },
      { id: 2, name: "10mm / 17cm", price: 328, inStock: true },
    ],
  },
  {
    id: 2,
    slug: "obsidian-signal",
    code: "CRYSTAL-004",
    name: "黑曜信号",
    category: "水晶系列",
    description: "黑曜石珠体在侧光下呈现克制光泽，搭配一颗银色几何隔珠。",
    material: "天然黑曜石 / 合金隔珠",
    tone: { primary: "#28292c", secondary: "#08090a", glow: "#858891" },
    variants: [{ id: 3, name: "10mm / 17cm", price: 198, inStock: true }],
  },
  {
    id: 3,
    slug: "moonstone-phase",
    code: "CRYSTAL-009",
    name: "月光相位",
    category: "水晶系列",
    description: "乳白月光石带有柔和蓝光，珠体通透度与光带因天然差异而不同。",
    material: "天然月光石 / 弹力线",
    tone: { primary: "#e5e7dc", secondary: "#96a3b7", glow: "#ffffff" },
    variants: [{ id: 4, name: "8mm / 16cm", price: 388, inStock: false }],
  },
  {
    id: 4,
    slug: "sandalwood-cycle",
    code: "BEADS-003",
    name: "檀木周期",
    category: "木质佛珠",
    description: "暖棕檀木珠串，表面保留细密木纹，适合日常佩戴与盘玩。",
    material: "檀木 / 棉线",
    tone: { primary: "#9d6647", secondary: "#3b2118", glow: "#d7a176" },
    variants: [{ id: 5, name: "8mm / 108颗", price: 168, inStock: true }],
  },
  {
    id: 5,
    slug: "tiger-eye-coordinate",
    code: "CRYSTAL-012",
    name: "虎眼坐标",
    category: "天然饰品",
    description: "金棕虎眼石随角度出现平行光带，色泽沉稳，颗粒差异清晰可见。",
    material: "天然虎眼石 / 弹力线",
    tone: { primary: "#c38a3d", secondary: "#4a2a0f", glow: "#f0c46f" },
    variants: [{ id: 6, name: "10mm / 17cm", price: 228, inStock: true }],
  },
  {
    id: 6,
    slug: "white-crystal-index",
    code: "CRYSTAL-018",
    name: "白晶索引",
    category: "天然饰品",
    description: "透明白水晶与磨砂银色隔珠组合，结构简洁，适合叠戴。",
    material: "天然白水晶 / 合金隔珠",
    tone: { primary: "#f2f1ec", secondary: "#aeb2b4", glow: "#ffffff" },
    variants: [{ id: 7, name: "8mm / 16cm", price: 188, inStock: true }],
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
    tone: fallback?.tone ?? { primary: "#9B86C8", secondary: "#30283d", glow: "#e8ddff" },
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
