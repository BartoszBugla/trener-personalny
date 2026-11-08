import { describe, expect, it } from 'vitest'

import { htmlToText } from './html-to-text'

describe('htmlToText', () => {
  it('keeps link text, line breaks and decodes entities', () => {
    expect(
      htmlToText(
        'Tytuł: <a href="https://example.com">Vaiana 2</a>.<br>Rząd 5 &amp; miejsce 7&nbsp;&#8211; ok',
      ),
    ).toBe('Tytuł: Vaiana 2.\nRząd 5 & miejsce 7 – ok')
  })

  it('leaves plain text untouched', () => {
    expect(htmlToText('Kolano – uważać na przysiady')).toBe(
      'Kolano – uważać na przysiady',
    )
  })
})
