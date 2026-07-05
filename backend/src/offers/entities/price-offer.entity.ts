import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { MatchMethod, MatchStatus } from "../../common/enums";
import { CanonicalProduct } from "../../products/entities/canonical-product.entity";
import { ImportBatch } from "../../imports/entities/import-batch.entity";
import { RawRow } from "../../imports/entities/raw-row.entity";
import { Supplier } from "../../suppliers/entities/supplier.entity";
import { User } from "../../users/entities/user.entity";

/** One candidate suggested to the operator during manual review. */
export interface MatchCandidate {
  canonicalProductId: number;
  name: string;
  score: number;
}

@Entity("price_offers")
export class PriceOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => ImportBatch, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "batch_id" })
  batch: ImportBatch;

  @Column({ name: "batch_id" })
  batchId: number;

  @OneToOne(() => RawRow, { nullable: false })
  @JoinColumn({ name: "raw_row_id" })
  rawRow: RawRow;

  @Column({ name: "raw_row_id", unique: true })
  rawRowId: number;

  @Index()
  @ManyToOne(() => Supplier, { nullable: false })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @Column({ name: "supplier_id" })
  supplierId: number;

  @ManyToOne(() => CanonicalProduct, { nullable: true })
  @JoinColumn({ name: "canonical_product_id" })
  canonicalProduct: CanonicalProduct | null;

  @Column({ name: "canonical_product_id", type: "int", nullable: true })
  canonicalProductId: number | null;

  @Column({ name: "raw_name", length: 512 })
  rawName: string;

  @Column({ name: "normalized_name", length: 512 })
  normalizedName: string;

  @Column({ name: "raw_article", type: "varchar", length: 64, nullable: true })
  rawArticle: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  price: string;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: "normalized_unit", length: 32 })
  normalizedUnit: string;

  @Column({ type: "numeric", precision: 4, scale: 3, nullable: true })
  confidence: string | null;

  @Column({
    name: "match_method",
    type: "simple-enum",
    enum: MatchMethod,
    default: MatchMethod.None,
  })
  matchMethod: MatchMethod;

  @Column({ name: "match_status", type: "simple-enum", enum: MatchStatus })
  matchStatus: MatchStatus;

  // Top-N candidates for the review UI (SPEC §5.5).
  @Column({ name: "match_candidates", type: "simple-json", nullable: true })
  matchCandidates: MatchCandidate[] | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reviewed_by" })
  reviewedBy: User | null;

  @Column({ name: "reviewed_by", type: "int", nullable: true })
  reviewedById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
