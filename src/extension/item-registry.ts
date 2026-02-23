// Item definitions for Token Acres inventory system

export interface ItemDefinition {
  id: string;
  name: string;
  category: 'seed' | 'crop' | 'animal_product' | 'processed' | 'tool' | 'material';
  maxStack: number;
  sellValue?: number;      // in Seeds 🌱, if sellable
  description: string;
  icon?: string;           // sprite key for rendering
}

export interface ItemStack {
  itemId: string;        // e.g. 'turnip_seed', 'turnip', 'strawberry', 'milk'
  quantity: number;      // how many in this stack
  maxStack: number;      // max per stack (from ItemDefinition)
}

// Item Registry - All available items in the game
export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  // Seeds
  'turnip_seed': {
    id: 'turnip_seed',
    name: 'Turnip Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 2,
    description: 'Fast-growing spring seeds for turnips.',
    icon: 'seed-turnip'
  },
  'potato_seed': {
    id: 'potato_seed',
    name: 'Potato Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 3,
    description: 'Hardy potato seeds that grow well in spring.',
    icon: 'seed-potato'
  },
  'strawberry_seed': {
    id: 'strawberry_seed',
    name: 'Strawberry Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 5,
    description: 'Sweet berry seeds that regrow after harvest.',
    icon: 'seed-strawberry'
  },
  'tomato_seed': {
    id: 'tomato_seed',
    name: 'Tomato Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 4,
    description: 'Juicy summer tomato seeds.',
    icon: 'seed-tomato'
  },
  'corn_seed': {
    id: 'corn_seed',
    name: 'Corn Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 5,
    description: 'Tall corn that grows in summer heat.',
    icon: 'seed-corn'
  },
  'carrot_seed': {
    id: 'carrot_seed',
    name: 'Carrot Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 2,
    description: 'Quick-growing orange root vegetables.',
    icon: 'seed-carrot'
  },
  'parsnip_seed': {
    id: 'parsnip_seed',
    name: 'Parsnip Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 3,
    description: 'Hardy winter root vegetables.',
    icon: 'seed-parsnip'
  },
  'pepper_seed': {
    id: 'pepper_seed',
    name: 'Pepper Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 5,
    description: 'Spicy summer peppers that regrow.',
    icon: 'seed-pepper'
  },
  'pumpkin_seed': {
    id: 'pumpkin_seed',
    name: 'Pumpkin Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 10,
    description: 'Large orange pumpkins for fall.',
    icon: 'seed-pumpkin'
  },
  'sunflower_seed': {
    id: 'sunflower_seed',
    name: 'Sunflower Seeds',
    category: 'seed',
    maxStack: 64,
    sellValue: 4,
    description: 'Tall flowers that attract bees.',
    icon: 'seed-sunflower'
  },
  'appletree_seed': {
    id: 'appletree_seed',
    name: 'Apple Tree Seedling',
    category: 'seed',
    maxStack: 16,
    sellValue: 15,
    description: 'Long-term fruit tree investment.',
    icon: 'seed-appletree'
  },
  'lemontree_seed': {
    id: 'lemontree_seed',
    name: 'Lemon Tree Seedling',
    category: 'seed',
    maxStack: 16,
    sellValue: 12,
    description: 'Citrus tree with regular harvests.',
    icon: 'seed-lemontree'
  },

  // Harvested Crops
  'turnip': {
    id: 'turnip',
    name: 'Turnip',
    category: 'crop',
    maxStack: 64,
    sellValue: 5,
    description: 'A simple, fast-growing root vegetable.',
    icon: 'crop-turnip'
  },
  'potato': {
    id: 'potato',
    name: 'Potato',
    category: 'crop',
    maxStack: 64,
    sellValue: 8,
    description: 'Versatile and filling tuber.',
    icon: 'crop-potato'
  },
  'strawberry': {
    id: 'strawberry',
    name: 'Strawberry',
    category: 'crop',
    maxStack: 64,
    sellValue: 15,
    description: 'Sweet red berries, perfect for desserts.',
    icon: 'crop-strawberry'
  },
  'tomato': {
    id: 'tomato',
    name: 'Tomato',
    category: 'crop',
    maxStack: 64,
    sellValue: 12,
    description: 'Juicy summer tomatoes.',
    icon: 'crop-tomato'
  },
  'corn': {
    id: 'corn',
    name: 'Corn',
    category: 'crop',
    maxStack: 64,
    sellValue: 14,
    description: 'Golden ears of corn.',
    icon: 'crop-corn'
  },
  'melon': {
    id: 'melon',
    name: 'Melon',
    category: 'crop',
    maxStack: 32,
    sellValue: 20,
    description: 'Large, sweet summer melons.',
    icon: 'crop-melon'
  },
  'pumpkin': {
    id: 'pumpkin',
    name: 'Pumpkin',
    category: 'crop',
    maxStack: 16,
    sellValue: 30,
    description: 'Big orange pumpkins for fall harvest.',
    icon: 'crop-pumpkin'
  },
  'starfruit': {
    id: 'starfruit',
    name: 'Starfruit',
    category: 'crop',
    maxStack: 32,
    sellValue: 50,
    description: 'Exotic star-shaped fruit, very valuable.',
    icon: 'crop-starfruit'
  },
  'grape': {
    id: 'grape',
    name: 'Grapes',
    category: 'crop',
    maxStack: 64,
    sellValue: 18,
    description: 'Clusters of sweet grapes from the vine.',
    icon: 'crop-grape'
  },
  'yam': {
    id: 'yam',
    name: 'Yam',
    category: 'crop',
    maxStack: 64,
    sellValue: 10,
    description: 'Nutritious fall root vegetable.',
    icon: 'crop-yam'
  },
  'sunflower': {
    id: 'sunflower',
    name: 'Sunflower',
    category: 'crop',
    maxStack: 64,
    sellValue: 12,
    description: 'Bright yellow flowers that attract bees.',
    icon: 'crop-sunflower'
  },
  'carrot': {
    id: 'carrot',
    name: 'Carrot',
    category: 'crop',
    maxStack: 64,
    sellValue: 6,
    description: 'Crunchy orange root vegetable.',
    icon: 'crop-carrot'
  },
  'parsnip': {
    id: 'parsnip',
    name: 'Parsnip',
    category: 'crop',
    maxStack: 64,
    sellValue: 7,
    description: 'Sweet winter root vegetable.',
    icon: 'crop-parsnip'
  },
  'pepper': {
    id: 'pepper',
    name: 'Pepper',
    category: 'crop',
    maxStack: 64,
    sellValue: 14,
    description: 'Spicy colorful peppers.',
    icon: 'crop-pepper'
  },
  'apple': {
    id: 'apple',
    name: 'Apple',
    category: 'crop',
    maxStack: 64,
    sellValue: 40,
    description: 'Fresh crisp apples from the tree.',
    icon: 'crop-apple'
  },
  'lemon': {
    id: 'lemon',
    name: 'Lemon',
    category: 'crop',
    maxStack: 64,
    sellValue: 35,
    description: 'Tart citrus lemons.',
    icon: 'crop-lemon'
  },

  // Golden Variants (rare, high value)
  'golden_turnip': {
    id: 'golden_turnip',
    name: 'Golden Turnip',
    category: 'crop',
    maxStack: 64,
    sellValue: 15,
    description: 'A rare, shimmering golden turnip.',
    icon: 'crop-turnip-golden'
  },
  'golden_potato': {
    id: 'golden_potato',
    name: 'Golden Potato',
    category: 'crop',
    maxStack: 64,
    sellValue: 24,
    description: 'A precious golden potato.',
    icon: 'crop-potato-golden'
  },
  'golden_strawberry': {
    id: 'golden_strawberry',
    name: 'Golden Strawberry',
    category: 'crop',
    maxStack: 64,
    sellValue: 45,
    description: 'Legendary golden berries of incredible sweetness.',
    icon: 'crop-strawberry-golden'
  },
  'golden_tomato': {
    id: 'golden_tomato',
    name: 'Golden Tomato',
    category: 'crop',
    maxStack: 64,
    sellValue: 36,
    description: 'Radiant golden tomatoes.',
    icon: 'crop-tomato-golden'
  },
  'golden_corn': {
    id: 'golden_corn',
    name: 'Golden Corn',
    category: 'crop',
    maxStack: 64,
    sellValue: 42,
    description: 'Gleaming golden corn kernels.',
    icon: 'crop-corn-golden'
  },
  'golden_carrot': {
    id: 'golden_carrot',
    name: 'Golden Carrot',
    category: 'crop',
    maxStack: 64,
    sellValue: 18,
    description: 'Brilliant golden carrots.',
    icon: 'crop-carrot-golden'
  },
  'golden_parsnip': {
    id: 'golden_parsnip',
    name: 'Golden Parsnip',
    category: 'crop',
    maxStack: 64,
    sellValue: 21,
    description: 'Radiant golden parsnips.',
    icon: 'crop-parsnip-golden'
  },
  'golden_pepper': {
    id: 'golden_pepper',
    name: 'Golden Pepper',
    category: 'crop',
    maxStack: 64,
    sellValue: 42,
    description: 'Precious golden peppers.',
    icon: 'crop-pepper-golden'
  },
  'golden_apple': {
    id: 'golden_apple',
    name: 'Golden Apple',
    category: 'crop',
    maxStack: 64,
    sellValue: 120,
    description: 'Legendary golden apples.',
    icon: 'crop-apple-golden'
  },
  'golden_lemon': {
    id: 'golden_lemon',
    name: 'Golden Lemon',
    category: 'crop',
    maxStack: 64,
    sellValue: 105,
    description: 'Gleaming golden citrus.',
    icon: 'crop-lemon-golden'
  },

  // Special crops
  'clover': {
    id: 'clover',
    name: 'Clover',
    category: 'material',
    maxStack: 64,
    sellValue: undefined, // Not sellable directly, but compostable
    description: 'Cover crop that enriches soil. Can be composted.',
    icon: 'crop-clover'
  }
};

