import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("canonical_products")
export class CanonicalProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  // Used for fuzzy matching (SPEC §5.5).
  @Index()
  @Column({ name: "normalized_name", length: 255 })
  normalizedName: string;

  // Exact-match key; nullable, unique when present.
  @Column({ type: "varchar", length: 64, nullable: true, unique: true })
  article: string | null;

  @Index()
  @Column({ length: 128 })
  category: string;

  @Column({ name: "base_unit", length: 32 })
  baseUnit: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
