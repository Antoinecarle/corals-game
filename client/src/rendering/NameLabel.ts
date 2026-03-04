import { Text, TextStyle } from 'pixi.js';

/**
 * Name label rendered above entities.
 */
export class NameLabel {
  private text: Text;

  constructor(name: string, color: number = 0xd4a853) {
    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 11,
      fontWeight: 'bold',
      fill: color,
      stroke: { color: 0x000000, width: 2 },
      align: 'center',
    });

    this.text = new Text({ text: name, style });
    this.text.anchor.set(0.5, 1);
    this.text.y = -18;
  }

  getText(): Text {
    return this.text;
  }

  setName(name: string): void {
    this.text.text = name;
  }
}
