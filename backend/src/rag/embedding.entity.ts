import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Embedding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column('simple-json')
  embeddings: number[];

  @Column('text')
  text: string;

  @Column()
  createdAt: Date;
}
