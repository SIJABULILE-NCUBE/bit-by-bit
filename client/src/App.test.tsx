import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// my first tests: just making sure the landing page shows up properly
describe('Landing page', () => {
  it('shows the tagline', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /own it bit by bit/i })).toBeInTheDocument()
  })

  it('has a Get started button that goes to sign up', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup')
  })
})