/**
 * Get item definition by ID
 */
export function getItem(itemId: string): ItemDefinition | undefined {
  return ITEM_REGISTRY[itemId];
}

/**
 * Get all items by category
 */
export function getItemsByCategory(category: ItemDefinition['category']): ItemDefinition[] {
  return Object.values(ITEM_REGISTRY).filter(item => item.category === category);
}

/**
 * Get crop type to harvested item mapping
 */
export function cropToHarvestItem(cropType: string, isGolden: boolean = false): string {
  if (isGolden) {
    const goldenMapping: Record<string, string> = {
      'turnip': 'golden_turnip',
      'potato': 'golden_potato',
      'strawberry': 'golden_strawberry',
      'tomato': 'golden_tomato',
      'corn': 'golden_corn',
      'carrot': 'golden_carrot',
      'parsnip': 'golden_parsnip',
      'pepper': 'golden_pepper',
      'appletree': 'golden_apple',
      'lemontree': 'golden_lemon',
    };
    return goldenMapping[cropType] || cropType;
  }
  
  // Regular crop to item mapping - trees produce different items
  const cropMapping: Record<string, string> = {
    'appletree': 'apple',
    'lemontree': 'lemon',
  };
  return cropMapping[cropType] || cropType;
}

/**
 * Create a new item stack
 */
export function createItemStack(itemId: string, quantity: number): ItemStack | null {
  const definition = getItem(itemId);
  if (!definition) {
    console.warn(`Unknown item: ${itemId}`);
    return null;
  }

  return {
    itemId,
    quantity: Math.max(0, quantity),
    maxStack: definition.maxStack
  };
}