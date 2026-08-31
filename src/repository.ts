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
