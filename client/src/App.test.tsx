import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp } from './test/renderWithAuth'

// my first tests: just making sure the landing page shows up properly
describe('Landing page', () => {
  it('shows the tagline', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /own it bit by bit/i })).toBeInTheDocument()
  })

  it('has a Get started button that goes to sign up', () => {
    renderApp('/')
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup')
  })
})
