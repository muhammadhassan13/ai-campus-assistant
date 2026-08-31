import type { HasId } from './repository.js';

export interface ICourse extends HasId {
  id: number;
  title: string;
  code: string;
}

export class Course implements ICourse {
  constructor(
    public id: number,
    public title: string,
    public code: string
  ) {}
}
