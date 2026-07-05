import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("suppliers")
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 12, unique: true })
  inn: string;

  @Column({ name: "contact_person", type: "varchar", length: 255, nullable: true })
  contactPerson: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
