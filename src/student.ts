// defining interfaces for Student data models
export interface IStudent {
  id: number;
  name: string;
  email: string;
  degree: string;
  gpa: number;
  status: 'Active' | 'Graduated' | 'Suspended';
}

// creating Student class with constructor
export class Student implements IStudent {
  // constructor
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public degree: string,
    public gpa: number,
    public status: 'Active' | 'Graduated' | 'Suspended' = 'Active'
  ) {}

  // methods
  public getDetails(): string {
    return `ID: ${this.id} | Name: ${this.name} | Degree: ${this.degree} | GPA: ${this.gpa.toFixed(2)} | Status: ${this.status}`;
  }

  public updateGpa(newGpa: number): void {
    if (newGpa < 0.0 || newGpa > 4.0) {
      throw new Error('GPA must be between 0.0 and 4.0');
    }
    this.gpa = newGpa;
  }
}
