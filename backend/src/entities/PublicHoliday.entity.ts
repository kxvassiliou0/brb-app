import { IsDate, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PublicHoliday {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "date", unique: true })
  @IsDate()
  date!: Date;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;
}
