// Inventory management system for Token Acres

import { ItemStack, getItem } from './item-registry';

export interface InventoryOperationResult {
  success: boolean;
  processed: number;
  overflow: number;
}

export class InventoryManager {
  /**
   * Add items to an inventory, stacking where possible
   */
  static addItem(
    inventory: ItemStack[], 
    itemId: string, 
    quantity: number, 
    maxSlots: number
  ): InventoryOperationResult {
    if (quantity <= 0) {
      return { success: true, processed: 0, overflow: 0 };
    }

    const definition = getItem(itemId);
    if (!definition) {
      console.warn(`Unknown item: ${itemId}`);
      return { success: false, processed: 0, overflow: quantity };
    }

    let remaining = quantity;
    let processed = 0;

    // First, try to add to existing stacks of the same item
    for (const stack of inventory) {
      if (stack.itemId === itemId && stack.quantity < stack.maxStack) {
        const canAdd = Math.min(remaining, stack.maxStack - stack.quantity);
        stack.quantity += canAdd;
        remaining -= canAdd;
        processed += canAdd;

        if (remaining === 0) {
          return { success: true, processed, overflow: 0 };
        }
      }
    }

    // If we have remaining items and available slots, create new stacks
    while (remaining > 0 && inventory.length < maxSlots) {
      const stackSize = Math.min(remaining, definition.maxStack);
      inventory.push({
        itemId,
        quantity: stackSize,
        maxStack: definition.maxStack
      });
      remaining -= stackSize;
      processed += stackSize;
    }

    return {
      success: remaining === 0,
      processed,
      overflow: remaining
    };
  }

  /**
   * Remove items from an inventory
   */
  static removeItem(
    inventory: ItemStack[], 
    itemId: string, 
    quantity: number
  ): InventoryOperationResult {
    if (quantity <= 0) {
      return { success: true, processed: 0, overflow: 0 };
    }

    let remaining = quantity;
    let processed = 0;

    // Remove from stacks (backwards to allow safe removal during iteration)
    for (let i = inventory.length - 1; i >= 0; i--) {
      const stack = inventory[i];
      if (stack.itemId === itemId) {
        const canRemove = Math.min(remaining, stack.quantity);
        stack.quantity -= canRemove;
        remaining -= canRemove;
        processed += canRemove;

        // Remove empty stacks
        if (stack.quantity === 0) {
          inventory.splice(i, 1);
        }

        if (remaining === 0) {
          return { success: true, processed, overflow: 0 };
        }
      }
    }

    return {
      success: remaining === 0,
      processed,
      overflow: remaining
    };
  }

  /**
   * Get total quantity of an item in inventory
   */
  static getCount(inventory: ItemStack[], itemId: string): number {
    return inventory
      .filter(stack => stack.itemId === itemId)
      .reduce((total, stack) => total + stack.quantity, 0);
  }

  /**
   * Check if inventory has space for items
   */
  static hasSpace(
    inventory: ItemStack[], 
    itemId: string, 
    quantity: number, 
    maxSlots: number
  ): boolean {
    if (quantity <= 0) return true;

    const definition = getItem(itemId);
    if (!definition) return false;

    let remaining = quantity;

    // Check existing stacks
    for (const stack of inventory) {
      if (stack.itemId === itemId && stack.quantity < stack.maxStack) {
        const canAdd = stack.maxStack - stack.quantity;
        remaining -= Math.min(remaining, canAdd);
        if (remaining <= 0) return true;
      }
    }

    // Check if we have enough slots for new stacks
    const usedSlots = inventory.length;
    const availableSlots = maxSlots - usedSlots;
    const stacksNeeded = Math.ceil(remaining / definition.maxStack);

    return stacksNeeded <= availableSlots;
  }

