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
  Null = 'Not specified',
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
    public degree: Degree = Degree.Null,
    public gpa: number,
    public status: StudentStatus = StudentStatus.Active
  ) {
    //validation of name and email on creation
    if (!name || name.trim() === '') {
      throw new Error('Student name cannot be empty');
    }
    if (!email.includes('@')) {
      throw new Error('Invalid email address format');
    }
    this.validateGpa(gpa);
  }

  // methods
  public updateStatus(newStatus: StudentStatus): void {
    this.status = newStatus;
  }

  public updateGpa(newGpa: number): void {
    this.validateGpa(newGpa);
    this.gpa = newGpa;
  }

  public validateGpa(gpa: number): void {
    if (gpa < 0.0 || gpa > 4.0) {
      throw new Error('Invalid GPA! Must be between 0.0 and 4.0');
    }
  }

  public getDetails(): string {
    return (
      '[' +
      this.id +
      '] ' +
      this.name +
      ' | Department: ' +
      this.degree +
      ' | GPA: ' +
      this.gpa +
      ' | Status: ' +
      this.status
    );
  }
}
