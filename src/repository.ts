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
}
