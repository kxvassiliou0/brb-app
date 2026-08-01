import { IsNotEmpty, Matches, MaxLength } from "class-validator";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User.entity.ts";

@Entity({ name: "job_role" })
export class JobRole {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @IsNotEmpty({ message: "Name is required" })
  @Matches(/\S/, { message: "Name cannot be empty or whitespace" })
  @MaxLength(30, { message: "Name must be 30 characters or less" })
  name!: string;

  @OneToMany(() => User, (user: User) => user.jobRole)
  users!: Array<User>;
}
