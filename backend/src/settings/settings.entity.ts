import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DEFAULT_SETTINGS } from '../types/settings';

@Entity()
export class SettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('json')
  settings: typeof DEFAULT_SETTINGS;
}