  /**
   * Compact inventory by merging partial stacks
   */
  static compact(inventory: ItemStack[]): ItemStack[] {
    const itemCounts: Record<string, number> = {};
    const compacted: ItemStack[] = [];

    // Sum up all quantities by item type
    for (const stack of inventory) {
      itemCounts[stack.itemId] = (itemCounts[stack.itemId] || 0) + stack.quantity;
    }

    // Rebuild inventory with optimal stacking
    for (const [itemId, totalCount] of Object.entries(itemCounts)) {
      const definition = getItem(itemId);
      if (!definition) continue;

      let remaining = totalCount;
      while (remaining > 0) {
        const stackSize = Math.min(remaining, definition.maxStack);
        compacted.push({
          itemId,
          quantity: stackSize,
          maxStack: definition.maxStack
        });
        remaining -= stackSize;
      }
    }

    return compacted;
  }

  /**
   * Transfer items between inventories
   */
  static transfer(
    fromInventory: ItemStack[],
    toInventory: ItemStack[],
    itemId: string,
    quantity: number,
    toMaxSlots: number
  ): InventoryOperationResult {
    // Check if source has enough items
    const available = this.getCount(fromInventory, itemId);
    const actualQuantity = Math.min(quantity, available);

    if (actualQuantity === 0) {
      return { success: false, processed: 0, overflow: quantity };
    }

    // Check if destination has space
    if (!this.hasSpace(toInventory, itemId, actualQuantity, toMaxSlots)) {
      return { success: false, processed: 0, overflow: quantity };
    }

    // Remove from source
    const removeResult = this.removeItem(fromInventory, itemId, actualQuantity);
    if (!removeResult.success) {
      return { success: false, processed: 0, overflow: quantity };
    }

    // Add to destination
    const addResult = this.addItem(toInventory, itemId, actualQuantity, toMaxSlots);
    if (!addResult.success) {
      // Rollback - add items back to source
      this.addItem(fromInventory, itemId, removeResult.processed, Infinity);
      return { success: false, processed: 0, overflow: quantity };
    }

    return {
      success: true,
      processed: addResult.processed,
      overflow: quantity - actualQuantity
    };
  }

  /**
   * Check if inventory contains specific items
   */
  static contains(inventory: ItemStack[], itemId: string, quantity: number): boolean {
    return this.getCount(inventory, itemId) >= quantity;
  }

  /**
   * Get all unique item types in inventory
   */
  static getUniqueItems(inventory: ItemStack[]): string[] {
    return [...new Set(inventory.map(stack => stack.itemId))];
  }

  /**
   * Calculate total used slots
   */
  static getUsedSlots(inventory: ItemStack[]): number {
    return inventory.length;
  }

  /**
   * Get inventory summary for display
   */
  static getSummary(inventory: ItemStack[]): Array<{itemId: string, quantity: number, stacks: number}> {
    const summary: Record<string, {quantity: number, stacks: number}> = {};

    for (const stack of inventory) {
      if (!summary[stack.itemId]) {
        summary[stack.itemId] = { quantity: 0, stacks: 0 };
      }
      summary[stack.itemId].quantity += stack.quantity;
      summary[stack.itemId].stacks += 1;
    }

    return Object.entries(summary).map(([itemId, data]) => ({
      itemId,
      quantity: data.quantity,
      stacks: data.stacks
    }));
  }

  /**
   * Clone inventory (deep copy)
   */
  static clone(inventory: ItemStack[]): ItemStack[] {
    return inventory.map(stack => ({ ...stack }));
  }

  /**
   * Check if inventory is empty
   */
  static isEmpty(inventory: ItemStack[]): boolean {
    return inventory.length === 0;
  }

  /**
   * Check if inventory is full
   */
  static isFull(inventory: ItemStack[], maxSlots: number): boolean {
    return inventory.length >= maxSlots;
  }

  /**
   * Clear all items from inventory
   */
  static clear(inventory: ItemStack[]): void {
    inventory.splice(0, inventory.length);
  }
}