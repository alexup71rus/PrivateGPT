import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MemoryEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  content: string;

  @Column('float')
  timestamp: number;
}
