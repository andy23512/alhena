export enum KeyLabelType {
  Text = 'text',
  Icon = 'icon',
}

export interface KeyLabel {
  type: KeyLabelType;
  value: string;
}
