import { describe, expect, it } from 'vitest';
import { changeLook } from './kits';
import { maxLook } from './opponents/max';

describe('changeLook', () => {
  it('a white change kit keeps their shorts and trims in their colour', () => {
    const max = maxLook();
    const l = changeLook(max, 'white');
    expect([l.JerseyShadow, l.Jersey, l.JerseyLight]).toEqual(['silver', 'white', 'white']);
    expect([l.TrimShadow, l.Trim]).toEqual(['navy', 'blue']);
    expect([l.ShortsShadow, l.Shorts]).toEqual([max.ShortsShadow, max.Shorts]);
    expect([l.SocksShadow, l.Socks]).toEqual(['silver', 'white']);
    expect([l.Hair, l.Skin, l.Boot]).toEqual([max.Hair, max.Skin, max.Boot]);
  });

  it('a black change kit', () => {
    const l = changeLook(maxLook(), 'black');
    expect([l.JerseyShadow, l.Jersey, l.JerseyLight]).toEqual(['charcoal', 'slate', 'gray']);
    expect([l.SocksShadow, l.Socks]).toEqual(['charcoal', 'slate']);
    expect([l.TrimShadow, l.Trim]).toEqual(['navy', 'blue']);
  });
});
