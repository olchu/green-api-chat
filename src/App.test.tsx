import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('отображает заголовок', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'GREEN-API Chat' })).toBeInTheDocument()
  })
})
