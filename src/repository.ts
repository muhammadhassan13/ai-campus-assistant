export interface HasId {
  id: number;
}

export class Repository<T extends HasId> {
  private items: T[] = [];

  public add(item: T): void {
    this.items.push(item);
  }

  public getAll(): T[] {
    return this.items;
  }

  public deleteById(id: number): boolean {
    const initialLength = this.items.length;
    this.items = this.items.filter((item) => item.id != id);
    return this.items.length < initialLength;
  }

  public getById(id: number): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  public update(id: number, updatedItem: Partial<T>): T | undefined {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    this.items[index] = { ...this.items[index], ...updatedItem };
    return this.items[index];
  }

  // Simulated Async API call to fetch ID
  public async fetchById(id: number): Promise<T> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const found = this.items.find((item) => item.id === id);
        if (found) {
          resolve(found);
        } else {
          reject(new Error('Item with ID ' + id + ' not found'));
        }
      }, 2000);
    });
  }
}
