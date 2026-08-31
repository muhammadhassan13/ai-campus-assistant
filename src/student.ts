// defining interfaces for Student data models

export enum StudentStatus {
  Active = 'ACTIVE',
  Graduated = 'GRADUATED',
  Suspended = 'SUSPENDED',
}

export enum Degree {
  ComputerScience = 'Computer Science',
  SoftwareEngineering = 'Software Engineering',
  DataScience = 'Data Science',
  ArtificialIntelligence = 'Artificial Intelligence',
}
export interface IStudent {
  id: number;
  name: string;
  email: string;
  degree: Degree;
  gpa: number;
  status: StudentStatus;
}

// creating Student class with constructor
export class Student implements IStudent {
  // constructor
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public degree: Degree,
    public gpa: number,
    public status: StudentStatus = StudentStatus.Active
  ) {}

  // methods
  public getDetails(): string {
    return (
      '[' +
      this.id +
      '] ' +
      this.name +
      '\n' +
      'Department: ' +
      this.degree +
      '\n' +
      'GPA: ' +
      this.gpa +
      '\n' +
      'Status: ' +
      this.status
    );
  }

  public updateStatus(newStatus: StudentStatus): void {
    this.status = newStatus;
  }

  public updateGpa(newGpa: number): void {
    if (newGpa < 0.0 || newGpa > 4.0) {
      throw new Error('GPA must be between 0.0 and 4.0');
    }
    this.gpa = newGpa;
  }
}
