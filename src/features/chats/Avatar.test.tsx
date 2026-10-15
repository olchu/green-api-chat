import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('показывает инициалы без фото', () => {
    const { container } = render(<Avatar id="1" name="Анна Иванова" />)

    expect(container).toHaveTextContent('АИ')
    expect(container.querySelector('img')).toBeNull()
  })

  it('показывает фото и возвращается к инициалам, если оно не загрузилось', () => {
    const { container } = render(<Avatar id="1" name="Анна" src="https://example.com/a.jpg" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://example.com/a.jpg')

    fireEvent.error(img)

    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('А')
  })
})
